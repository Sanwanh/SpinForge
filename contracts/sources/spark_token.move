module spinforge::spark_token {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::event;

    // ===== Error Codes =====
    /// A single mint call exceeded the per-call ceiling. (H-2)
    const EMintAmountTooLarge: u64 = 0;

    // ===== Constants =====
    /// Hard ceiling on a single mint call (100,000 SPARK at 9 decimals).
    /// Defence-in-depth: bounds the blast radius of a single bad/compromised
    /// call far below catastrophic (e.g. u64::MAX). A global MAX_SUPPLY needs
    /// the bounded-minter refactor tracked separately.
    const MAX_MINT_PER_CALL: u64 = 100_000_000_000_000;

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
