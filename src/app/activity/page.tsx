"use client";

import React from "react";
import { useTreasuryEvents } from "../../hooks/use-treasury";
import { useTreasuryStore } from "../../lib/store";
import { FileText, CheckSquare, PlusCircle, UserPlus, ArrowUpRight, HelpCircle, RefreshCw } from "lucide-react";

export default function ActivityPage() {
  const { data: events, isLoading, refetch } = useTreasuryEvents();
  const storeEvents = useTreasuryStore((state) => state.events);

  const activeEvents = events || storeEvents;

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Get icons and border indicators based on event type
  const getEventStyle = (type: string) => {
    switch (type) {
      case "proposal_created":
        return {
          icon: PlusCircle,
          color: "text-violet-400 border-violet-500/20 bg-violet-500/5",
          label: "Proposal Created",
        };
      case "vote_cast":
        return {
          icon: CheckSquare,
          color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
          label: "Vote Cast",
        };
      case "proposal_executed":
        return {
          icon: FileText,
          color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
          label: "Funds Disbursed",
        };
      case "deposit_received":
        return {
          icon: ArrowUpRight,
          color: "text-teal-400 border-teal-500/20 bg-teal-500/5",
          label: "Deposit Received",
        };
      case "member_added":
        return {
          icon: UserPlus,
          color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
          label: "Member Registered",
        };
      default:
        return {
          icon: HelpCircle,
          color: "text-gray-400 border-gray-500/20 bg-gray-500/5",
          label: "Contract Event",
        };
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full animate-fade-in">
      
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-100">
            Activity Feed
          </h1>
          <p className="text-xs text-gray-400">
            Real-time feed of smart contract events and governance actions indexed from Stellar ledger sequences.
          </p>
        </div>
        <button
          onClick={() => {
            refetch();
            useTreasuryStore.getState().addToast({ title: "Refreshing Feed", description: "Querying latest contract events.", type: "info" });
          }}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Events Stream Panel */}
      <div className="rounded-2xl glass-panel p-6 border border-white/5 bg-[#0e1222]/30 flex flex-col gap-5">
        {isLoading && activeEvents.length === 0 ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full rounded-xl border border-white/5 bg-[#0e1222]/20 animate-shimmer" />
            ))}
          </div>
        ) : activeEvents.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <PlusCircle className="w-12 h-12 text-gray-700" />
            <div>
              <h4 className="font-bold text-sm text-gray-300">No Events Logged</h4>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed mt-1">
                Once transactions are processed and contract topics emit, real-time activity logs will display here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 relative pl-4 border-l border-white/5 ml-3">
            {activeEvents.map((event) => {
              const style = getEventStyle(event.type);
              const EventIcon = style.icon;

              return (
                <div key={event.id} className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl glass-panel bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 glow-hover-cyan">
                  {/* Left Circle Dot Anchor */}
                  <div className={`absolute -left-[25px] top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full border flex items-center justify-center bg-[#07090e] ${style.color}`}>
                    <EventIcon className="w-2.5 h-2.5" />
                  </div>

                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.color}`}>
                        {style.label}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-medium">
                      {event.description}
                    </p>
                  </div>

                  <div className="text-left md:text-right shrink-0">
                    <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Actor Address</span>
                    <span className="text-xs font-mono text-gray-400 mt-0.5 block">
                      {truncateAddress(event.walletAddress)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
