import { create } from "zustand";
import { Proposal, TransactionTrack, TreasuryEvent } from "../types/treasury";

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: "success" | "error" | "info";
}

interface TreasuryState {
  // Wallet state
  address: string | null;
  walletId: string | null;
  balance: string;
  network: string;
  isConnecting: boolean;
  error: string | null;

  // Treasury contract cached states
  adminAddress: string | null;
  votingPeriod: number; // in seconds
  threshold: number; // minimum votes to approve
  members: string[];
  proposals: Proposal[];

  // User interactions logs
  transactions: TransactionTrack[];
  events: TreasuryEvent[];
  toasts: ToastMessage[];

  // Setters/actions
  setWallet: (address: string | null, walletId: string | null) => void;
  setBalance: (balance: string) => void;
  setNetwork: (network: string) => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;

  setTreasuryMetadata: (
    admin: string | null,
    votingPeriod: number,
    threshold: number
  ) => void;
  setMembers: (members: string[]) => void;
  setProposals: (proposals: Proposal[]) => void;
  addProposal: (proposal: Proposal) => void;

  addTransaction: (tx: TransactionTrack) => void;
  updateTransactionStatus: (
    hash: string,
    status: "pending" | "success" | "failed",
    error?: string
  ) => void;

  addEvent: (event: TreasuryEvent) => void;
  setEvents: (events: TreasuryEvent[]) => void;
  
  // Toast notifications actions
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
  clearWallet: () => void;
}

export const useTreasuryStore = create<TreasuryState>((set) => ({
  // Initial wallet states
  address: null,
  walletId: null,
  balance: "0.0000000",
  network: "stellar-testnet",
  isConnecting: false,
  error: null,

  // Initial contract cached states
  adminAddress: null,
  votingPeriod: 0,
  threshold: 0,
  members: [],
  proposals: [],

  // User logs
  transactions: [],
  events: [],
  toasts: [],

  // Implementations
  setWallet: (address, walletId) =>
    set({ address, walletId, error: null, isConnecting: false }),
  setBalance: (balance) => set({ balance }),
  setNetwork: (network) => set({ network }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setError: (error) => set({ error }),

  setTreasuryMetadata: (adminAddress, votingPeriod, threshold) =>
    set({ adminAddress, votingPeriod, threshold }),
  setMembers: (members) => set({ members }),
  setProposals: (proposals) =>
    set({
      proposals: proposals.sort((a, b) => b.id - a.id),
    }),
  addProposal: (proposal) =>
    set((state) => ({
      proposals: [proposal, ...state.proposals].sort((a, b) => b.id - a.id),
    })),

  addTransaction: (tx) =>
    set((state) => ({
      transactions: [tx, ...state.transactions],
    })),
  updateTransactionStatus: (hash, status, error) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.hash === hash ? { ...t, status, error } : t
      ),
    })),

  addEvent: (event) =>
    set((state) => {
      if (state.events.some((e) => e.id === event.id)) return state;
      return { events: [event, ...state.events] };
    }),
  setEvents: (events) =>
    set({
      events: events.sort((a, b) => b.timestamp - a.timestamp),
    }),

  addToast: (toast) =>
    set((state) => {
      const id = Math.random().toString(36).substring(2, 9);
      // Auto-remove toast after 4s
      setTimeout(() => {
        useTreasuryStore.getState().removeToast(id);
      }, 4000);
      return { toasts: [...state.toasts, { ...toast, id }] };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearWallet: () =>
    set({
      address: null,
      walletId: null,
      balance: "0.0000000",
    }),
}));
