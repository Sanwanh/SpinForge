//! WebSocket authentication and utility functions.

use sha2::{Digest, Sha256};

/// Authenticate a player by verifying their signature.
///
/// In production this would verify a Sui wallet signature over a challenge
/// nonce. For the scaffold, we accept any non-empty token.
pub async fn authenticate_player(address: &str, token: &str) -> bool {
    if address.is_empty() || token.is_empty() {
        return false;
    }

    // TODO: Implement Sui signature verification.
    // 1. Retrieve or generate a challenge nonce for this address.
    // 2. Verify `token` is a valid Ed25519/Secp256k1 signature over the nonce.
    // 3. Recover the signer's address and compare to `address`.
    //
    // Placeholder: accept any non-empty token during development.
    tracing::debug!(address = %address, "Player authentication (stub) — accepted");
    true
}

/// Compute SHA-256 hash for commit-reveal verification.
///
/// The commit is `hash(zone || nonce)` and the reveal provides
/// the plaintext zone + nonce for server-side verification.
pub fn compute_commit_hash(zone: u8, nonce: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update([zone]);
    hasher.update(nonce.as_bytes());
    hex::encode(hasher.finalize())
}

/// Verify that a reveal matches the previously submitted commit hash.
pub fn verify_reveal(commit_hash: &str, zone: u8, nonce: &str) -> bool {
    let expected = compute_commit_hash(zone, nonce);
    // Constant-time comparison to prevent timing attacks.
    constant_time_eq(commit_hash.as_bytes(), expected.as_bytes())
}

/// Constant-time byte comparison.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn commit_reveal_roundtrip() {
        let zone = 2u8;
        let nonce = "random_nonce_123";
        let hash = compute_commit_hash(zone, nonce);

        assert!(verify_reveal(&hash, zone, nonce));
        assert!(!verify_reveal(&hash, 3, nonce)); // wrong zone
        assert!(!verify_reveal(&hash, zone, "wrong_nonce")); // wrong nonce
    }

    #[test]
    fn empty_credentials_rejected() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        assert!(!rt.block_on(authenticate_player("", "token")));
        assert!(!rt.block_on(authenticate_player("addr", "")));
    }
}
