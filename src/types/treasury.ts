export interface Proposal {
  id: number;
  proposer: string;
  title: string;
  description: string;
  recipient: string;
  amount: string; // Stored as a string to handle large integers
  token: string;
  votesApprove: number;
  votesReject: number;
  threshold: number;
  votingEnd: number; // UNIX timestamp in seconds
  executed: boolean;
  rejected: boolean;
}

export interface TransactionTrack {
  hash: string;
  title: string;
  status: "pending" | "success" | "failed";
  timestamp: number;
  error?: string;
}

export interface TreasuryEvent {
  id: string;
  type:
    | "proposal_created"
    | "vote_cast"
    | "proposal_executed"
    | "proposal_rejected"
    | "member_added"
    | "member_removed"
    | "deposit_received";
  timestamp: number;
  walletAddress: string;
  description: string;
}

export interface Member {
  address: string;
  addedAt: number;
}
