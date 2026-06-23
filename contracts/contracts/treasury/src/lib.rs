#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u32,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub recipient: Address,
    pub amount: i128,
    pub token: Address,
    pub votes_approve: u32,
    pub votes_reject: u32,
    pub threshold: u32,
    pub voting_end: u64, // UNIX timestamp in seconds
    pub executed: bool,
    pub rejected: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    VotingPeriod,
    Threshold,
    Member(Address),
    ProposalCount,
    Proposal(u32),
    Voted(u32, Address),
}

#[contract]
pub struct TreasuryContract;

#[contractimpl]
impl TreasuryContract {
    // Initializer
    pub fn initialize(env: Env, admin: Address, voting_period: u64, threshold: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::VotingPeriod, &voting_period);
        env.storage().instance().set(&DataKey::Threshold, &threshold);
        env.storage().instance().set(&DataKey::ProposalCount, &0u32);
        
        // Add admin as first member
        env.storage().persistent().set(&DataKey::Member(admin.clone()), &true);
    }
    
    // Admin functions
    pub fn add_member(env: Env, member: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        env.storage().persistent().set(&DataKey::Member(member.clone()), &true);
        
        env.events().publish(
            (symbol_short!("member"), symbol_short!("added")),
            member
        );
    }
    
    pub fn remove_member(env: Env, member: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        // Cannot remove the admin
        if admin == member {
            panic!("Cannot remove admin");
        }
        
        env.storage().persistent().remove(&DataKey::Member(member.clone()));
        
        env.events().publish(
            (symbol_short!("member"), symbol_short!("removed")),
            member
        );
    }
    
    // Read-only member check
    pub fn is_member(env: Env, address: Address) -> bool {
        env.storage().persistent().has(&DataKey::Member(address))
    }
    
    // Proposal functions
    pub fn create_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
        recipient: Address,
        amount: i128,
        token: Address,
    ) -> u32 {
        proposer.require_auth();
        
        // Must be a member to propose
        if !Self::is_member(env.clone(), proposer.clone()) {
            panic!("Proposer is not a member");
        }
        
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        let mut count: u32 = env.storage().instance().get(&DataKey::ProposalCount).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::ProposalCount, &count);
        
        let voting_period: u64 = env.storage().instance().get(&DataKey::VotingPeriod).unwrap();
        let threshold: u32 = env.storage().instance().get(&DataKey::Threshold).unwrap();
        let voting_end = env.ledger().timestamp() + voting_period;
        
        let proposal = Proposal {
            id: count,
            proposer: proposer.clone(),
            title: title.clone(),
            description,
            recipient: recipient.clone(),
            amount,
            token: token.clone(),
            votes_approve: 0,
            votes_reject: 0,
            threshold,
            voting_end,
            executed: false,
            rejected: false,
        };
        
        env.storage().persistent().set(&DataKey::Proposal(count), &proposal);
        
        env.events().publish(
            (symbol_short!("prop"), symbol_short!("created")),
            (count, proposer, title, amount)
        );
        
        count
    }
    
    pub fn vote(env: Env, voter: Address, proposal_id: u32, approve: bool) {
        voter.require_auth();
        
        if !Self::is_member(env.clone(), voter.clone()) {
            panic!("Voter is not a member");
        }
        
        let vote_key = DataKey::Voted(proposal_id, voter.clone());
        if env.storage().persistent().has(&vote_key) {
            panic!("Already voted");
        }
        
        let mut proposal: Proposal = match env.storage().persistent().get(&DataKey::Proposal(proposal_id)) {
            Some(p) => p,
            None => panic!("Proposal not found"),
        };
        
        if proposal.executed || proposal.rejected {
            panic!("Proposal is resolved");
        }
        
        if env.ledger().timestamp() > proposal.voting_end {
            panic!("Voting period expired");
        }
        
        env.storage().persistent().set(&vote_key, &approve);
        
        if approve {
            proposal.votes_approve += 1;
        } else {
            proposal.votes_reject += 1;
        }
        
        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
        
        env.events().publish(
            (symbol_short!("vote"), symbol_short!("cast")),
            (proposal_id, voter, approve)
        );
    }
    
    pub fn execute_proposal(env: Env, executor: Address, proposal_id: u32) {
        executor.require_auth();
        
        if !Self::is_member(env.clone(), executor.clone()) {
            panic!("Executor is not a member");
        }
        
        let mut proposal: Proposal = match env.storage().persistent().get(&DataKey::Proposal(proposal_id)) {
            Some(p) => p,
            None => panic!("Proposal not found"),
        };
        
        if proposal.executed || proposal.rejected {
            panic!("Proposal is resolved");
        }
        
        if proposal.votes_approve < proposal.threshold {
            panic!("Threshold not met");
        }
        
        proposal.executed = true;
        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
        
        // Execute token transfer from the contract
        let token_client = soroban_sdk::token::Client::new(&env, &proposal.token);
        token_client.transfer(&env.current_contract_address(), &proposal.recipient, &proposal.amount);
        
        env.events().publish(
            (symbol_short!("prop"), symbol_short!("executed")),
            (proposal_id, executor)
        );
    }
    
    pub fn reject_proposal(env: Env, executor: Address, proposal_id: u32) {
        executor.require_auth();
        
        if !Self::is_member(env.clone(), executor.clone()) {
            panic!("Executor is not a member");
        }
        
        let mut proposal: Proposal = match env.storage().persistent().get(&DataKey::Proposal(proposal_id)) {
            Some(p) => p,
            None => panic!("Proposal not found"),
        };
        
        if proposal.executed || proposal.rejected {
            panic!("Proposal is resolved");
        }
        
        let expired = env.ledger().timestamp() > proposal.voting_end;
        let reject_met = proposal.votes_reject >= proposal.threshold;
        
        if !expired && !reject_met {
            panic!("Cannot reject yet");
        }
        
        proposal.rejected = true;
        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
        
        env.events().publish(
            (symbol_short!("prop"), symbol_short!("rejected")),
            (proposal_id, executor)
        );
    }
    
    // Getters
    pub fn get_proposal(env: Env, proposal_id: u32) -> Proposal {
        match env.storage().persistent().get(&DataKey::Proposal(proposal_id)) {
            Some(p) => p,
            None => panic!("Proposal not found"),
        }
    }
    
    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::ProposalCount).unwrap_or(0)
    }
    
    pub fn get_voting_status(env: Env, proposal_id: u32, address: Address) -> u32 {
        let vote_key = DataKey::Voted(proposal_id, address);
        if !env.storage().persistent().has(&vote_key) {
            0
        } else {
            let approve: bool = env.storage().persistent().get(&vote_key).unwrap();
            if approve { 1 } else { 2 }
        }
    }
}

mod test;
