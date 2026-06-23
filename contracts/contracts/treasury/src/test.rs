#![cfg(test)]
use crate::{TreasuryContract, TreasuryContractClient, Proposal};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

#[test]
fn test_treasury_workflow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let member1 = Address::generate(&env);
    let recipient = Address::generate(&env);

    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(&env, &contract_id);

    // Initialize the governance settings
    let voting_period = 3600; // 1 hour
    let threshold = 2;
    client.initialize(&admin, &voting_period, &threshold);

    // Verify initial members list (admin is added automatically)
    assert!(client.is_member(&admin));
    assert!(!client.is_member(&member1));

    // Admin registers member1
    client.add_member(&member1);
    assert!(client.is_member(&member1));

    // Set up mock token contract to test proposal execution transfers
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin);
    let token_client = soroban_sdk::token::Client::new(&env, &token_id);

    // Mint tokens to the treasury contract address so it has funds to execute
    // In test mode with mock_all_auths, this will succeed
    let mint_amount = 5000i128;
    token_client.mint(&contract_id, &mint_amount);
    assert_eq!(token_client.balance(&contract_id), 5000);

    // Create proposal to grant 1000 tokens
    let title = String::from_str(&env, "Community Library Grant");
    let description = String::from_str(&env, "Funding for local educational books and cataloging.");
    let grant_amount = 1000i128;

    let prop_id = client.create_proposal(
        &member1,
        &title,
        &description,
        &recipient,
        &grant_amount,
        &token_id,
    );

    assert_eq!(prop_id, 1);
    assert_eq!(client.get_proposal_count(), 1);

    let proposal: Proposal = client.get_proposal(&1);
    assert_eq!(proposal.title, title);
    assert_eq!(proposal.amount, grant_amount);
    assert_eq!(proposal.votes_approve, 0);
    assert_eq!(proposal.executed, false);

    // Cast votes to meet threshold (threshold is 2)
    client.vote(&admin, &1, &true);
    client.vote(&member1, &1, &true);

    let proposal_voted = client.get_proposal(&1);
    assert_eq!(proposal_voted.votes_approve, 2);

    // Verify voter status check
    assert_eq!(client.get_voting_status(&1, &admin), 1); // 1 = voted approve
    assert_eq!(client.get_voting_status(&1, &recipient), 0); // 0 = not voted

    // Execute proposal and transfer funds
    client.execute_proposal(&member1, &1);

    // Verify state changes
    let proposal_executed = client.get_proposal(&1);
    assert_eq!(proposal_executed.executed, true);
    assert_eq!(token_client.balance(&contract_id), 4000);
    assert_eq!(token_client.balance(&recipient), 1000);
}
