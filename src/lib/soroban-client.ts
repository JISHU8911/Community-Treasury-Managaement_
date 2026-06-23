import {
  Account,
  Address,
  Contract,
  Networks,
  rpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  Asset,
  Operation,
} from "@stellar/stellar-sdk";
import { getStellarKit, RPC_URL, NETWORK_PASSPHRASE } from "./stellar-client";
import { Proposal, TreasuryEvent } from "../types/treasury";
import { useTreasuryStore } from "./store";

// Configuration
export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "CCDAO_TREASURY_MOCK_CONTRACT_ID";
// A dummy address for read-only simulations
export const DEMO_ADDR = "GAYD2A4BQCXQ3W2SPKNSHEJEXHOS2P7D6UOSZOH7N6E4NOHGOW3REDAO";
export const MOCK_TOKEN_ID = "CAS3DOR2RQAXNSP22KX7VOGF2SPM6DAOXLM3DOR2RQAXNSP22KX7DAO";

const isMockMode = (): boolean => {
  if (typeof window === "undefined") return true;
  return (
    process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === "true" ||
    !process.env.NEXT_PUBLIC_CONTRACT_ID ||
    process.env.NEXT_PUBLIC_CONTRACT_ID === "CCDAO_TREASURY_MOCK_CONTRACT_ID"
  );
};

// --- Storage Keys for Mock Mode ---
const STORAGE_PROPOSALS = "community_treasury_proposals";
const STORAGE_MEMBERS = "community_treasury_members";
const STORAGE_EVENTS = "community_treasury_events";
const STORAGE_BALANCE = "community_treasury_balance";

// --- Mock Data Initializer ---
const initializeMockData = () => {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem(STORAGE_PROPOSALS)) {
    const defaultProposals: Proposal[] = [
      {
        id: 1,
        proposer: "GBXDAO32SPKNSHEJEXHOS2P7D6UOSZOH7N6E4NOHGOW3REST27JO",
        title: "Community Solar Irrigation Grid",
        description: "Funding for installing solar-powered irrigation pumps in the shared community farm allotments.",
        recipient: "GBVORGANICWATER7N6E4NOHGOW3REDAOEXHOS2P7D6UOSZOH7N6EPUM",
        amount: "500",
        token: "Native (XLM)",
        votesApprove: 3,
        votesReject: 0,
        threshold: 2,
        votingEnd: Math.floor(Date.now() / 1000) + 1296000, // +15 days
        executed: true,
        rejected: false,
      },
      {
        id: 2,
        proposer: "GBXDAO32SPKNSHEJEXHOS2P7D6UOSZOH7N6E4NOHGOW3REST27JO",
        title: "Winter Care Packaging Initiative",
        description: "Purchase of emergency winter supplies, thermal blankets, and shelf-stable food containers for the local center.",
        recipient: "GCSHELTERPACKS7N6E4NOHGOW3REDAOEXHOS2P7D6UOSZOH7N6ECARE",
        amount: "1200",
        token: "Native (XLM)",
        votesApprove: 1,
        votesReject: 1,
        threshold: 2,
        votingEnd: Math.floor(Date.now() / 1000) - 86400, // Expired yesterday
        executed: false,
        rejected: false,
      },
      {
        id: 3,
        proposer: "GAWLAMVZVZLBCSAIQYJULRAAJW3G5W4GPUJZF3QBKSXKEM4TRED27JOE",
        title: "Internet Access Hub for Schoolchildren",
        description: "Funding to buy 5 tablets and provide high-speed Wi-Fi router subscription for the community center homework hub.",
        recipient: "GBKIDSEDULINK7N6E4NOHGOW3REDAOEXHOS2P7D6UOSZOH7N6ELEARN",
        amount: "750",
        token: "Native (XLM)",
        votesApprove: 2,
        votesReject: 0,
        threshold: 2,
        votingEnd: Math.floor(Date.now() / 1000) + 604800, // +7 days
        executed: false,
        rejected: false,
      },
    ];
    localStorage.setItem(STORAGE_PROPOSALS, JSON.stringify(defaultProposals));
  }

  if (!localStorage.getItem(STORAGE_MEMBERS)) {
    const defaultMembers = [
      DEMO_ADDR,
      "GBXDAO32SPKNSHEJEXHOS2P7D6UOSZOH7N6E4NOHGOW3REST27JO",
      "GAWLAMVZVZLBCSAIQYJULRAAJW3G5W4GPUJZF3QBKSXKEM4TRED27JOE",
    ];
    localStorage.setItem(STORAGE_MEMBERS, JSON.stringify(defaultMembers));
  }

  if (!localStorage.getItem(STORAGE_EVENTS)) {
    const defaultEvents: TreasuryEvent[] = [
      {
        id: "ev_init",
        type: "member_added",
        timestamp: Date.now() - 259200000, // 3 days ago
        walletAddress: DEMO_ADDR,
        description: "Community Treasury initialized. Admin designated as active member.",
      },
      {
        id: "ev_m1",
        type: "member_added",
        timestamp: Date.now() - 172800000, // 2 days ago
        walletAddress: "GBXDAO32SPKNSHEJEXHOS2P7D6UOSZOH7N6E4NOHGOW3REST27JO",
        description: "New voting member successfully registered.",
      },
      {
        id: "ev_prop1",
        type: "proposal_created",
        timestamp: Date.now() - 86400000, // 1 day ago
        walletAddress: "GBXDAO32SPKNSHEJEXHOS2P7D6UOSZOH7N6E4NOHGOW3REST27JO",
        description: "Proposal #1 'Community Solar Irrigation Grid' submitted for review.",
      },
      {
        id: "ev_vote1",
        type: "vote_cast",
        timestamp: Date.now() - 79200000,
        walletAddress: DEMO_ADDR,
        description: "Voted APPROVE on Proposal #1 'Community Solar Irrigation Grid'.",
      },
      {
        id: "ev_exec1",
        type: "proposal_executed",
        timestamp: Date.now() - 72000000,
        walletAddress: DEMO_ADDR,
        description: "Proposal #1 'Community Solar Irrigation Grid' executed. 500 XLM transferred.",
      },
    ];
    localStorage.setItem(STORAGE_EVENTS, JSON.stringify(defaultEvents));
  }

  if (!localStorage.getItem(STORAGE_BALANCE)) {
    localStorage.setItem(STORAGE_BALANCE, "25000"); // 25,000 XLM holdings
  }
};

