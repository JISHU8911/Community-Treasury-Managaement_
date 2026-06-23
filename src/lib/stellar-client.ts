import {
  StellarWalletsKit,
  WalletNetwork,
  FreighterModule,
  AlbedoModule,
  xBullModule,
  LobstrModule,
} from "@creit.tech/stellar-wallets-kit";

export const STELLAR_NETWORK = WalletNetwork.TESTNET;
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const getStellarKit = (): StellarWalletsKit => {
  if (typeof window === "undefined") {
    return {} as any;
  }
  return new StellarWalletsKit({
    network: STELLAR_NETWORK,
    modules: [
      new FreighterModule(),
      new AlbedoModule(),
      new xBullModule(),
      new LobstrModule(),
    ],
  });
};
