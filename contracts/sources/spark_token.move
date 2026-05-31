module spinforge::spark_token {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::event;

    // ===== Error Codes =====
    /// A single mint call exceeded the per-call ceiling. (H-2)
    const EMintAmountTooLarge: u64 = 0;
    /// Minting this amount would push total supply past MAX_SUPPLY. (H-RT-3)
    const EMaxSupplyExceeded: u64 = 1;

    // ===== Constants =====
    /// Hard ceiling on a single mint call (100,000 SPARK at 9 decimals).
    /// Defence-in-depth: bounds the blast radius of a single bad/compromised
    /// call far below catastrophic (e.g. u64::MAX).
    const MAX_MINT_PER_CALL: u64 = 100_000_000_000_000;

    /// H-RT-3: global hard cap on total minted supply — 1,000,000,000 SPARK at
    /// 9 decimals (1e18 < u64::MAX). Even a compromised TreasuryCap cannot inflate
    /// supply past this ceiling, bounding the blast radius of the single hot key.
    /// Raising the cap requires a contract upgrade (deliberate, auditable).
    const MAX_SUPPLY: u64 = 1_000_000_000_000_000_000;

    // ===== OTW =====

    /// One-Time Witness for Coin<SPARK_TOKEN>
    public struct SPARK_TOKEN has drop {}

    // ===== Events =====

    public struct SparkMinted has copy, drop {
        amount: u64,
        recipient: address,
    }

    // ===== Init =====

    fun init(witness: SPARK_TOKEN, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9, // decimals
            b"SPARK",
            b"Spark Token",
            b"SpinForge play currency for rewards, forge, and packs",
            option::none(),
            ctx,
        );

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, ctx.sender());
    }

    // ===== Mint =====

    public fun mint(
        treasury_cap: &mut TreasuryCap<SPARK_TOKEN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        assert!(amount <= MAX_MINT_PER_CALL, EMintAmountTooLarge);
        assert!(coin::total_supply(treasury_cap) + amount <= MAX_SUPPLY, EMaxSupplyExceeded);
        let coin = coin::mint(treasury_cap, amount, ctx);
        event::emit(SparkMinted { amount, recipient });
        transfer::public_transfer(coin, recipient);
    }

    /// Mint and return the coin (for programmatic use).
    public fun mint_coin(
        treasury_cap: &mut TreasuryCap<SPARK_TOKEN>,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<SPARK_TOKEN> {
        assert!(amount <= MAX_MINT_PER_CALL, EMintAmountTooLarge);
        assert!(coin::total_supply(treasury_cap) + amount <= MAX_SUPPLY, EMaxSupplyExceeded);
        coin::mint(treasury_cap, amount, ctx)
    }

    // ===== Burn =====

    public fun burn(
        treasury_cap: &mut TreasuryCap<SPARK_TOKEN>,
        coin: Coin<SPARK_TOKEN>,
    ) {
        coin::burn(treasury_cap, coin);
    }

    // ===== Test Helpers =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(SPARK_TOKEN {}, ctx);
    }
}
