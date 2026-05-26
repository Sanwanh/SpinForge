//! In-memory battle room manager.
//!
//! Each active match gets a `BattleRoom` that tracks connected players,
//! commit/reveal state, and provides a broadcast channel for real-time
//! message relay.

use std::collections::{HashMap, HashSet};
use tokio::sync::broadcast;

use crate::ws::handler::verify_reveal;

/// Message types that flow through the broadcast channel.
#[derive(Debug, Clone)]
pub enum RoomMessage {
    Text(String),
    Close,
}

/// State for a single battle room.
pub struct BattleRoom {
    /// Connected player addresses.
    players: HashSet<String>,
    /// Broadcast sender — all subscribers receive every message.
    tx: broadcast::Sender<RoomMessage>,
    /// Commit hashes: player_address -> hash.
    commits: HashMap<String, String>,
    /// Revealed zones: player_address -> zone.
    reveals: HashMap<String, u8>,
    /// Current turn counter (incremented after each resolution).
    turn: u8,
}

impl BattleRoom {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(256);
        Self {
            players: HashSet::new(),
            tx,
            commits: HashMap::new(),
            reveals: HashMap::new(),
            turn: 1,
        }
    }

    pub fn add_player(&mut self, address: &str) {
        self.players.insert(address.to_string());
    }

    pub fn remove_player(&mut self, address: &str) {
        self.players.remove(address);
    }

    pub fn player_count(&self) -> usize {
        self.players.len()
    }

    pub fn is_empty(&self) -> bool {
        self.players.is_empty()
    }

    /// Subscribe to room broadcasts. Returns a receiver.
    pub fn subscribe(&self) -> broadcast::Receiver<RoomMessage> {
        self.tx.subscribe()
    }

    /// Broadcast a message to all connected players.
    pub fn broadcast(&self, msg: RoomMessage) -> Result<usize, broadcast::error::SendError<RoomMessage>> {
        self.tx.send(msg)
    }

    // -----------------------------------------------------------------------
    // Commit-reveal protocol
    // -----------------------------------------------------------------------

    /// Record a commit hash from a player.
    pub fn record_commit(&mut self, player: &str, hash: &str) {
        self.commits.insert(player.to_string(), hash.to_string());
    }

    /// Check whether both players have submitted their commit.
    pub fn both_committed(&self) -> bool {
        self.players.len() == 2 && self.commits.len() == 2
    }

    /// Verify the reveal against the stored commit and record it.
    /// Returns `true` if the reveal is valid.
    pub fn verify_and_record_reveal(&mut self, player: &str, zone: u8, nonce: &str) -> bool {
        let commit_hash = match self.commits.get(player) {
            Some(h) => h.clone(),
            None => return false,
        };

        if !verify_reveal(&commit_hash, zone, nonce) {
            return false;
        }

        self.reveals.insert(player.to_string(), zone);
        true
    }

    /// Check whether both players have revealed.
    pub fn both_revealed(&self) -> bool {
        self.players.len() == 2 && self.reveals.len() == 2
    }

    /// Get the revealed zones for both players. Returns `None` if not both revealed.
    pub fn get_reveals(&self) -> Option<((&str, u8), (&str, u8))> {
        if self.reveals.len() != 2 {
            return None;
        }

        let mut iter = self.reveals.iter();
        let (a_addr, a_zone) = iter.next()?;
        let (b_addr, b_zone) = iter.next()?;

        Some((
            (a_addr.as_str(), *a_zone),
            (b_addr.as_str(), *b_zone),
        ))
    }

    /// Advance to the next turn, clearing commit/reveal state.
    pub fn advance_turn(&mut self) {
        self.commits.clear();
        self.reveals.clear();
        self.turn += 1;
    }

    pub fn current_turn(&self) -> u8 {
        self.turn
    }
}

/// Manages all active battle rooms, keyed by match_id.
pub struct RoomManager {
    rooms: HashMap<String, BattleRoom>,
}

impl RoomManager {
    pub fn new() -> Self {
        Self {
            rooms: HashMap::new(),
        }
    }

    /// Get an existing room or create a new one for the given match_id.
    pub fn get_or_create(&mut self, match_id: &str) -> &mut BattleRoom {
        self.rooms
            .entry(match_id.to_string())
            .or_insert_with(BattleRoom::new)
    }

    pub fn get(&self, match_id: &str) -> Option<&BattleRoom> {
        self.rooms.get(match_id)
    }

    pub fn get_mut(&mut self, match_id: &str) -> Option<&mut BattleRoom> {
        self.rooms.get_mut(match_id)
    }

    pub fn remove(&mut self, match_id: &str) -> Option<BattleRoom> {
        self.rooms.remove(match_id)
    }

    pub fn active_room_count(&self) -> usize {
        self.rooms.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ws::handler::compute_commit_hash;

    #[test]
    fn room_lifecycle() {
        let mut manager = RoomManager::new();
        assert_eq!(manager.active_room_count(), 0);

        let room = manager.get_or_create("match_1");
        room.add_player("alice");
        room.add_player("bob");
        assert_eq!(room.player_count(), 2);

        assert_eq!(manager.active_room_count(), 1);
    }

    #[test]
    fn commit_reveal_flow() {
        let mut room = BattleRoom::new();
        room.add_player("alice");
        room.add_player("bob");

        let alice_hash = compute_commit_hash(1, "alice_nonce");
        let bob_hash = compute_commit_hash(2, "bob_nonce");

        room.record_commit("alice", &alice_hash);
        assert!(!room.both_committed());

        room.record_commit("bob", &bob_hash);
        assert!(room.both_committed());

        assert!(room.verify_and_record_reveal("alice", 1, "alice_nonce"));
        assert!(!room.both_revealed());

        assert!(room.verify_and_record_reveal("bob", 2, "bob_nonce"));
        assert!(room.both_revealed());

        // Verify reveals.
        let reveals = room.get_reveals().unwrap();
        assert_eq!(room.current_turn(), 1);

        room.advance_turn();
        assert_eq!(room.current_turn(), 2);
        assert!(!room.both_committed());
        assert!(!room.both_revealed());
    }

    #[test]
    fn invalid_reveal_rejected() {
        let mut room = BattleRoom::new();
        room.add_player("alice");

        let hash = compute_commit_hash(1, "correct_nonce");
        room.record_commit("alice", &hash);

        // Wrong zone.
        assert!(!room.verify_and_record_reveal("alice", 2, "correct_nonce"));
        // Wrong nonce.
        assert!(!room.verify_and_record_reveal("alice", 1, "wrong_nonce"));
        // Correct.
        assert!(room.verify_and_record_reveal("alice", 1, "correct_nonce"));
    }

    #[test]
    fn room_removal_on_empty() {
        let mut manager = RoomManager::new();
        let room = manager.get_or_create("match_1");
        room.add_player("alice");
        room.remove_player("alice");
        assert!(room.is_empty());

        manager.remove("match_1");
        assert_eq!(manager.active_room_count(), 0);
    }
}
