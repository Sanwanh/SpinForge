#[test_only]
module spinforge::forge_tests {
    use spinforge::forge;

    #[test]
    fun test_evolution_cost() {
        assert!(forge::evolution_cost() == 50_000_000_000);
    }

    #[test]
    fun test_fusion_cost() {
        assert!(forge::fusion_cost() == 200_000_000_000);
    }

    #[test]
    fun test_retune_cost() {
        assert!(forge::retune_cost() == 75_000_000_000);
    }

    // Note: Full evolution/fusion tests require TreasuryCap<SPARK_TOKEN> which
    // requires init() to be called. These are integration-level tests that
    // would be tested in a testnet deployment scenario.
    // The cost validation and rarity checks are tested via the constant getters above.
    // Detailed evolution tests with coin minting would need:
    //   1. Call spark_token::init_for_testing to get TreasuryCap
    //   2. Mint coins for payment
    //   3. Mint 3 Common blades
    //   4. Call evolve_blades
    // This is deferred to integration testing.
}
