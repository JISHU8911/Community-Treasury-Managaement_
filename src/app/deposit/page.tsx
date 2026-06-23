"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStellarWallet } from "../../hooks/use-stellar-wallet";
import { useDepositFunds, useTreasuryBalance } from "../../hooks/use-treasury";
import { useTreasuryStore } from "../../lib/store";
import { ArrowLeft, ArrowDownLeft, Loader, Wallet, AlertCircle, Coins, CheckCircle2 } from "lucide-react";

export default function DepositPage() {
  const router = useRouter();
  const { address, balance } = useStellarWallet();
  const { data: treasuryBalance, isLoading: balanceLoading } = useTreasuryBalance();
  const addToast = useTreasuryStore((state) => state.addToast);
  const depositMutation = useDepositFunds();

  const [amount, setAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [successVal, setSuccessVal] = useState<string | null>(null);

  const walletBal = isNaN(parseFloat(balance)) ? 0 : parseFloat(balance);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessVal(null);

    if (!address) {
      addToast({
        title: "Wallet Required",
        description: "Please connect your Stellar wallet to deposit funds.",
        type: "error",
      });
      return;
    }

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      addToast({
        title: "Invalid Amount",
        description: "Please specify a positive XLM amount to deposit.",
        type: "error",
      });
      return;
    }

    if (walletBal < numAmt) {
      addToast({
        title: "Insufficient Balance",
        description: `Your wallet holds ${walletBal} XLM, which is less than the requested ${numAmt} XLM deposit.`,
        type: "error",
      });
      return;
    }

    setDepositing(true);
    try {
      await depositMutation.mutateAsync({
        depositor: address,
        amount,
      });

      addToast({
        title: "Reserves Funded",
        description: `Successfully deposited ${amount} XLM into treasury reserves.`,
        type: "success",
      });
      
      setSuccessVal(amount);
      setAmount("");
    } catch (err: any) {
      addToast({
        title: "Deposit Failed",
        description: err?.message || "Failed to process deposit transaction.",
        type: "error",
      });
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full animate-fade-in py-4">
      {/* Back to Treasury */}
      <Link
        href="/treasury"
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors w-fit group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to Treasury Center
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-100 flex items-center gap-2">
          <ArrowDownLeft className="w-6 h-6 text-emerald-400" />
          Deposit Reserves
        </h1>
        <p className="text-xs text-gray-400">
          Transfer native Stellar XLM from your connected wallet directly into the community treasury pool.
        </p>
      </div>

      {/* Main glass card */}
      <div className="rounded-2xl glass-panel p-6 md:p-8 border border-white/5 bg-[#0e1222]/30 flex flex-col gap-6 relative overflow-hidden">

        {successVal ? (
          <div className="flex flex-col items-center justify-center text-center py-8 gap-4 animate-scale-up">
            <div className="p-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-100">Deposit Successful</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1.5 leading-relaxed">
                Successfully funded <span className="font-semibold text-emerald-400">{successVal} XLM</span> to the Treasury. Your wallet balance and treasury total holdings have been updated.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setSuccessVal(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-gray-100 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Deposit More
              </button>
              <Link
                href="/treasury"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors"
              >
                View in Treasury
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDeposit} className="flex flex-col gap-6">
            
            {/* Wallet Info Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">
                  Your Balance
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Wallet className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-sm font-extrabold text-gray-200">
                    {address ? `${balance} XLM` : "Not connected"}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">
                  Treasury Reserves
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-sm font-extrabold text-gray-200">
                    {balanceLoading ? "Loading..." : `${treasuryBalance || "0.0000"} XLM`}
                  </span>
                </div>
              </div>
            </div>

            {/* Input field */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Amount to Deposit (XLM)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  placeholder="e.g. 500"
                  step="any"
                  min="0.0001"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-4 pr-14 py-3.5 rounded-xl text-sm font-semibold glass-input focus:border-emerald-500/40 transition-colors"
                  disabled={depositing}
                />
                <span className="absolute right-4 text-xs font-bold text-gray-500">XLM</span>
              </div>
            </div>

            {/* Warnings if necessary */}
            {amount && walletBal < parseFloat(amount) && (
              <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Insufficient funds:</strong> Your wallet balance ({walletBal} XLM) is too low for this deposit amount.
                </span>
              </div>
            )}

            {!address && (
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Please connect your wallet first to deposit reserves.</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={depositing || !address || !amount || walletBal < parseFloat(amount)}
              className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 shadow-lg shadow-emerald-950/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
            >
              {depositing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Depositing Funds...
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-4 h-4" />
                  Deposit Funds
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Rules info */}
      <div className="rounded-xl border border-white/5 bg-[#0e1222]/10 p-5 text-xs text-gray-400 leading-relaxed flex flex-col gap-2">
        <h4 className="font-semibold text-gray-200">About Treasury Funding</h4>
        <p>
          Deposited reserves are governed by the whitelisted members of the DAO. Once deposited into the Soroban contract, they cannot be withdrawn without a whitelisted proposal passing a consensus threshold.
        </p>
      </div>
    </div>
  );
}
