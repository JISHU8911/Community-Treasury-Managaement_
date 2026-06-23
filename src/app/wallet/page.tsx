"use client";

import React, { useState } from "react";
import { useStellarWallet } from "../../hooks/use-stellar-wallet";
import { useTreasuryStore } from "../../lib/store";
import { Wallet, Check, Copy, ExternalLink, HelpCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function WalletPage() {
  const { address, balance, network, connect, connectMock, disconnect, isConnecting, error, refreshBalance } = useStellarWallet();
  const isMock = process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === "true" || !process.env.NEXT_PUBLIC_CONTRACT_ID || process.env.NEXT_PUBLIC_CONTRACT_ID === "CCDAO_TREASURY_MOCK_CONTRACT_ID";
  const addToast = useTreasuryStore((state) => state.addToast);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    addToast({
      title: "Address Copied",
      description: "Wallet public key copied to clipboard.",
      type: "success",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    addToast({
      title: "Balance Updated",
      description: "Polled Horizon for latest account details.",
      type: "info",
    });
    setRefreshing(false);
  };

  const getFriendbotUrl = () => {
    return `https://friendbot.stellar.org?addr=${address}`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full animate-fade-in">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-100">
          Wallet Center
        </h1>
        <p className="text-xs text-gray-400">
          Manage your Stellar account connections, query Horizon node balances, and verify credentials.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h5 className="font-semibold mb-0.5">Connection Error</h5>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="rounded-2xl glass-panel p-6 border border-white/5 bg-[#0e1222]/30 flex flex-col gap-6">
        
        {/* Connection Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              address ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400"
            }`}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-200">
                {address ? "Account Connected" : "No Wallet Connected"}
              </h3>
              <span className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase">
                {address ? "Ready for interactions" : "Authentication required"}
              </span>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase ${
            address ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-gray-500 bg-white/5 border-white/10"
          }`}>
            {address ? "Active" : "Offline"}
          </span>
        </div>

        {address ? (
          <div className="flex flex-col gap-5 pt-2">
            
            {/* Wallet Address panel */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Public Address
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-gray-300">
                <span className="flex-1 truncate select-all">{address}</span>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Balances details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">
                  Account Balance
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-extrabold text-gray-200">{balance}</span>
                  <span className="text-xs text-gray-400 font-bold">XLM</span>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors shrink-0 ml-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">
                  Active Network
                </span>
                <span className="text-sm font-bold text-violet-400 mt-1.5 block capitalize">
                  {network.replace("-", " ")}
                </span>
              </div>
            </div>

            {/* Wallet actions buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/5">
              <a
                href={`https://stellar.expert/explorer/testnet/account/${address}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                View on StellarExpert
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={disconnect}
                className="ml-auto px-5 py-2.5 rounded-xl text-xs font-bold text-gray-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>

          </div>
        ) : (
          <div className="flex flex-col gap-4 text-center py-6">
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
              Please connect your Stellar wallet via Freighter, Albedo, xBull, or Lobstr using the connection modal.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-2">
              <button
                onClick={connect}
                disabled={isConnecting}
                className="px-6 py-3 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 border border-violet-500/30 rounded-xl transition-all shadow-md shadow-violet-950/20 shrink-0"
              >
                {isConnecting ? "Awaiting Selection..." : "Connect Wallet"}
              </button>
              {isMock && (
                <button
                  onClick={connectMock}
                  className="px-6 py-3 text-xs font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-400/20 hover:bg-cyan-400/5 rounded-xl transition-colors shrink-0"
                >
                  Use Simulation Account
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Friendbot Funding Helper (Only visible if connected) */}
      {address && (
        <div className="rounded-2xl glass-panel p-5 border border-white/5 bg-[#0e1222]/10 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mt-0.5">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-gray-200">Need Testnet Funds?</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                Stellar Testnet transactions require native XLM tokens to cover network fees. If your balance is zero or low, use Friendbot to instantly fund your connected address with 10,000 testnet XLM.
              </p>
            </div>
          </div>
          <a
            href={getFriendbotUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-400/20 hover:bg-cyan-400/5 transition-all w-fit mt-1 self-end"
          >
            Fund Wallet via Friendbot
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

    </div>
  );
}