// Run mock data initialization
if (typeof window !== "undefined") {
  initializeMockData();
}

// --- Soroban Type Conversion Utilities ---
const toU32 = (val: number) => nativeToScVal(val, { type: "u32" });
const toU64 = (val: number | bigint) => nativeToScVal(BigInt(val), { type: "u64" });
const toI128 = (val: string | number) => nativeToScVal(BigInt(val), { type: "i128" });
const toBool = (val: boolean) => xdr.ScVal.scvBool(val);
const toAddress = (addr: string) => new Address(addr).toScVal();
const toStringVal = (str: string) => nativeToScVal(str, { type: "string" });

// RPC Server initialization
const server = new rpc.Server(RPC_URL);

// Helper to poll transaction status
const waitForTransaction = async (hash: string, attempts = 0): Promise<rpc.Api.GetTransactionResponse> => {
  const tx = await server.getTransaction(hash);
  if (tx.status === "SUCCESS") return tx;
  if (tx.status === "FAILED") throw new Error("Transaction failed on-chain.");
  if (attempts > 20) throw new Error("Transaction verification timed out.");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return waitForTransaction(hash, attempts + 1);
};

// --- Core Client API ---

export const getTreasuryBalance = async (): Promise<string> => {
  if (isMockMode()) {
    return localStorage.getItem(STORAGE_BALANCE) || "25000";
  }

  try {
    // Queries native token balance of the contract address
    const horizonRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${CONTRACT_ID}`);
    const data = await horizonRes.json();
    const nativeBalance = data.balances?.find((b: any) => b.asset_type === "native");
    return nativeBalance ? nativeBalance.balance : "0";
  } catch (err) {
    console.error("Failed to fetch contract balance on Horizon", err);
    return "0.00000";
  }
};

export const fetchTreasuryMetadata = async () => {
  if (isMockMode()) {
    return {
      admin: DEMO_ADDR,
      votingPeriod: 604800, // 7 days in seconds
      threshold: 2,
      membersCount: 3,
    };
  }

  try {
    const admin = await invokeRead("is_member", [toAddress(DEMO_ADDR)]) ? DEMO_ADDR : DEMO_ADDR;
    // In live network, read parameters from contract instance storage:
    // For simplicity, returns constants or simulates parameters
    return {
      admin,
      votingPeriod: 86400 * 3, // 3 days
      threshold: 2,
      membersCount: 4,
    };
  } catch {
    return {
      admin: DEMO_ADDR,
      votingPeriod: 259200,
      threshold: 2,
      membersCount: 3,
    };
  }
};

export const fetchMembersList = async (): Promise<string[]> => {
  if (isMockMode()) {
    const membersStr = localStorage.getItem(STORAGE_MEMBERS);
    const members: string[] = membersStr ? JSON.parse(membersStr) : [];
    
    // Auto-whitelist currently connected wallet address in simulation mode
    const connectedAddress = useTreasuryStore.getState().address;
    if (connectedAddress && !members.includes(connectedAddress)) {
      members.push(connectedAddress);
      localStorage.setItem(STORAGE_MEMBERS, JSON.stringify(members));
      // Update store immediately so state is synchronized
      setTimeout(() => {
        useTreasuryStore.getState().setMembers(members);
      }, 0);
    }
    return members;
  }
  // Simulates returning whitelisted addresses
  return [DEMO_ADDR];
};

export const fetchProposals = async (): Promise<Proposal[]> => {
  if (isMockMode()) {
    const props = localStorage.getItem(STORAGE_PROPOSALS);
    const parsed = props ? JSON.parse(props) : [];
    // Auto-update expired proposals in UI simulation
    const now = Math.floor(Date.now() / 1000);
    const updated = parsed.map((p: Proposal) => {
      if (!p.executed && !p.rejected && now > p.votingEnd) {
        if (p.votesApprove < p.threshold) {
          return { ...p, rejected: true };
        }
      }
      return p;
    });
    localStorage.setItem(STORAGE_PROPOSALS, JSON.stringify(updated));
    return updated;
  }

  try {
    const count = (await invokeRead("get_proposal_count", [])) as number;
    const list: Proposal[] = [];
    for (let i = 1; i <= count; i++) {
      const rawProp = await invokeRead("get_proposal", [toU32(i)]);
      if (rawProp) {
        list.push(formatProposal(rawProp));
      }
    }
    return list.reverse();
  } catch (err) {
    console.error("Error reading live proposals", err);
    return [];
  }
};

export const checkMemberStatus = async (address: string): Promise<boolean> => {
  if (isMockMode()) {
    if (!address) return false;
    const membersStr = localStorage.getItem(STORAGE_MEMBERS);
    const members: string[] = membersStr ? JSON.parse(membersStr) : [];
    if (!members.includes(address)) {
      members.push(address);
      localStorage.setItem(STORAGE_MEMBERS, JSON.stringify(members));
      // Update store immediately so state is synchronized
      setTimeout(() => {
        useTreasuryStore.getState().setMembers(members);
      }, 0);
    }
    return true;
  }
  try {
    return (await invokeRead("is_member", [toAddress(address)])) as boolean;
  } catch {
    return false;
  }
};

export const createProposal = async (
  proposer: string,
  title: string,
  description: string,
  recipient: string,
  amount: string,
  token: string
): Promise<string> => {
  const store = useTreasuryStore.getState();
  const txHash = generateDummyHash();
  
  // Track transaction initial state
  store.addTransaction({
    hash: txHash,
    title: `Submit Proposal: ${title}`,
    status: "pending",
    timestamp: Date.now(),
  });

  if (isMockMode()) {
    // Emulate validation wait
    await new Promise((r) => setTimeout(r, 2000));
    
    // Check if voter is whitelisted member
    const members: string[] = JSON.parse(localStorage.getItem(STORAGE_MEMBERS) || "[]");
    if (!members.includes(proposer)) {
      const errMsg = "Insufficient balance / Member not whitelisted in governance.";
      store.updateTransactionStatus(txHash, "failed", errMsg);
      throw new Error(errMsg);
    }

    const props: Proposal[] = JSON.parse(localStorage.getItem(STORAGE_PROPOSALS) || "[]");
    const nextId = props.length > 0 ? Math.max(...props.map((p) => p.id)) + 1 : 1;
    
    const newProposal: Proposal = {
      id: nextId,
      proposer,
      title,
      description,
      recipient,
      amount,
      token: token || "Native (XLM)",
      votesApprove: 0,
      votesReject: 0,
      threshold: 2,
      votingEnd: Math.floor(Date.now() / 1000) + 172800, // 48 Hours voting
      executed: false,
      rejected: false,
    };

    props.push(newProposal);
    localStorage.setItem(STORAGE_PROPOSALS, JSON.stringify(props));

    // Emit event log
    addMockEvent("proposal_created", proposer, `Proposal #${nextId} '${title}' submitted with fund request of ${amount} XLM.`);
    store.updateTransactionStatus(txHash, "success");
    return txHash;
  }

  try {
    const txResponse = await invokeWrite("create_proposal", [
      toAddress(proposer),
      toStringVal(title),
      toStringVal(description),
      toAddress(recipient),
      toI128(amount),
      toAddress(token || MOCK_TOKEN_ID),
    ]);

    store.updateTransactionStatus(txHash, "success");
    return txResponse.hash;
  } catch (err: any) {
    const errMsg = err?.message || "Failed to submit proposal transaction.";
    store.updateTransactionStatus(txHash, "failed", errMsg);
    throw err;
  }
};

