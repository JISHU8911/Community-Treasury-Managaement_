"use client";

import React, { useState } from "react";
import { useCreateProposal } from "../hooks/use-treasury";
import { useStellarWallet } from "../hooks/use-stellar-wallet";
import { useTreasuryStore } from "../lib/store";
import { X, Coins, Loader, AlertCircle } from "lucide-react";

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProposalModal({ isOpen, onClose }: ProposalModalProps) {
  const { address } = useStellarWallet();
  const addToast = useTreasuryStore((state) => state.addToast);
  
  const createMutation = useCreateProposal();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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

    if (!title.trim() || !description.trim() || !recipient.trim() || !amount.trim()) {
      setErrorMsg("All fields are required.");
      return;
    }

    if (!validateStellarAddress(recipient)) {
      setErrorMsg("Invalid recipient Stellar public key (must start with G and be 56 characters).");
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
      
      // Reset & Close
      setTitle("");
      setDescription("");
      setRecipient("");
      setAmount("");
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create proposal. Make sure you are a whitelisted member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col bg-[#0d121f]">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
          <h3 className="font-bold text-gray-100 flex items-center gap-2">
            <Coins className="w-5 h-5 text-violet-400" />
            Create Treasury Proposal
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Proposal Title
            </label>
            <input
              type="text"
              placeholder="e.g. Funding Community Garden Supplies"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium glass-input"
              disabled={loading}
            />
          </div>

          {/* Request Info Fields */}
          <div className="grid grid-cols-3 gap-4">
            {/* Amount */}
            <div className="flex flex-col gap-1.5 col-span-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Amount (XLM)
              </label>
              <input
                type="number"
                placeholder="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium glass-input"
                disabled={loading}
              />
            </div>
            
            {/* Recipient */}
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Recipient Public Key (Address)
              </label>
              <input
                type="text"
                placeholder="G..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="px-4 py-2.5 rounded-xl text-sm font-mono glass-input"
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
              placeholder="Provide context, links, and line item expenditures for the community vote..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium glass-input resize-none"
              disabled={loading}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 mt-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-gray-200 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 border border-violet-500/30 shadow-lg shadow-violet-950/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  Creating Proposal...
                </>
              ) : (
                "Submit Proposal"
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
