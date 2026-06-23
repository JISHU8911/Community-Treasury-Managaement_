import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HORIZON_URL } from "../lib/stellar-client";
import { useTreasuryStore } from "../lib/store";
import { checkMemberStatus } from "../lib/soroban-client";

// Import Freighter API functions directly (works via browser extension messaging)
import {
  isConnected,
  requestAccess,
  getAddress,
} from "@stellar/freighter-api";

export const useStellarWallet = () => {
  const store = useTreasuryStore();
  const queryClient = useQueryClient();

  // ─── Fetch real or mock balance ──────────────────────────────────────────
  const queryBalanceAndPermissions = useCallback(async (address: string) => {
    const isMock =
      process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === "true" ||
      !process.env.NEXT_PUBLIC_CONTRACT_ID ||
      process.env.NEXT_PUBLIC_CONTRACT_ID === "CCDAO_TREASURY_MOCK_CONTRACT_ID";

    if (isMock) {
      let mockBal = localStorage.getItem(`mock_balance_${address}`);
      if (!mockBal) {
        try {
          const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
          if (res.status === 200) {
            const data = await res.json();
            const nativeBal = data.balances?.find(
              (b: any) => b.asset_type === "native"
            );
            mockBal = nativeBal
              ? parseFloat(nativeBal.balance).toFixed(4)
              : "1000.0000";
          } else {
            mockBal = "25000.0000";
          }
        } catch {
          mockBal = "25000.0000";
        }
        localStorage.setItem(`mock_balance_${address}`, mockBal);
      }
      useTreasuryStore.setState({ balance: parseFloat(mockBal).toFixed(4) });
      return;
    }

    try {
      const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
      if (res.status === 404) {
        useTreasuryStore.setState({
          balance: "0.00000 (Unfunded)",
          error:
            "Your account is not funded on Stellar Testnet. Please fund it via Friendbot.",
        });
        return;
      }
      const data = await res.json();
      const nativeBal = data.balances?.find(
        (b: any) => b.asset_type === "native"
      );
      const balanceStr = nativeBal
        ? parseFloat(nativeBal.balance).toFixed(4)
        : "0.0000";
      useTreasuryStore.setState({ balance: balanceStr });
    } catch (err) {
      console.error("Failed to query Horizon balance:", err);
    }
  }, []);

  // ─── Connect via @stellar/freighter-api directly ─────────────────────────
  const connect = useCallback(async () => {
    store.setConnecting(true);
    store.setError(null);

    try {
      // 1. Check if Freighter extension is installed
      console.log("Checking Freighter connection...");
      const connectionResult = await isConnected();
      console.log("isConnected result:", connectionResult);

      // isConnected returns { isConnected: boolean } or boolean depending on version
      const isFreighterInstalled =
        typeof connectionResult === "boolean"
          ? connectionResult
          : (connectionResult as any)?.isConnected === true;

      if (!isFreighterInstalled) {
        throw new Error(
          "Freighter extension not found. Please install it from https://www.freighter.app and refresh."
        );
      }

      // 2. Request user access (triggers Freighter popup)
      console.log("Requesting Freighter access...");
      const accessResult = await requestAccess();
      console.log("requestAccess result:", accessResult);

      // requestAccess returns an error string if denied, or empty string on success
      const accessError =
        typeof accessResult === "string"
          ? accessResult
          : (accessResult as any)?.error ?? "";

      if (accessError) {
        throw new Error(`Freighter access denied: ${accessError}`);
      }

      // 3. Get the public key / address
      console.log("Getting address from Freighter...");
      const addressResult = await getAddress();
      console.log("getAddress result:", addressResult);

      const address =
        typeof addressResult === "string"
          ? addressResult
          : (addressResult as any)?.address ?? "";

      if (!address) {
        throw new Error(
          "No address returned from Freighter. Make sure you are logged into the extension."
        );
      }

      console.log("Freighter connected successfully:", address);

      // 4. Store wallet state and sync data
      store.setWallet(address, "freighter");
      await checkMemberStatus(address);
      await queryBalanceAndPermissions(address);
      queryClient.invalidateQueries({ queryKey: ["treasuryMetadata"] });

      store.addToast({
        title: "Wallet Connected",
        description: `Freighter: ${address.slice(0, 6)}...${address.slice(-4)}`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Freighter connection failed:", err);
      store.setError(err?.message ?? "Failed to connect Freighter wallet.");
    } finally {
      store.setConnecting(false);
    }
  }, [store, queryClient, queryBalanceAndPermissions]);

  // ─── Demo / simulation mode connect ─────────────────────────────────────
  const connectMock = useCallback(() => {
    const mockAddr = "GAYD2A4BQCXQ3W2SPKNSHEJEXHOS2P7D6UOSZOH7N6E4NOHGOW3REDAO";
    store.setWallet(mockAddr, "mock-wallet");

    let mockBal = localStorage.getItem(`mock_balance_${mockAddr}`);
    if (!mockBal) {
      mockBal = "25000.0000";
      localStorage.setItem(`mock_balance_${mockAddr}`, mockBal);
    }
    store.setBalance(parseFloat(mockBal).toFixed(4));

    checkMemberStatus(mockAddr);

    store.addToast({
      title: "Simulation Connected",
      description: "Logged in as whitelisted community member GAYD2A...REDAO.",
      type: "success",
    });

    queryClient.invalidateQueries({ queryKey: ["treasuryMetadata"] });
  }, [store, queryClient]);

  // ─── Disconnect ──────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    store.clearWallet();
  }, [store]);

  return {
    address: store.address,
    walletId: store.walletId,
    balance: store.balance,
    network: store.network,
    isConnecting: store.isConnecting,
    error: store.error,
    connect,
    connectMock,
    disconnect,
    refreshBalance: () =>
      store.address && queryBalanceAndPermissions(store.address),
  };
};