export const castVote = async (
  voter: string,
  proposalId: number,
  approve: boolean
): Promise<string> => {
  const store = useTreasuryStore.getState();
  const txHash = generateDummyHash();

  store.addTransaction({
    hash: txHash,
    title: `${approve ? "Approve" : "Reject"} Proposal #${proposalId}`,
    status: "pending",
    timestamp: Date.now(),
  });

  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 2000));
    
    const members: string[] = JSON.parse(localStorage.getItem(STORAGE_MEMBERS) || "[]");
    if (!members.includes(voter)) {
      const errMsg = "Access denied: Signer is not a whitelisted treasury member.";
      store.updateTransactionStatus(txHash, "failed", errMsg);
      throw new Error(errMsg);
    }

    const props: Proposal[] = JSON.parse(localStorage.getItem(STORAGE_PROPOSALS) || "[]");
    const proposal = props.find((p) => p.id === proposalId);
    
    if (!proposal) {
      store.updateTransactionStatus(txHash, "failed", "Proposal not found");
      throw new Error("Proposal not found");
    }

    // Check if user already voted in mockup (simulated check via event stream)
    const votesKey = `voted_${proposalId}_${voter}`;
    if (localStorage.getItem(votesKey)) {
      store.updateTransactionStatus(txHash, "failed", "You have already voted on this proposal.");
      throw new Error("You have already voted on this proposal.");
    }
    
    localStorage.setItem(votesKey, "true");

    if (approve) {
      proposal.votesApprove += 1;
    } else {
      proposal.votesReject += 1;
    }

    localStorage.setItem(STORAGE_PROPOSALS, JSON.stringify(props));

    // Emit event
    addMockEvent(
      "vote_cast",
      voter,
      `Voted ${approve ? "APPROVE" : "REJECT"} on Proposal #${proposalId} '${proposal.title}'.`
    );

    store.updateTransactionStatus(txHash, "success");
    return txHash;
  }

  try {
    const txResponse = await invokeWrite("vote", [
      toAddress(voter),
      toU32(proposalId),
      toBool(approve),
    ]);
    store.updateTransactionStatus(txHash, "success");
    return txResponse.hash;
  } catch (err: any) {
    const errMsg = err?.message || "Failed to sign voting transaction.";
    store.updateTransactionStatus(txHash, "failed", errMsg);
    throw err;
  }
};

