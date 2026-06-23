"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStellarWallet } from "../../../hooks/use-stellar-wallet";
import { useTreasuryMetadata, useCreateProposal } from "../../../hooks/use-treasury";
import { useTreasuryStore } from "../../../lib/store";
import { ArrowLeft, Coins, Loader, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export default function CreateProposalPage() {
  const router = useRouter();
  const { address } = useStellarWallet();
  const { data: meta, isLoading: metaLoading } = useTreasuryMetadata();
  const addToast = useTreasuryStore((state) => state.addToast);
  const createMutation = useCreateProposal();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMember = address && meta?.members?.includes(address);

  const validateStellarAddress = (addr: string) => {
    // Basic regex checks for public key (Starts with G, length 56) or mock contract IDs
    return /^[G|C][A-Z2-7]{55}$/.test(addr) || addr === "CCDAO_TREASURY_MOCK_CONTRACT_ID";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!address) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }

    if (!isMember) {
      setErrorMsg("Access Denied: Only whitelisted community members can submit proposals.");
      return;
    }

    if (!title.trim() || !description.trim() || !recipient.trim() || !amount.trim()) {
      setErrorMsg("All fields are required.");
      return;
    }

    if (!validateStellarAddress(recipient)) {
      setErrorMsg("Invalid recipient Stellar public key (must start with G/C and be 56 characters).");
      return;
    }

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg("Amount must be a positive number.");
      return;
    }

    setLoading(true);

    try {
      await createMutation.mutateAsync({
        proposer: address,
        title,
        description,
        recipient,
        amount,
        token: "", // Defaults to Native XLM
      });

      addToast({
        title: "Proposal Created",
        description: `Proposal '${title}' successfully created. Voting is active.`,
        type: "success",
      });

      router.push("/treasury");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create proposal. Make sure you are a whitelisted member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full animate-fade-in py-4">
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
          <Coins className="w-6 h-6 text-violet-400 animate-pulse" />
          Create Treasury Proposal
        </h1>
        <p className="text-xs text-gray-400">
          Propose a new funding allocation or grant request. Whitelisted DAO members will vote to authorize disbursements.
        </p>
      </div>

      {/* Check connection & whitelist membership */}
      {!address ? (
        <div className="rounded-2xl glass-panel p-8 border border-white/5 bg-[#0e1222]/30 flex flex-col items-center justify-center text-center gap-4 py-16">
          <AlertCircle className="w-12 h-12 text-amber-500" />
          <div>
            <h3 className="text-sm font-bold text-gray-200">Wallet Connection Required</h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1.5 leading-relaxed">
              Please connect your Stellar wallet using the button in the header before attempting to submit proposals.
            </p>
          </div>
          <Link
            href="/wallet"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors mt-2"
          >
            Wallet center
          </Link>
        </div>
      ) : !metaLoading && !isMember ? (
        <div className="rounded-2xl glass-panel p-8 border border-white/5 bg-[#0e1222]/30 flex flex-col items-center justify-center text-center gap-4 py-16">
          <ShieldAlert className="w-12 h-12 text-red-500" />
          <div>
            <h3 className="text-sm font-bold text-gray-200">Access Denied: Non-Whitelist Member</h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1.5 leading-relaxed">
              Your address <span className="font-mono text-gray-300 select-all text-[11px] block mt-1">{address}</span> is connected, but not whitelisted in the Community Treasury registry.
            </p>
          </div>
          <div className="text-[11px] text-gray-500 max-w-xs mt-1 border-t border-white/5 pt-3">
            Contact the DAO contract administrator to register your address.
          </div>
        </div>
      ) : (
        /* Form body */
        <div className="rounded-2xl glass-panel p-6 md:p-8 border border-white/5 bg-[#0e1222]/30 flex flex-col gap-6 relative overflow-hidden">

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Proposal Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Proposal Title
              </label>
              <input
                type="text"
                placeholder="e.g. Funding Community Solar Grid Irrigation"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-4 py-3 rounded-xl text-sm font-medium glass-input"
                disabled={loading}
              />
            </div>

            {/* Request Info Fields (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Amount */}
              <div className="flex flex-col gap-1.5 col-span-1">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Amount (XLM)
                </label>
                <input
                  type="number"
                  placeholder="1000"
                  step="any"
                  min="0.0001"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm font-medium glass-input"
                  disabled={loading}
                />
              </div>

              {/* Recipient Address */}
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Recipient Public Key (Address)
                </label>
                <input
                  type="text"
                  placeholder="G..."
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm font-mono glass-input"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Detailed Description
              </label>
              <textarea
                placeholder="Provide a clear description of project milestones, expenditures, and objectives. This will be visible on-chain to all voting members..."
                rows={5}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="px-4 py-3 rounded-xl text-sm font-medium glass-input resize-none"
                disabled={loading}
              />
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
              <Link
                href="/treasury"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-gray-200 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 border border-violet-500/30 shadow-lg shadow-violet-950/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    Submitting Proposal...
                  </>
                ) : (
                  "Submit Proposal"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
