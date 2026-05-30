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
}
