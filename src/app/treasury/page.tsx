"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useProposals, useTreasuryBalance, useTreasuryMetadata } from "../../hooks/use-treasury";
import { useStellarWallet } from "../../hooks/use-stellar-wallet";
import { useTreasuryStore } from "../../lib/store";
import ProposalCard from "../../components/ProposalCard";
import { Plus, Coins, ShieldAlert, Layers, ArrowDownLeft, ExternalLink, HelpCircle, RefreshCw } from "lucide-react";

export default function TreasuryPage() {
  const { address } = useStellarWallet();
  const addToast = useTreasuryStore((state) => state.addToast);
  
  // Queries
  const { data: proposals, isLoading: proposalsLoading, refetch: refetchProposals } = useProposals();
  const { data: balance, isLoading: balanceLoading } = useTreasuryBalance();
  const { data: meta, isLoading: metaLoading } = useTreasuryMetadata();

  // Component States
  const [filter, setFilter] = useState<"all" | "active" | "executed" | "rejected">("all");

  const isMember = address && meta?.members?.includes(address);
  const isMock = process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === "true" || !process.env.NEXT_PUBLIC_CONTRACT_ID || process.env.NEXT_PUBLIC_CONTRACT_ID === "CCDAO_TREASURY_MOCK_CONTRACT_ID";

  // Filter proposals
  const now = Math.floor(Date.now() / 1000);
  const filteredProposals = proposals?.filter((p) => {
    const isExpired = now > p.votingEnd;
    if (filter === "active") return !p.executed && !p.rejected && !isExpired;
    if (filter === "executed") return p.executed;
    if (filter === "rejected") return p.rejected || (isExpired && p.votesApprove < p.threshold);
    return true;
  }) || [];

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-100">
            Treasury Center
          </h1>
          <p className="text-xs text-gray-400">
            Submit grant applications, cast votes on active funding proposals, and monitor contract assets.
          </p>
        </div>
        <Link
          href="/treasury/create"
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 border border-violet-500/20 shadow-lg shadow-violet-950/20 w-fit shrink-0 transition-all active:scale-95 cursor-pointer animate-fade-in"
        >
          <Plus className="w-4 h-4" />
          Create Proposal
        </Link>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Proposals List (Col span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          
          {/* Filters Bar */}
          <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-1">
              {(["all", "active", "executed", "rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                    filter === tab
                      ? "bg-violet-600/10 text-violet-300 border border-violet-500/10"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                refetchProposals();
                addToast({ title: "Refreshing", description: "Querying latest proposal states.", type: "info" });
              }}
              className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Proposals Render */}
          {proposalsLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 w-full rounded-2xl border border-white/5 bg-[#0e1222]/30 animate-shimmer" />
              ))}
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center glass-panel rounded-2xl border border-white/5 bg-[#0e1222]/10 gap-3">
              <Layers className="w-12 h-12 text-gray-700" />
              <div>
                <h4 className="font-bold text-sm text-gray-200">No Proposals Found</h4>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed mt-1">
                  There are no proposals under the selected filter category at the moment.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredProposals.map((prop) => (
                <ProposalCard key={prop.id} proposal={prop} />
              ))}
            </div>
          )}
        </div>

        {/* Treasury Stats & Deposits Panel (Col span 1) */}
        <div className="flex flex-col gap-6">
          
          {/* Metadata info card */}
          <div className="rounded-2xl glass-panel p-6 border border-white/5 bg-[#0e1222]/30 flex flex-col gap-4">
            <h3 className="font-bold text-sm text-gray-200 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-violet-400" />
              Treasury Contract Info
            </h3>
            
            <div className="flex flex-col gap-3.5 pt-1 text-xs">
              
              {/* Contract Balance */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-gray-400">Total Reserves</span>
                <span className="font-extrabold text-gray-200">
                  {balanceLoading ? "Loading..." : `${balance || "0.00"} XLM`}
                </span>
              </div>

              {/* Threshold */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-gray-400">Voting Threshold</span>
                <span className="font-bold text-violet-400">
                  {metaLoading ? "..." : `${meta?.threshold || 2} Approvals`}
                </span>
              </div>

              {/* Voting Period */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-gray-400">Voting Period</span>
                <span className="font-medium text-gray-200">
                  {metaLoading ? "..." : "48 Hours"}
                </span>
              </div>

              {/* Contract ID */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                  Contract Address
                </span>
                <a
                  href={isMock ? "#" : `https://stellar.expert/explorer/testnet/contract/${process.env.NEXT_PUBLIC_CONTRACT_ID}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] text-gray-400 hover:text-gray-200 truncate flex items-center gap-1 bg-black/40 p-2 rounded-lg border border-white/5"
                >
                  <span className="truncate flex-1">{process.env.NEXT_PUBLIC_CONTRACT_ID || "CCDAO_TREASURY_MOCK_CONTRACT_ID"}</span>
                  <ExternalLink className="w-3 h-3 text-gray-600 shrink-0" />
                </a>
              </div>
            </div>
          </div>

          {/* Deposit Info CTA Panel */}
          <div className="rounded-2xl glass-panel p-6 border border-white/5 bg-[#0e1222]/30 flex flex-col gap-4 relative overflow-hidden">
            <h3 className="font-bold text-sm text-gray-200 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              Deposit Treasury Reserves
            </h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Anyone can fund the community treasury. Transfer native Stellar XLM tokens from your connected wallet directly into the contract reserve pool.
            </p>

            <Link
              href="/deposit"
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 shadow-lg shadow-emerald-950/20 transition-all text-center cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Deposit Funds
            </Link>
          </div>

          {/* Whitelist Alert */}
          {address && !isMember && (
            <div className="p-4 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] text-amber-300 text-xs flex gap-2.5 leading-relaxed">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
              <div>
                <h5 className="font-semibold mb-0.5">Read-Only Session</h5>
                <p className="text-gray-400">
                  Your address is connected but not registered in the treasury smart contract. Deposits are open, but submitting proposals or voting requires an administrator to whitelist your public key.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
