"use client";

import React from "react";
import Link from "next/link";
import { useProposals, useTreasuryBalance, useTreasuryMetadata } from "../hooks/use-treasury";
import { useStellarWallet } from "../hooks/use-stellar-wallet";
import { Coins, Users, Vote, ShieldCheck, ChevronRight, ShieldX, HelpCircle, ArrowDownLeft } from "lucide-react";

export default function HomePage() {
  const address = useStellarWallet().address;
  const proposals = useProposals().data;
  const proposalsLoading = useProposals().isLoading;
  const balance = useTreasuryBalance().data;
  const balanceLoading = useTreasuryBalance().isLoading;
  const meta = useTreasuryMetadata().data;
  const metaLoading = useTreasuryMetadata().isLoading;

  const isMember = address && meta?.members?.includes(address);

  // Statistics calculation
  const totalProposalsCount = proposals?.length || 0;
  const activeProposals = proposals?.filter((p) => !p.executed && !p.rejected && Math.floor(Date.now() / 1000) < p.votingEnd) || [];
  const completedProposalsCount = proposals?.filter((p) => p.executed || p.rejected).length || 0;
  
  const statsList = [
    {
      label: "Treasury Holdings",
      value: balanceLoading ? "Loading..." : `${balance || "0.0000"} XLM`,
      desc: "Total assets under governance",
      icon: Coins,
      color: "text-violet-400 border-violet-500/20 bg-violet-500/5",
    },
    {
      label: "Registered Members",
      value: metaLoading ? "Loading..." : `${meta?.membersCount || 3} Members`,
      desc: "Whitelisted voting addresses",
      icon: Users,
      color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
    },
    {
      label: "Active Proposals",
      value: proposalsLoading ? "Loading..." : `${activeProposals.length} Active`,
      desc: `Out of ${totalProposalsCount} total proposals`,
      icon: Vote,
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      
      {/* Hero Welcome banner */}
      <div className="rounded-3xl glass-panel p-8 md:p-10 border border-white/5 relative overflow-hidden bg-[#0c1020]">
        
        <div className="max-w-2xl flex flex-col gap-4 relative z-10">
          <span className="text-xs text-violet-400 font-bold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full w-fit">
            Governance Dashboard
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-gray-100">
            Secure & Decentralized <br/>
            <span className="gradient-text">Community Treasury Management</span>
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Welcome to the treasury manager. Whitelisted members can vote on grant requests, propose fund allocations, deposit reserves, and track payments securely via Soroban smart contracts on the Stellar Testnet.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 mt-2">
            <Link
              href="/treasury"
              className="flex items-center gap-1.5 px-6 py-3 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all border border-violet-500/20 shadow-lg shadow-violet-950/20"
            >
              Explore proposals
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/deposit"
              className="flex items-center gap-1.5 px-6 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all border border-emerald-500/20 shadow-lg shadow-emerald-950/20"
            >
              Deposit reserves
              <ArrowDownLeft className="w-4 h-4" />
            </Link>
            <Link
              href="/wallet"
              className="px-6 py-3 rounded-xl text-xs font-bold text-gray-300 hover:text-gray-100 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              Wallet center
            </Link>
          </div>
        </div>
      </div>

      {/* Member Governance Check */}
      {address && (
        <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 glass-panel ${
          isMember 
            ? "border-emerald-500/20 bg-emerald-500/[0.02]" 
            : "border-amber-500/20 bg-amber-500/[0.02]"
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl border mt-0.5 ${
              isMember ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}>
              {isMember ? <ShieldCheck className="w-5 h-5" /> : <ShieldX className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-200">
                {isMember ? "Whitelisted voting member" : "Viewer access only"}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {isMember 
                  ? "Your Stellar wallet is registered in the treasury registry. You can create proposals and cast votes."
                  : "Your wallet is connected, but not whitelisted in the treasury smart contract. You can deposit funds, but voting or submitting proposals requires admin whitelisting."
                }
              </p>
            </div>
          </div>
          {!isMember && (
            <div className="text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20 shrink-0">
              Contract Admin: {meta?.admin ? `${meta.admin.substring(0, 4)}...${meta.admin.substring(meta.admin.length - 4)}` : "Loading..."}
            </div>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsList.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl glass-panel glow-hover p-6 border border-white/5 bg-[#0e1222]/30 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  {stat.label}
                </span>
                <div className={`p-2 rounded-lg border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-gray-100 tracking-tight">
                  {stat.value}
                </h3>
                <span className="text-xs text-gray-400 block mt-1">
                  {stat.desc}
                </span>
                {stat.label === "Treasury Holdings" && (
                  <Link
                    href="/deposit"
                    className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 w-fit transition-colors group"
                  >
                    Deposit reserves
                    <ArrowDownLeft className="w-3 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DApp How it works */}
      <div className="rounded-2xl glass-panel p-6 border border-white/5 bg-[#0e1222]/20 flex flex-col gap-4">
        <h3 className="font-bold text-base text-gray-200 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-violet-400" />
          Treasury Governance Rules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-400 leading-relaxed mt-1">
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <span className="font-semibold text-gray-300">1. Submitting Requests</span>
            <p>Whitelisted members submit funding proposals specifying recipients, XLM amounts, and justifications. This creates a pending contract proposal.</p>
          </div>
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <span className="font-semibold text-gray-300">2. Voting Period</span>
            <p>Proposals remain active for voting. Whitelisted members cast votes. The proposal must reach the target threshold (e.g. 2 approvals) before expiration.</p>
          </div>
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <span className="font-semibold text-gray-300">3. On-Chain Execution</span>
            <p>Once the approval threshold is met, any whitelisted member can invoke contract execution. The contract automatically pays the recipient directly.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
