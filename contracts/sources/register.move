module spinforge::register {
    use std::string::String;
    use sui::event;
    use spinforge::blade;
    use spinforge::ratchet;
    use spinforge::bit;
    use spinforge::bey;
    use spinforge::admin::{Self, AdminCap, GameConfig};

    /// Recipient is on the GameConfig ban list. (M-1)
    const EPlayerBanned: u64 = 0;

    public struct RotorRegistered has copy, drop {
        bey_id: ID,
        owner: address,
    }

    /// Web2-hybrid: a rotor registered by the platform relay. The Bey is owned
    /// on-chain by the platform custody (ctx.sender()); Postgres attributes it to
    /// the user via `recipient_subject` + `operation_id`.
    public struct RotorRegisteredFor has copy, drop {
        bey_id: ID,
        custody: address,
        recipient_subject: address,
        operation_id: vector<u8>,
    }

    entry fun register_rotor(
        _admin: &AdminCap,
        config: &GameConfig,
        blade_name: String,
        spirit_beast: u8,
        bey_type: u8,
        spin_direction: u8,
        ratchet_prongs: u8,
        ratchet_height: u8,
        bit_name: String,
        bit_category: u8,
        rotor_name: String,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        // M-1: banned recipients cannot be granted free rotors.
        assert!(!admin::is_banned(config, recipient), EPlayerBanned);
        let b = blade::mint(blade_name, spirit_beast, bey_type, spin_direction, 70, 30, 1, ctx);
        let r = ratchet::mint(ratchet_prongs, ratchet_height, 120, 300, 1, ctx);
        let bt = bit::mint(bit_name, bit_category, 40, 3, 0, false, 1, ctx);
        let assembled = bey::assemble(b, r, bt, rotor_name, ctx);

        event::emit(RotorRegistered {
            bey_id: bey::id(&assembled),
            owner: recipient,
        });

        transfer::public_transfer(assembled, recipient);
    }

    /// Web2-hybrid relay entry: register a rotor whose Bey is owned by the
    /// platform custody (ctx.sender()). The ban check is enforced off-chain at the
    /// API layer against the session user, so it is NOT applied to the custody
    /// address here. Postgres attributes the Bey via `recipient_subject` +
    /// `operation_id` (carried in the event).
    entry fun register_rotor_for(
        _admin: &AdminCap,
        _config: &GameConfig,
        recipient_subject: address,
        _operation_id: vector<u8>,
        blade_name: String,
        spirit_beast: u8,
        bey_type: u8,
        spin_direction: u8,
        ratchet_prongs: u8,
        ratchet_height: u8,
        bit_name: String,
        bit_category: u8,
        rotor_name: String,
        ctx: &mut TxContext,
    ) {
        let b = blade::mint(blade_name, spirit_beast, bey_type, spin_direction, 70, 30, 1, ctx);
        let r = ratchet::mint(ratchet_prongs, ratchet_height, 120, 300, 1, ctx);
        let bt = bit::mint(bit_name, bit_category, 40, 3, 0, false, 1, ctx);
        let assembled = bey::assemble(b, r, bt, rotor_name, ctx);

        event::emit(RotorRegisteredFor {
            bey_id: bey::id(&assembled),
            custody: ctx.sender(),
            recipient_subject,
            operation_id: _operation_id,
        });

        // Bey mints to the platform custody (ctx.sender()).
        transfer::public_transfer(assembled, ctx.sender());
    }
}
