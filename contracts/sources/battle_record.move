module spinforge::battle_record {
    use sui::event;
    use spinforge::admin::AdminCap;

    const ENotParticipant: u64 = 0;
    const EAlreadyConfirmed: u64 = 1;
    const ENotConfirmed: u64 = 2;

    public struct BattleRecord has key, store {
        id: UID,
        player_a: address,
        player_b: address,
        rotor_a: ID,
        rotor_b: ID,
        winner: address,
        finish_type: u8,
        score_a: u8,
        score_b: u8,
        confirmed_by_a: bool,
        confirmed_by_b: bool,
        committed: bool,
        timestamp: u64,
    }

    public struct BattleRecordCreated has copy, drop {
        record_id: ID,
        player_a: address,
        player_b: address,
    }

    public struct BattleRecordConfirmed has copy, drop {
        record_id: ID,
        confirmer: address,
    }

    public struct BattleRecordCommitted has copy, drop {
        record_id: ID,
        winner: address,
        finish_type: u8,
        score_a: u8,
        score_b: u8,
    }

    // H-4: gated by &AdminCap so only the backend (which has already verified
    // the submitter is a participant via wallet signature at the API layer) can
    // mint a BattleRecord. Arbitrary players can no longer forge records in
    // their own PTBs. Off-chain consumers must still trust only is_committed().
    public fun create(
        _admin: &AdminCap,
        player_a: address,
        player_b: address,
        rotor_a: ID,
        rotor_b: ID,
        winner: address,
        finish_type: u8,
        score_a: u8,
        score_b: u8,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext,
    ): BattleRecord {
        let record = BattleRecord {
            id: object::new(ctx),
            player_a,
            player_b,
            rotor_a,
            rotor_b,
            winner,
            finish_type,
            score_a,
            score_b,
            confirmed_by_a: false,
            confirmed_by_b: false,
            committed: false,
            timestamp: sui::clock::timestamp_ms(clock),
        };

        event::emit(BattleRecordCreated {
            record_id: object::id(&record),
            player_a,
            player_b,
        });

        record
    }

    public fun confirm(
        record: &mut BattleRecord,
        ctx: &TxContext,
    ) {
        let sender = ctx.sender();
        assert!(
            sender == record.player_a || sender == record.player_b,
            ENotParticipant,
        );

        if (sender == record.player_a) {
            assert!(!record.confirmed_by_a, EAlreadyConfirmed);
            record.confirmed_by_a = true;
        } else {
            assert!(!record.confirmed_by_b, EAlreadyConfirmed);
            record.confirmed_by_b = true;
        };

        event::emit(BattleRecordConfirmed {
            record_id: object::id(record),
            confirmer: sender,
        });

        if (record.confirmed_by_a && record.confirmed_by_b) {
            record.committed = true;
            event::emit(BattleRecordCommitted {
                record_id: object::id(record),
                winner: record.winner,
                finish_type: record.finish_type,
                score_a: record.score_a,
                score_b: record.score_b,
            });
        };
    }

    public fun is_committed(record: &BattleRecord): bool { record.committed }
    public fun winner(record: &BattleRecord): address { record.winner }
    public fun player_a(record: &BattleRecord): address { record.player_a }
    public fun player_b(record: &BattleRecord): address { record.player_b }
    public fun score_a(record: &BattleRecord): u8 { record.score_a }
    public fun score_b(record: &BattleRecord): u8 { record.score_b }
    public fun finish_type(record: &BattleRecord): u8 { record.finish_type }

    #[test_only]
    public fun destroy_for_testing(record: BattleRecord) {
        let BattleRecord { id, .. } = record;
        object::delete(id);
    }
}
