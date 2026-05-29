module spinforge::bey {
    use std::string::String;
    use sui::dynamic_object_field as dof;
    use sui::event;
    use spinforge::blade::Blade;
    use spinforge::ratchet::Ratchet;
    use spinforge::bit::Bit;

    // ===== Struct =====

    public struct Bey has key, store {
        id: UID,
        name: String,
        wins: u32,
        losses: u32,
        xtreme_finishes: u32,
        burst_finishes: u32,
    }

    // ===== Events =====

    public struct BeyAssembled has copy, drop {
        bey_id: ID,
        name: String,
        owner: address,
    }

    public struct BeyDisassembled has copy, drop {
        bey_id: ID,
        owner: address,
    }

    // ===== Assembly / Disassembly =====

    public fun assemble(
        blade: Blade,
        ratchet: Ratchet,
        bit: Bit,
        name: String,
        ctx: &mut TxContext,
    ): Bey {
        let mut bey = Bey {
            id: object::new(ctx),
            name,
            wins: 0,
            losses: 0,
            xtreme_finishes: 0,
            burst_finishes: 0,
        };
        dof::add(&mut bey.id, b"blade", blade);
        dof::add(&mut bey.id, b"ratchet", ratchet);
        dof::add(&mut bey.id, b"bit", bit);

        event::emit(BeyAssembled {
            bey_id: object::id(&bey),
            name: bey.name,
            owner: ctx.sender(),
        });

        bey
    }

    public fun disassemble(bey: Bey, ctx: &TxContext): (Blade, Ratchet, Bit) {
        event::emit(BeyDisassembled {
            bey_id: object::id(&bey),
            owner: ctx.sender(),
        });

        let Bey { mut id, .. } = bey;
        let blade: Blade = dof::remove(&mut id, b"blade");
        let ratchet: Ratchet = dof::remove(&mut id, b"ratchet");
        let bit: Bit = dof::remove(&mut id, b"bit");
        object::delete(id);
        (blade, ratchet, bit)
    }

    // ===== Stat Update =====
    // `public(package)` only: PTB `moveCall` cannot target package-visible
    // functions, so a Bey owner cannot self-inflate stats. Only an in-package
    // (AdminCap-gated) battle-settlement flow may record results. (H-3)

    public(package) fun record_win(bey: &mut Bey) {
        bey.wins = bey.wins + 1;
    }

    public(package) fun record_loss(bey: &mut Bey) {
        bey.losses = bey.losses + 1;
    }

    public(package) fun record_xtreme_finish(bey: &mut Bey) {
        bey.xtreme_finishes = bey.xtreme_finishes + 1;
    }

    public(package) fun record_burst_finish(bey: &mut Bey) {
        bey.burst_finishes = bey.burst_finishes + 1;
    }

    // ===== Getters =====

    public fun id(bey: &Bey): ID { object::id(bey) }
    public fun name(bey: &Bey): String { bey.name }
    public fun wins(bey: &Bey): u32 { bey.wins }
    public fun losses(bey: &Bey): u32 { bey.losses }
    public fun xtreme_finishes(bey: &Bey): u32 { bey.xtreme_finishes }
    public fun burst_finishes(bey: &Bey): u32 { bey.burst_finishes }

    /// Borrow the Blade child object.
    public fun borrow_blade(bey: &Bey): &Blade {
        dof::borrow(&bey.id, b"blade")
    }

    /// Borrow the Ratchet child object.
    public fun borrow_ratchet(bey: &Bey): &Ratchet {
        dof::borrow(&bey.id, b"ratchet")
    }

    /// Borrow the Bit child object.
    public fun borrow_bit(bey: &Bey): &Bit {
        dof::borrow(&bey.id, b"bit")
    }

    // ===== Test Helpers =====

    #[test_only]
    public fun destroy_for_testing(bey: Bey) {
        let Bey { id, .. } = bey;
        // Note: child objects must be removed before destroying
        object::delete(id);
    }
}
