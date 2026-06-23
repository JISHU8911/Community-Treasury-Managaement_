import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProposals,
  getTreasuryBalance,
  fetchTreasuryMetadata,
  createProposal as contractCreateProposal,
  castVote as contractCastVote,
  executeProposal as contractExecuteProposal,
  depositFunds as contractDepositFunds,
  fetchEventsList,
  fetchMembersList,
} from "../lib/soroban-client";
import { useTreasuryStore } from "../lib/store";

export const useProposals = () => {
  const setProposals = useTreasuryStore((state) => state.setProposals);
  return useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const data = await fetchProposals();
      setProposals(data);
      return data;
    },
    refetchInterval: 10000, // Poll every 10 seconds for real-time synchronization
  });
};

export const useTreasuryBalance = () => {
  return useQuery({
    queryKey: ["treasuryBalance"],
    queryFn: getTreasuryBalance,
    refetchInterval: 12000,
  });
};

export const useTreasuryMetadata = () => {
  const setTreasuryMetadata = useTreasuryStore((state) => state.setTreasuryMetadata);
  const setMembers = useTreasuryStore((state) => state.setMembers);
  
  return useQuery({
    queryKey: ["treasuryMetadata"],
    queryFn: async () => {
      const meta = await fetchTreasuryMetadata();
      const members = await fetchMembersList();
      
      setTreasuryMetadata(meta.admin, meta.votingPeriod, meta.threshold);
      setMembers(members);
      
      return { ...meta, members };
    },
  });
};

export const useTreasuryEvents = () => {
  const setEvents = useTreasuryStore((state) => state.setEvents);
  return useQuery({
    queryKey: ["treasuryEvents"],
    queryFn: async () => {
      const events = await fetchEventsList();
      setEvents(events);
      return events;
    },
    refetchInterval: 8000, // Poll activity feed every 8s for live update feel
  });
};

export const useCreateProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposer,
      title,
      description,
      recipient,
      amount,
      token,
    }: {
      proposer: string;
      title: string;
      description: string;
      recipient: string;
      amount: string;
      token: string;
    }) => {
      return contractCreateProposal(proposer, title, description, recipient, amount, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["treasuryEvents"] });
    },
  });
};

export const useVoteProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      voter,
      proposalId,
      approve,
    }: {
      voter: string;
      proposalId: number;
      approve: boolean;
    }) => {
      return contractCastVote(voter, proposalId, approve);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["treasuryEvents"] });
    },
  });
};

export const useExecuteProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      executor,
      proposalId,
    }: {
      executor: string;
      proposalId: number;
    }) => {
      return contractExecuteProposal(executor, proposalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["treasuryBalance"] });
      queryClient.invalidateQueries({ queryKey: ["treasuryEvents"] });
    },
  });
};

export const useDepositFunds = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      depositor,
      amount,
    }: {
      depositor: string;
      amount: string;
    }) => {
      return contractDepositFunds(depositor, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasuryBalance"] });
      queryClient.invalidateQueries({ queryKey: ["treasuryEvents"] });
    },
  });
};
