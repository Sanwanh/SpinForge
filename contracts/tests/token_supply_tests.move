#[test_only]
/// H-RT-3: SPARK/FORGE mint now asserts total_supply + amount <= MAX_SUPPLY.
/// These tests confirm the new global-cap guard does not break a normal mint
/// and that total_supply tracks correctly. (The over-cap branch is a one-line
/// arithmetic guard; reaching MAX_SUPPLY=1e18 in a unit test is impractical
/// because MAX_MINT_PER_CALL caps each call at 1e14, so it is not exercised here.)
module spinforge::token_supply_tests {
    use sui::test_scenario;
    use sui::coin::{Self, TreasuryCap};
    use spinforge::spark_token::{Self, SPARK_TOKEN};
    use spinforge::forge_token::{Self, FORGE_TOKEN};

    const ADMIN: address = @0xAD;
    const RECIPIENT: address = @0xB0B;

    #[test]
    fun test_spark_mint_within_cap_tracks_supply() {
        let mut scenario = test_scenario::begin(ADMIN);
        spark_token::init_for_testing(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, ADMIN);
        let mut cap = test_scenario::take_from_sender<TreasuryCap<SPARK_TOKEN>>(&scenario);

        spark_token::mint(&mut cap, 500_000_000_000, RECIPIENT, test_scenario::ctx(&mut scenario));
        assert!(coin::total_supply(&cap) == 500_000_000_000, 0);

        spark_token::mint(&mut cap, 100_000_000_000, RECIPIENT, test_scenario::ctx(&mut scenario));
        assert!(coin::total_supply(&cap) == 600_000_000_000, 1);

        test_scenario::return_to_sender(&scenario, cap);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_forge_mint_within_cap_tracks_supply() {
        let mut scenario = test_scenario::begin(ADMIN);
        forge_token::init_for_testing(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, ADMIN);
        let mut cap = test_scenario::take_from_sender<TreasuryCap<FORGE_TOKEN>>(&scenario);

        forge_token::mint(&mut cap, 1_000_000_000, RECIPIENT, test_scenario::ctx(&mut scenario));
        assert!(coin::total_supply(&cap) == 1_000_000_000, 0);

        test_scenario::return_to_sender(&scenario, cap);
        test_scenario::end(scenario);
    }
}
