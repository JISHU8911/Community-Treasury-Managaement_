import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  Account,
  Address,
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  Operation,
  StrKey,
  nativeToScVal,
} from "@stellar/stellar-sdk";

// Network Configurations
const RPC_URL = process.env.PUBLIC_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const server = new rpc.Server(RPC_URL);

async function deploy() {
  const secretKey = process.env.STELLAR_SECRET_KEY;
  if (!secretKey) {
    console.error("Error: STELLAR_SECRET_KEY is missing in your .env file.");
    process.exit(1);
  }

  const keypair = Keypair.fromSecret(secretKey);
  const publicKey = keypair.publicKey();
  console.log(`Deploying from account: ${publicKey}`);

  // Check account balance and fund if needed
  try {
    const acc = await server.getAccount(publicKey);
    console.log("Deployer account verified.");
  } catch (err) {
    console.log("Account not funded yet. Requesting testnet Friendbot funding...");
    const friendbotRes = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
    if (friendbotRes.ok) {
      console.log("Friendbot funded successfully!");
      // wait for indexing
      await new Promise((r) => setTimeout(r, 4000));
    } else {
      console.error("Failed to fund account via Friendbot. Please fund manually.");
      process.exit(1);
    }
  }

  // Load WASM file
  const wasmPath = join(
    process.cwd(),
    "contracts",
    "target",
    "wasm32-unknown-unknown",
    "release",
    "treasury.wasm"
  );
  
  let wasmBytes;
  try {
    wasmBytes = readFileSync(wasmPath);
  } catch (err) {
    console.error(`Error: Could not read WASM bytecode at ${wasmPath}. Please compile the contract first.`);
    process.exit(1);
  }

  console.log(`WASM loaded successfully (${wasmBytes.length} bytes). Uploading to Testnet...`);

  const account = await server.getAccount(publicKey);

  // 1. Upload WASM (Operation.invokeHostFunction for upload)
  let uploadTx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeHostFunction({
        func: rpc.xdr.HostFunction.hostFunctionTypeUploadWasm(wasmBytes),
        auth: [],
      })
    )
    .setTimeout(30)
    .build();

  // Prepare and sign
  uploadTx = await server.prepareTransaction(uploadTx);
  uploadTx.sign(keypair);
  
  const uploadSent = await server.sendTransaction(uploadTx);
  if (uploadSent.status === "ERROR") {
    console.error("Failed to upload WASM:", uploadSent.errorResultXdr);
    process.exit(1);
  }

  console.log(`Transaction sent. Hash: ${uploadSent.hash}. Awaiting confirmation...`);
  const uploadConfirmed = await waitForTx(uploadSent.hash);
  
  // Extract WASM Hash
  const wasmHashHex = uploadConfirmed.resultMetaXdr
    .v3()
    .sorobanMeta()
    .returnValue()
    .bytes()
    .toString("hex");
  const wasmHash = Buffer.from(wasmHashHex, "hex");
  console.log(`WASM uploaded successfully. Wasm Hash: ${wasmHashHex}`);

  // 2. Instantiate Contract
  console.log("Instantiating contract...");
  const accountRefreshed = await server.getAccount(publicKey);
  const salt = crypto.getRandomValues(new Uint8Array(32));

  let instantiateTx = new TransactionBuilder(accountRefreshed, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeHostFunction({
        func: rpc.xdr.HostFunction.hostFunctionTypeCreateContract(
          new rpc.xdr.CreateContractArgs({
            contractIdPreimage: rpc.xdr.ContractIdPreimage.contractIdPreimageFromAddress(
              new rpc.xdr.ContractIdPreimageFromAddress({
                address: Address.fromString(publicKey).toScVal(),
                salt: salt,
              })
            ),
            executable: rpc.xdr.ContractExecutable.contractExecutableWasm(wasmHash),
          })
        ),
        auth: [],
      })
    )
    .setTimeout(30)
    .build();

  instantiateTx = await server.prepareTransaction(instantiateTx);
  instantiateTx.sign(keypair);

  const instantiateSent = await server.sendTransaction(instantiateTx);
  console.log(`Instantiation sent. Hash: ${instantiateSent.hash}. Awaiting confirmation...`);
  const instantiateConfirmed = await waitForTx(instantiateSent.hash);

  const contractIdBuffer = instantiateConfirmed.resultMetaXdr
    .v3()
    .sorobanMeta()
    .returnValue()
    .address()
    .contractId();
  const contractId = StrKey.encodeContract(contractIdBuffer);
  console.log(`\n🎉 Success! Contract deployed successfully.`);
  console.log(`Contract ID: ${contractId}\n`);

  // 3. Initialize Contract
  console.log("Initializing Treasury Contract parameters (Admin, Voting Period: 1 Day, Threshold: 2)...");
  const accountFinal = await server.getAccount(publicKey);
  
  const votingPeriodSeconds = 86400; // 1 Day
  const threshold = 2;

  let initTx = new TransactionBuilder(accountFinal, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      new Contract(contractId).call(
        "initialize",
        Address.fromString(publicKey).toScVal(),
        nativeToScVal(BigInt(votingPeriodSeconds), { type: "u64" }),
        nativeToScVal(threshold, { type: "u32" })
      )
    )
    .setTimeout(30)
    .build();

  initTx = await server.prepareTransaction(initTx);
  initTx.sign(keypair);
  
  const initSent = await server.sendTransaction(initTx);
  await waitForTx(initSent.hash);
  console.log("Treasury initialized successfully.");

  // 4. Update configuration file
  updateEnvFile(contractId);
}

const waitForTx = async (hash, attempts = 0) => {
  const tx = await server.getTransaction(hash);
  if (tx.status === "SUCCESS") return tx;
  if (tx.status === "FAILED") throw new Error("Transaction execution failed.");
  if (attempts > 30) throw new Error("Timed out waiting for transaction indexing.");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return waitForTx(hash, attempts + 1);
};

function updateEnvFile(contractId) {
  const envPath = join(process.cwd(), ".env.local");
  let content = "";
  try {
    content = readFileSync(envPath, "utf-8");
  } catch {
    // env.local doesn't exist
  }

  const newLines = [];
  let found = false;
  
  content.split("\n").forEach((line) => {
    if (line.startsWith("NEXT_PUBLIC_CONTRACT_ID=")) {
      newLines.push(`NEXT_PUBLIC_CONTRACT_ID="${contractId}"`);
      found = true;
    } else {
      if (line.trim()) newLines.push(line);
    }
  });

  if (!found) {
    newLines.push(`NEXT_PUBLIC_CONTRACT_ID="${contractId}"`);
  }

  writeFileSync(envPath, newLines.join("\n") + "\n");
  console.log("Updated .env.local with deployed NEXT_PUBLIC_CONTRACT_ID.");
}

deploy().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