export const executeProposal = async (
  executor: string,
  proposalId: number
): Promise<string> => {
  const store = useTreasuryStore.getState();
  const txHash = generateDummyHash();

  store.addTransaction({
    hash: txHash,
    title: `Execute Funds: Proposal #${proposalId}`,
    status: "pending",
    timestamp: Date.now(),
  });

  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 2000));
    
    const props: Proposal[] = JSON.parse(localStorage.getItem(STORAGE_PROPOSALS) || "[]");
    const proposal = props.find((p) => p.id === proposalId);
    
    if (!proposal) {
      store.updateTransactionStatus(txHash, "failed", "Proposal not found");
      throw new Error("Proposal not found");
    }

    if (proposal.votesApprove < proposal.threshold) {
      store.updateTransactionStatus(txHash, "failed", "Required voting threshold not reached.");
      throw new Error("Required voting threshold not reached.");
    }

    // Emulate Insufficient contract balance
    const currentBalance = parseFloat(localStorage.getItem(STORAGE_BALANCE) || "0");
    const requestAmount = parseFloat(proposal.amount);
    if (currentBalance < requestAmount) {
      const errMsg = "Execution failed: Insufficient treasury contract asset reserves.";
      store.updateTransactionStatus(txHash, "failed", errMsg);
      throw new Error(errMsg);
    }

    proposal.executed = true;
    localStorage.setItem(STORAGE_PROPOSALS, JSON.stringify(props));

    // Update treasury simulated balance
    const remaining = currentBalance - requestAmount;
    localStorage.setItem(STORAGE_BALANCE, remaining.toString());

    // Emit event
    addMockEvent(
      "proposal_executed",
      executor,
      `Proposal #${proposalId} '${proposal.title}' executed. Transferred ${proposal.amount} XLM to recipient.`
    );

    store.updateTransactionStatus(txHash, "success");
    return txHash;
  }

  try {
    const txResponse = await invokeWrite("execute_proposal", [
      toAddress(executor),
      toU32(proposalId),
    ]);
    store.updateTransactionStatus(txHash, "success");
    return txResponse.hash;
  } catch (err: any) {
    const errMsg = err?.message || "Failed to execute treasury funds transfer.";
    store.updateTransactionStatus(txHash, "failed", errMsg);
    throw err;
  }
};

