module spinforge::tournament {
    use sui::event;
    use sui::coin::{Self, Coin};
    use spinforge::spark_token::SPARK_TOKEN;

    // ===== Error Codes =====
    const ENotOrganizer: u64 = 0;
    const ETournamentFull: u64 = 1;
    const ETournamentNotStarted: u64 = 2;
    const EAlreadyRegistered: u64 = 3;
    const EInvalidRound: u64 = 4;
    const ENotEnoughPlayers: u64 = 5;
    const ETournamentComplete: u64 = 6;
    const EInvalidParticipant: u64 = 7;

    // ===== Constants =====
    const STATE_REGISTRATION: u8 = 0;
    const STATE_IN_PROGRESS: u8 = 1;
    const STATE_COMPLETE: u8 = 2;

    // ===== Structs =====

    public struct Tournament has key {
        id: UID,
        organizer: address,
        name: vector<u8>,
        max_players: u64,
        entry_fee: u64,
        prize_pool: u64,
        players: vector<address>,
        /// Bracket: each round is a vector of winners advancing
        bracket: vector<vector<address>>,
        current_round: u8,
        state: u8,
    }

    // ===== Events =====

    public struct TournamentCreated has copy, drop {
        tournament_id: ID,
        organizer: address,
        max_players: u64,
        entry_fee: u64,
    }

    public struct PlayerRegistered has copy, drop {
        tournament_id: ID,
        player: address,
    }

    public struct RoundAdvanced has copy, drop {
        tournament_id: ID,
        round: u8,
        winners: vector<address>,
    }

    public struct TournamentCompleted has copy, drop {
        tournament_id: ID,
        champion: address,
        prize: u64,
    }

    // ===== Functions =====

    /// Create a new bracket tournament.
    public fun create_tournament(
        name: vector<u8>,
        max_players: u64,
        entry_fee: u64,
        ctx: &mut TxContext,
    ): Tournament {
        let tournament = Tournament {
            id: object::new(ctx),
            organizer: ctx.sender(),
            name,
            max_players,
            entry_fee,
            prize_pool: 0,
            players: vector::empty(),
            bracket: vector::empty(),
            current_round: 0,
            state: STATE_REGISTRATION,
        };

        event::emit(TournamentCreated {
            tournament_id: object::id(&tournament),
            organizer: ctx.sender(),
            max_players,
            entry_fee,
        });

        tournament
    }

    /// Register a player for the tournament with entry fee.
    public fun register(
        tournament: &mut Tournament,
        payment: Coin<SPARK_TOKEN>,
        ctx: &mut TxContext,
    ) {
        assert!(tournament.state == STATE_REGISTRATION, ETournamentNotStarted);
        assert!(vector::length(&tournament.players) < tournament.max_players, ETournamentFull);

        let player = ctx.sender();
        // Check not already registered
        let mut i = 0;
        let len = vector::length(&tournament.players);
        while (i < len) {
            assert!(*vector::borrow(&tournament.players, i) != player, EAlreadyRegistered);
            i = i + 1;
        };

        // Collect entry fee
        let fee = coin::value(&payment);
        assert!(fee >= tournament.entry_fee, EInvalidParticipant);
        tournament.prize_pool = tournament.prize_pool + fee;
        transfer::public_transfer(payment, @0x0); // Burn to pool (simplified)

        vector::push_back(&mut tournament.players, player);

        event::emit(PlayerRegistered {
            tournament_id: object::id(tournament),
            player,
        });
    }

    /// Start the tournament (organizer only). Must have >= 2 players.
    public fun start_tournament(
        tournament: &mut Tournament,
        ctx: &TxContext,
    ) {
        assert!(tournament.organizer == ctx.sender(), ENotOrganizer);
        assert!(tournament.state == STATE_REGISTRATION, ETournamentNotStarted);
        assert!(vector::length(&tournament.players) >= 2, ENotEnoughPlayers);

        tournament.state = STATE_IN_PROGRESS;
        tournament.current_round = 1;

        // Initialize first bracket round with all players
        vector::push_back(&mut tournament.bracket, tournament.players);
    }

    /// Advance to next round with winners from current round.
    public fun advance_round(
        tournament: &mut Tournament,
        winners: vector<address>,
        ctx: &TxContext,
    ) {
        assert!(tournament.organizer == ctx.sender(), ENotOrganizer);
        assert!(tournament.state == STATE_IN_PROGRESS, EInvalidRound);

        vector::push_back(&mut tournament.bracket, winners);
        let latest_idx = vector::length(&tournament.bracket) - 1;
        let latest_winners = vector::borrow(&tournament.bracket, latest_idx);
        let num_winners = vector::length(latest_winners);
        tournament.current_round = tournament.current_round + 1;

        event::emit(RoundAdvanced {
            tournament_id: object::id(tournament),
            round: tournament.current_round,
            winners,
        });

        // If only 1 winner, tournament is complete
        if (num_winners == 1) {
            tournament.state = STATE_COMPLETE;
            let champion = *vector::borrow(latest_winners, 0);
            event::emit(TournamentCompleted {
                tournament_id: object::id(tournament),
                champion,
                prize: tournament.prize_pool,
            });
        };
    }

    /// Distribute prizes (simplified: full pool to champion).
    public fun distribute_prizes(
        tournament: &Tournament,
        treasury_cap: &mut sui::coin::TreasuryCap<SPARK_TOKEN>,
        ctx: &mut TxContext,
    ) {
        assert!(tournament.state == STATE_COMPLETE, ETournamentComplete);

        let last_round_idx = vector::length(&tournament.bracket) - 1;
        let final_round = vector::borrow(&tournament.bracket, last_round_idx);
        let champion = *vector::borrow(final_round, 0);

        // Mint prize to champion
        spinforge::spark_token::mint(
            treasury_cap,
            tournament.prize_pool,
            champion,
            ctx,
        );
    }

    // ===== Getters =====

    public fun tournament_id(t: &Tournament): ID { object::id(t) }
    public fun organizer(t: &Tournament): address { t.organizer }
    public fun max_players(t: &Tournament): u64 { t.max_players }
    public fun entry_fee(t: &Tournament): u64 { t.entry_fee }
    public fun prize_pool(t: &Tournament): u64 { t.prize_pool }
    public fun players(t: &Tournament): &vector<address> { &t.players }
    public fun player_count(t: &Tournament): u64 { vector::length(&t.players) }
    public fun current_round(t: &Tournament): u8 { t.current_round }
    public fun state(t: &Tournament): u8 { t.state }

    // ===== Test Helpers =====

    #[test_only]
    public fun destroy_for_testing(t: Tournament) {
        let Tournament { id, .. } = t;
        object::delete(id);
    }

    #[test_only]
    public fun add_player_for_testing(t: &mut Tournament, player: address) {
        vector::push_back(&mut t.players, player);
    }
}
