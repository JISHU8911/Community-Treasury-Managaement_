"use client";

import React from "react";
import { useTreasuryStore } from "../../lib/store";
import { History, CheckCircle, XCircle, Loader, ExternalLink } from "lucide-react";

export default function TransactionsPage() {
  const { transactions } = useTreasuryStore();

  const isMock = process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === "true" || !process.env.NEXT_PUBLIC_CONTRACT_ID || process.env.NEXT_PUBLIC_CONTRACT_ID === "CCDAO_TREASURY_MOCK_CONTRACT_ID";

  const truncateHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-100">
          Transaction Tracking
        </h1>
        <p className="text-xs text-gray-400">
          Monitor the lifecycle of all transactions submitted from this session. Updates propagate automatically.
        </p>
      </div>

      {/* Transactions Container */}
      <div className="rounded-2xl glass-panel p-6 border border-white/5 bg-[#0e1222]/30 flex flex-col gap-5">
        {transactions.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <History className="w-12 h-12 text-gray-700" />
            <div>
              <h4 className="font-bold text-sm text-gray-300">No Transactions Tracked</h4>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed mt-1">
                Trigger voting actions, submit proposals, or fund reserves. Transactions will be logged and tracked in real-time.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {transactions.map((tx) => (
              <div
                key={tx.hash}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl glass-panel bg-[#07090e]/40 border border-white/5"
              >
                
                {/* Info & Title */}
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-gray-200">
                      {tx.title}
                    </h4>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {formatDateTime(tx.timestamp)}
                    </span>
                  </div>
                  
                  {/* Clickable Hash */}
                  <a
                    href={isMock ? "#" : `https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1 w-fit"
                  >
                    Hash: {truncateHash(tx.hash)}
                    {!isMock && <ExternalLink className="w-3 h-3" />}
                  </a>

                  {tx.error && (
                    <span className="text-[10px] text-red-400 font-medium leading-normal mt-1 border-t border-red-500/10 pt-1">
                      Reason: {tx.error}
                    </span>
                  )}
                </div>

                {/* Status indicator */}
                <div className="shrink-0 flex items-center gap-2">
                  {tx.status === "pending" && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      Pending
                    </div>
                  )}
                  {tx.status === "success" && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Success
                    </div>
                  )}
                  {tx.status === "failed" && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold uppercase tracking-wider animate-shake">
                      <XCircle className="w-3.5 h-3.5" />
                      Failed
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
