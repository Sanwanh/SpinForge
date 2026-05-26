module spinforge::battle {
    use sui::event;
    use sui::clock::Clock;

    // ===== Error Codes =====
    const ENotPlayer: u64 = 0;
    const EInvalidState: u64 = 1;
    const EBeyAlreadyUsed: u64 = 2;
    const EInvalidBeyIndex: u64 = 3;
    const ECommitAlreadySubmitted: u64 = 4;
    const ERevealMismatch: u64 = 5;
    const EDeadlineNotReached: u64 = 6;
    const EMatchComplete: u64 = 7;
    const EInvalidLockTightness: u64 = 8;
    const ENotBothCommitted: u64 = 9;

    // ===== Constants =====
    // Match states
    const STATE_BEY_SELECT: u8 = 0;
    const STATE_IN_ROUND: u8 = 1;
    const STATE_COMPLETE: u8 = 2;

    // Round states
    const ROUND_COMMIT: u8 = 0;
    const ROUND_REVEAL: u8 = 1;
    const ROUND_RESOLVED: u8 = 2;

    // Finish types for scoring
    const FINISH_SPIN: u8 = 0;    // 1 pt
    const FINISH_OVER: u8 = 1;    // 2 pts
    const FINISH_BURST: u8 = 2;   // 2 pts
    const FINISH_XTREME: u8 = 3;  // 3 pts

    // Default deadline: 30 seconds
    const COMMIT_DEADLINE_MS: u64 = 30_000;
    const WIN_SCORE: u8 = 7;

    // ===== Structs =====

    public struct Match has key {
        id: UID,
        player_a: address,
        player_b: address,
        score_a: u8,
        score_b: u8,
        stadium_id: ID,
        rounds_played: u8,
        current_round_id: Option<ID>,
        deck_a: vector<ID>,
        deck_b: vector<ID>,
        used_a: vector<bool>,
        used_b: vector<bool>,
        state: u8,
    }

    public struct Round has key {
        id: UID,
        match_id: ID,
        bey_a_id: ID,
        bey_b_id: ID,
        am_a: u64,
        am_b: u64,
        initial_am_a: u64,
        initial_am_b: u64,
        burst_integrity_a: u64,
        burst_integrity_b: u64,
        zone_a: u8,
        zone_b: u8,
        lock_tightness_a: u8,
        lock_tightness_b: u8,
        turn: u8,
        wobble_a: u8,
        wobble_b: u8,
        commit_a: vector<u8>,
        commit_b: vector<u8>,
        state: u8,
        deadline: u64,
    }

    // ===== Events =====

    public struct MatchCreated has copy, drop {
        match_id: ID,
        player_a: address,
        player_b: address,
        stadium_id: ID,
    }

    public struct RoundStarted has copy, drop {
        round_id: ID,
        match_id: ID,
        bey_a_id: ID,
        bey_b_id: ID,
    }

    public struct TurnResolved has copy, drop {
        round_id: ID,
        turn: u8,
        am_a: u64,
        am_b: u64,
        bi_a: u64,
        bi_b: u64,
    }

    public struct RoundFinished has copy, drop {
        round_id: ID,
        finish_type: u8,
        winner: address,
        points: u8,
    }

    public struct MatchCompleted has copy, drop {
        match_id: ID,
        winner: address,
        score_a: u8,
        score_b: u8,
    }

    // ===== Match Functions =====

    /// Create a new match between two players.
    public fun create_match(
        player_a: address,
        player_b: address,
        stadium_id: ID,
        deck_a: vector<ID>,
        deck_b: vector<ID>,
        ctx: &mut TxContext,
    ): Match {
        let match_obj = Match {
            id: object::new(ctx),
            player_a,
            player_b,
            score_a: 0,
            score_b: 0,
            stadium_id,
            rounds_played: 0,
            current_round_id: option::none(),
            deck_a,
            deck_b,
            used_a: vector[false, false, false],
            used_b: vector[false, false, false],
            state: STATE_BEY_SELECT,
        };

        event::emit(MatchCreated {
            match_id: object::id(&match_obj),
            player_a,
            player_b,
            stadium_id,
        });

        match_obj
    }

    /// Both players select their bey for the round.
    public fun select_bey(
        match_obj: &mut Match,
        bey_index_a: u64,
        bey_index_b: u64,
        am_a: u64,
        am_b: u64,
        burst_integrity_a: u64,
        burst_integrity_b: u64,
        lock_tightness_a: u8,
        lock_tightness_b: u8,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Round {
        assert!(match_obj.state == STATE_BEY_SELECT, EInvalidState);
        assert!(bey_index_a < vector::length(&match_obj.deck_a), EInvalidBeyIndex);
        assert!(bey_index_b < vector::length(&match_obj.deck_b), EInvalidBeyIndex);
        assert!(!*vector::borrow(&match_obj.used_a, bey_index_a), EBeyAlreadyUsed);
        assert!(!*vector::borrow(&match_obj.used_b, bey_index_b), EBeyAlreadyUsed);
        assert!(lock_tightness_a >= 1 && lock_tightness_a <= 5, EInvalidLockTightness);
        assert!(lock_tightness_b >= 1 && lock_tightness_b <= 5, EInvalidLockTightness);

        // Mark beys as used
        *vector::borrow_mut(&mut match_obj.used_a, bey_index_a) = true;
        *vector::borrow_mut(&mut match_obj.used_b, bey_index_b) = true;

        let bey_a_id = *vector::borrow(&match_obj.deck_a, bey_index_a);
        let bey_b_id = *vector::borrow(&match_obj.deck_b, bey_index_b);

        let deadline = sui::clock::timestamp_ms(clock) + COMMIT_DEADLINE_MS;

        let round = Round {
            id: object::new(ctx),
            match_id: object::id(match_obj),
            bey_a_id,
            bey_b_id,
            am_a,
            am_b,
            initial_am_a: am_a,
            initial_am_b: am_b,
            burst_integrity_a,
            burst_integrity_b,
            zone_a: 0, // Start at center
            zone_b: 0,
            lock_tightness_a,
            lock_tightness_b,
            turn: 0,
            wobble_a: 0,
            wobble_b: 0,
            commit_a: vector::empty(),
            commit_b: vector::empty(),
            state: ROUND_COMMIT,
            deadline,
        };

        match_obj.state = STATE_IN_ROUND;
        match_obj.current_round_id = option::some(object::id(&round));

        event::emit(RoundStarted {
            round_id: object::id(&round),
            match_id: object::id(match_obj),
            bey_a_id,
            bey_b_id,
        });

        round
    }

    // ===== Commit-Reveal =====

    /// Submit a hashed action commitment.
    public fun commit_action(
        round: &mut Round,
        player: address,
        match_obj: &Match,
        commitment: vector<u8>,
    ) {
        assert!(round.state == ROUND_COMMIT, EInvalidState);

        if (player == match_obj.player_a) {
            assert!(vector::is_empty(&round.commit_a), ECommitAlreadySubmitted);
            round.commit_a = commitment;
        } else if (player == match_obj.player_b) {
            assert!(vector::is_empty(&round.commit_b), ECommitAlreadySubmitted);
            round.commit_b = commitment;
        } else {
            abort ENotPlayer
        };

        // Both committed -> advance to reveal
        if (!vector::is_empty(&round.commit_a) && !vector::is_empty(&round.commit_b)) {
            round.state = ROUND_REVEAL;
        };
    }

    // ===== Turn Resolution =====

    /// Resolve a turn given revealed actions.
    /// zone_a, zone_b: target zones (0=Center, 1=Mid, 2=Wall, 3=Rail)
    /// damage_a_to_b, damage_b_to_a: pre-computed damage values
    /// recoil_a, recoil_b: self-damage values
    public fun resolve_turn(
        round: &mut Round,
        zone_a: u8,
        zone_b: u8,
        damage_a_to_b: u64,
        damage_b_to_a: u64,
        recoil_a: u64,
        recoil_b: u64,
        spin_decay_a: u64,
        spin_decay_b: u64,
        burst_loss_a: u64,
        burst_loss_b: u64,
    ) {
        assert!(round.state == ROUND_REVEAL, EInvalidState);

        // Update zones
        round.zone_a = zone_a;
        round.zone_b = zone_b;

        // Apply spin decay
        round.am_a = if (round.am_a > spin_decay_a) {
            round.am_a - spin_decay_a
        } else { 0 };
        round.am_b = if (round.am_b > spin_decay_b) {
            round.am_b - spin_decay_b
        } else { 0 };

        // Apply damage to AM
        round.am_b = if (round.am_b > damage_a_to_b) {
            round.am_b - damage_a_to_b
        } else { 0 };
        round.am_a = if (round.am_a > damage_b_to_a) {
            round.am_a - damage_b_to_a
        } else { 0 };

        // Apply recoil to AM
        round.am_a = if (round.am_a > recoil_a) {
            round.am_a - recoil_a
        } else { 0 };
        round.am_b = if (round.am_b > recoil_b) {
            round.am_b - recoil_b
        } else { 0 };

        // Apply burst integrity loss
        round.burst_integrity_a = if (round.burst_integrity_a > burst_loss_a) {
            round.burst_integrity_a - burst_loss_a
        } else { 0 };
        round.burst_integrity_b = if (round.burst_integrity_b > burst_loss_b) {
            round.burst_integrity_b - burst_loss_b
        } else { 0 };

        // Update wobble (death spin check)
        if (round.am_a * 5 < round.initial_am_a && round.am_a > 0) {
            round.wobble_a = round.wobble_a + 1;
        };
        if (round.am_b * 5 < round.initial_am_b && round.am_b > 0) {
            round.wobble_b = round.wobble_b + 1;
        };

        round.turn = round.turn + 1;

        // Reset commits for next turn
        round.commit_a = vector::empty();
        round.commit_b = vector::empty();
        round.state = ROUND_COMMIT;

        event::emit(TurnResolved {
            round_id: object::id(round),
            turn: round.turn,
            am_a: round.am_a,
            am_b: round.am_b,
            bi_a: round.burst_integrity_a,
            bi_b: round.burst_integrity_b,
        });
    }

    // ===== Win Check =====

    /// Check win conditions. Returns (is_round_over, finish_type, winner_is_a, points).
    public fun check_win(
        round: &Round,
        match_obj: &Match,
    ): (bool, u8, bool, u8) {
        // Burst finish check (priority: burst > spin)
        if (round.burst_integrity_b == 0 && round.burst_integrity_a > 0) {
            return (true, FINISH_BURST, true, 2)
        };
        if (round.burst_integrity_a == 0 && round.burst_integrity_b > 0) {
            return (true, FINISH_BURST, false, 2)
        };

        // Spin finish check
        if (round.am_b == 0 && round.am_a > 0) {
            return (true, FINISH_SPIN, true, 1)
        };
        if (round.am_a == 0 && round.am_b > 0) {
            return (true, FINISH_SPIN, false, 1)
        };

        // Double KO: draw (no points)
        if (round.am_a == 0 && round.am_b == 0) {
            return (true, FINISH_SPIN, true, 0)
        };
        if (round.burst_integrity_a == 0 && round.burst_integrity_b == 0) {
            return (true, FINISH_BURST, true, 0)
        };

        // Round continues
        let _ = match_obj;
        (false, 0, true, 0)
    }

    /// Apply round result to match score. Returns true if match is over.
    public fun apply_round_result(
        match_obj: &mut Match,
        winner_is_a: bool,
        points: u8,
    ): bool {
        if (points > 0) {
            if (winner_is_a) {
                match_obj.score_a = match_obj.score_a + points;
            } else {
                match_obj.score_b = match_obj.score_b + points;
            };
        };

        match_obj.rounds_played = match_obj.rounds_played + 1;
        match_obj.current_round_id = option::none();

        // Check if match is complete
        if (match_obj.score_a >= WIN_SCORE || match_obj.score_b >= WIN_SCORE) {
            match_obj.state = STATE_COMPLETE;
            let winner = if (match_obj.score_a >= WIN_SCORE) {
                match_obj.player_a
            } else {
                match_obj.player_b
            };
            event::emit(MatchCompleted {
                match_id: object::id(match_obj),
                winner,
                score_a: match_obj.score_a,
                score_b: match_obj.score_b,
            });
            true
        } else {
            match_obj.state = STATE_BEY_SELECT;
            false
        }
    }

    // ===== Scoring Helper =====

    public fun finish_points(finish_type: u8): u8 {
        if (finish_type == FINISH_SPIN) { 1 }
        else if (finish_type == FINISH_OVER) { 2 }
        else if (finish_type == FINISH_BURST) { 2 }
        else if (finish_type == FINISH_XTREME) { 3 }
        else { 0 }
    }

    // ===== Getters =====

    public fun match_id(m: &Match): ID { object::id(m) }
    public fun player_a(m: &Match): address { m.player_a }
    public fun player_b(m: &Match): address { m.player_b }
    public fun score_a(m: &Match): u8 { m.score_a }
    public fun score_b(m: &Match): u8 { m.score_b }
    public fun match_state(m: &Match): u8 { m.state }
    public fun rounds_played(m: &Match): u8 { m.rounds_played }

    public fun round_am_a(r: &Round): u64 { r.am_a }
    public fun round_am_b(r: &Round): u64 { r.am_b }
    public fun round_bi_a(r: &Round): u64 { r.burst_integrity_a }
    public fun round_bi_b(r: &Round): u64 { r.burst_integrity_b }
    public fun round_turn(r: &Round): u8 { r.turn }
    public fun round_state(r: &Round): u8 { r.state }
    public fun round_zone_a(r: &Round): u8 { r.zone_a }
    public fun round_zone_b(r: &Round): u8 { r.zone_b }
    public fun round_wobble_a(r: &Round): u8 { r.wobble_a }
    public fun round_wobble_b(r: &Round): u8 { r.wobble_b }

    // ===== Test Helpers =====

    #[test_only]
    public fun destroy_match(m: Match) {
        let Match { id, .. } = m;
        object::delete(id);
    }

    #[test_only]
    public fun destroy_round(r: Round) {
        let Round { id, .. } = r;
        object::delete(id);
    }

    #[test_only]
    public fun set_round_state_for_testing(round: &mut Round, state: u8) {
        round.state = state;
    }
}
