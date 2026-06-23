"use client";

import React, { useState } from "react";
import { Proposal } from "../types/treasury";
import { useVoteProposal, useExecuteProposal } from "../hooks/use-treasury";
import { useStellarWallet } from "../hooks/use-stellar-wallet";
import { useTreasuryStore } from "../lib/store";
import { Vote, Calendar, Award, CheckCircle2, XCircle, ArrowUpRight, Loader } from "lucide-react";

export default function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { address } = useStellarWallet();
  const addToast = useTreasuryStore((state) => state.addToast);
  
  const voteMutation = useVoteProposal();
  const executeMutation = useExecuteProposal();

  const [votingApprove, setVotingApprove] = useState(false);
  const [votingReject, setVotingReject] = useState(false);
  const [executing, setExecuting] = useState(false);

  const now = Math.floor(Date.now() / 1000);
  const isExpired = now > proposal.votingEnd;
  const totalVotes = proposal.votesApprove + proposal.votesReject;
  
  const approvePercentage = totalVotes > 0 ? (proposal.votesApprove / totalVotes) * 100 : 0;
  const rejectPercentage = totalVotes > 0 ? (proposal.votesReject / totalVotes) * 100 : 0;

  const truncate = (addr: string) => `${addr.substring(0, 5)}...${addr.substring(addr.length - 4)}`;

  const handleVote = async (approve: boolean) => {
    if (!address) {
      addToast({
        title: "Connection Required",
        description: "Please connect your Stellar wallet to cast a vote.",
        type: "error",
      });
      return;
    }

    if (approve) setVotingApprove(true);
    else setVotingReject(true);

    try {
      await voteMutation.mutateAsync({
        voter: address,
        proposalId: proposal.id,
        approve,
      });

      addToast({
        title: "Vote Cast Successfully",
        description: `Successfully voted ${approve ? "APPROVE" : "REJECT"} on Proposal #${proposal.id}.`,
        type: "success",
      });
    } catch (err: any) {
      addToast({
        title: "Voting Failed",
        description: err?.message || "Failed to submit vote. Make sure you are a whitelisted member.",
        type: "error",
      });
    } finally {
      setVotingApprove(false);
      setVotingReject(false);
    }
  };

  const handleExecute = async () => {
    if (!address) return;
    setExecuting(true);

    try {
      await executeMutation.mutateAsync({
        executor: address,
        proposalId: proposal.id,
      });

      addToast({
        title: "Proposal Executed",
        description: `Proposal #${proposal.id} executed successfully. Funds transferred!`,
        type: "success",
      });
    } catch (err: any) {
      addToast({
        title: "Execution Failed",
        description: err?.message || "Failed to execute. Insufficient contract reserves or not whitelisted.",
        type: "error",
      });
    } finally {
      setExecuting(false);
    }
  };

  // Status computation
  let statusBadge = null;
  if (proposal.executed) {
    statusBadge = (
      <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
        <CheckCircle2 className="w-3.5 h-3.5" /> Executed
      </span>
    );
  } else if (proposal.rejected || (isExpired && proposal.votesApprove < proposal.threshold)) {
    statusBadge = (
      <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full">
        <XCircle className="w-3.5 h-3.5" /> Rejected
      </span>
    );
  } else if (proposal.votesApprove >= proposal.threshold) {
    statusBadge = (
      <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
        <Award className="w-3.5 h-3.5" /> Approved
      </span>
    );
  } else {
    statusBadge = (
      <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
        <Vote className="w-3.5 h-3.5 animate-pulse" /> Active
      </span>
    );
  }

  const timeLeft = proposal.votingEnd - now;
  const daysLeft = Math.ceil(timeLeft / 86400);

  return (
    <div className="rounded-2xl glass-panel glow-hover p-6 flex flex-col gap-5 border border-white/5 bg-[#0e1222]/50">
      
      {/* Header Info */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs text-violet-400 font-bold tracking-wider uppercase">
            Proposal #{proposal.id}
          </span>
          <h3 className="text-base font-bold text-gray-100 mt-1 leading-snug">
            {proposal.title}
          </h3>
        </div>
        {statusBadge}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
        {proposal.description}
      </p>

      {/* Addresses and request details */}
      <div className="grid grid-cols-2 gap-4 py-3 border-y border-white/5">
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Recipient</span>
          <span className="text-xs font-mono text-gray-300 font-medium flex items-center gap-0.5 mt-0.5">
            {truncate(proposal.recipient)}
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-600" />
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Funds requested</span>
          <span className="text-xs font-bold text-violet-400 mt-0.5 block">
            {proposal.amount} XLM
          </span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[11px] text-gray-400">
          <span>Approvals: {proposal.votesApprove} of {proposal.threshold} required</span>
          <span>Rejections: {proposal.votesReject}</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full rounded-l transition-all duration-500"
            style={{ width: `${proposal.votesApprove > 0 ? (proposal.votesApprove / Math.max(proposal.threshold, totalVotes)) * 100 : 0}%` }}
          />
          <div
            className="bg-red-500 h-full transition-all duration-500"
            style={{ width: `${proposal.votesReject > 0 ? (proposal.votesReject / Math.max(proposal.threshold, totalVotes)) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Card Controls */}
      <div className="flex items-center justify-between gap-4 mt-2">
        
        {/* Voting expiration calendar */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-4 h-4 text-gray-600" />
          <span>
            {proposal.executed
              ? "Voting Closed"
              : isExpired
              ? "Expired"
              : `${daysLeft}d remaining`}
          </span>
        </div>

        {/* Action button panel */}
        <div className="flex items-center gap-2">
          {!proposal.executed && !proposal.rejected && !isExpired && (
            <>
              <button
                onClick={() => handleVote(true)}
                disabled={votingApprove || votingReject}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl transition-all disabled:opacity-50"
              >
                {votingApprove ? <Loader className="w-3.5 h-3.5 animate-spin" /> : "Approve"}
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={votingApprove || votingReject}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-all disabled:opacity-50"
              >
                {votingReject ? <Loader className="w-3.5 h-3.5 animate-spin" /> : "Reject"}
              </button>
            </>
          )}

          {/* Execution triggers */}
          {proposal.votesApprove >= proposal.threshold && !proposal.executed && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 border border-violet-500/30 rounded-xl shadow-lg shadow-violet-950/20 transition-all disabled:opacity-50"
            >
              {executing ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  Executing...
                </>
              ) : (
                "Execute Funds"
              )}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