export const depositFunds = async (
  depositor: string,
  amount: string
): Promise<string> => {
  const store = useTreasuryStore.getState();
  const txHash = generateDummyHash();

  store.addTransaction({
    hash: txHash,
    title: `Deposit Reserves: ${amount} XLM`,
    status: "pending",
    timestamp: Date.now(),
  });

  // Wait 1.5 seconds
  await new Promise((r) => setTimeout(r, 1500));

  if (isMockMode()) {
    // Insufficient balance simulation on user wallet
    const depositNum = parseFloat(amount);
    const userBalance = isNaN(parseFloat(store.balance)) ? 0 : parseFloat(store.balance);
    if (userBalance > 0 && userBalance < depositNum) {
      const errMsg = "Transaction failed: Insufficient wallet balance for deposit operation.";
      store.updateTransactionStatus(txHash, "failed", errMsg);
      throw new Error(errMsg);
    }

    const currentBalance = parseFloat(localStorage.getItem(STORAGE_BALANCE) || "0");
    localStorage.setItem(STORAGE_BALANCE, (currentBalance + depositNum).toString());

    // Deduct user wallet balance on mock deposit
    const newWalletBalance = (userBalance - depositNum).toFixed(4);
    store.setBalance(newWalletBalance);
    if (depositor) {
      localStorage.setItem(`mock_balance_${depositor}`, newWalletBalance);
    }

    addMockEvent(
      "deposit_received",
      depositor,
      `Deposited ${amount} XLM to the Community Treasury reserves.`
    );
    store.updateTransactionStatus(txHash, "success");
    return txHash;
  }

  // Live native token deposit is done by sending standard payment operation to the contract address
  try {
    const kit = getStellarKit();
    const account = await server.getAccount(depositor);
    
    let tx = new TransactionBuilder(account, {
      fee: "1000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: CONTRACT_ID,
          asset: Asset.native(),
          amount: amount,
        })
      )
      .setTimeout(30)
      .build();

    tx = await server.prepareTransaction(tx);
    const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), {
      address: depositor,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE));
    if (sent.status === "ERROR") {
      throw new Error(sent.errorResult ? sent.errorResult.toXDR("base64") : "Deposit rejected by network.");
    }
    
    await waitForTransaction(sent.hash);
    store.updateTransactionStatus(txHash, "success");
    
    return sent.hash;
  } catch (err: any) {
    const errMsg = err?.message || "Failed to process deposit transaction.";
    store.updateTransactionStatus(txHash, "failed", errMsg);
    throw err;
  }
};

export const fetchEventsList = async (): Promise<TreasuryEvent[]> => {
  if (isMockMode()) {
    const events = localStorage.getItem(STORAGE_EVENTS);
    return events ? JSON.parse(events) : [];
  }
  // Live network pulls events from RPC server
  try {
    const eventsResponse = await server.getEvents({
      startLedger: 0,
      filters: [
        {
          type: "contract",
          contractIds: [CONTRACT_ID],
        },
      ],
      limit: 20,
    });
    return eventsResponse.events.map((e, idx) => {
      const topics = (e.topic || []).map((t) => {
        try {
          const val = scValToNative(t);
          if (val instanceof Buffer || val instanceof Uint8Array) {
            return Buffer.from(val).toString();
          }
          return typeof val === "string" ? val : val?.toString() || "";
        } catch {
          return "";
        }
      });
      return {
        id: e.id || `ev_${idx}`,
        type: parseEventType(topics),
        timestamp: Date.now() - (idx * 60000), // mock timestamp for events as RPC getEvents has ledger sequence
        walletAddress: DEMO_ADDR,
        description: `Contract event: ${e.value ? e.value.toString() : ""}`,
      };
    });
  } catch {
    return [];
  }
};

// --- Low level Soroban Read/Write helpers ---

const invokeRead = async (method: string, args: any[] = []): Promise<any> => {
  const tx = new TransactionBuilder(new Account(DEMO_ADDR, "0"), {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(CONTRACT_ID).call(method, ...args))
    .setTimeout(0)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
    return scValToNative(sim.result.retval);
  }
  throw new Error((sim as any).error || `Read simulation failed on method ${method}`);
};

const invokeWrite = async (method: string, args: any[] = []): Promise<any> => {
  const kit = getStellarKit();
  const addressResult = await kit.getAddress();
  const publicKey = addressResult.address;

  const account = await server.getAccount(publicKey);
  let tx = new TransactionBuilder(account, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(CONTRACT_ID).call(method, ...args))
    .setTimeout(30)
    .build();

  tx = await server.prepareTransaction(tx);
  const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), {
    address: publicKey,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE));
  if (sent.status === "ERROR") {
    throw new Error(sent.errorResult ? sent.errorResult.toXDR("base64") : "Transaction rejected by network");
  }

  return waitForTransaction(sent.hash);
};

// --- Utility Helpers ---

const formatProposal = (raw: any): Proposal => {
  return {
    id: raw.id,
    proposer: raw.proposer,
    title: raw.title,
    description: raw.description,
    recipient: raw.recipient,
    amount: raw.amount.toString(),
    token: raw.token,
    votesApprove: raw.votes_approve,
    votesReject: raw.votes_reject,
    threshold: raw.threshold,
    votingEnd: Number(raw.voting_end),
    executed: raw.executed,
    rejected: raw.rejected,
  };
};

const parseEventType = (topics: string[]): any => {
  if (topics.includes("prop") && topics.includes("created")) return "proposal_created";
  if (topics.includes("vote") && topics.includes("cast")) return "vote_cast";
  if (topics.includes("prop") && topics.includes("executed")) return "proposal_executed";
  if (topics.includes("prop") && topics.includes("rejected")) return "proposal_rejected";
  if (topics.includes("member") && topics.includes("added")) return "member_added";
  if (topics.includes("member") && topics.includes("removed")) return "member_removed";
  return "deposit_received";
};

const generateDummyHash = (): string => {
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
};

const addMockEvent = (
  type: TreasuryEvent["type"],
  walletAddress: string,
  description: string
) => {
  const events: TreasuryEvent[] = JSON.parse(localStorage.getItem(STORAGE_EVENTS) || "[]");
  const newEv: TreasuryEvent = {
    id: `ev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    timestamp: Date.now(),
    walletAddress,
    description,
  };
  events.unshift(newEv);
  localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
  useTreasuryStore.getState().addEvent(newEv);
};
