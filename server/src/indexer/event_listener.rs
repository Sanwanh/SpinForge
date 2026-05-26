//! Sui event indexer — subscribes to on-chain SpinForge events and dispatches
//! them to the appropriate processor for database persistence.
//!
//! Runs as a long-lived background task spawned from `main`.

use anyhow::{Context, Result};
use serde::Deserialize;
use sqlx::PgPool;

use super::processors;

/// Known SpinForge event types emitted by the Move contracts.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SpinForgeEvent {
    MatchCompleted(MatchCompletedData),
    RoundResolved(RoundResolvedData),
    XtremeDashTriggered(XtremeDashData),
    BurstTriggered(BurstData),
    SpinStealOccurred(SpinStealData),
    PartForged(PartForgedData),
    SpiritAvatarMinted(SpiritAvatarData),
}

// ---------------------------------------------------------------------------
// Event data structures (deserialized from Sui event JSON)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct MatchCompletedData {
    pub match_id: String,
    pub player_a: String,
    pub player_b: String,
    pub score_a: u8,
    pub score_b: u8,
    pub winner: String,
    pub stadium_id: String,
    pub rounds_played: u8,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct RoundResolvedData {
    pub match_id: String,
    pub round_number: u8,
    pub bey_a_id: String,
    pub bey_b_id: String,
    pub finish_type: String,
    pub points: u8,
    pub turn_count: u8,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct XtremeDashData {
    pub match_id: String,
    pub round_number: u8,
    pub attacker: String,
    pub gear_rating: u8,
    pub hit: bool,
    pub damage: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct BurstData {
    pub match_id: String,
    pub round_number: u8,
    pub victim: String,
    pub burst_integrity_remaining: u64,
    pub impact_force: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct SpinStealData {
    pub match_id: String,
    pub round_number: u8,
    pub stealer: String,
    pub amount: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct PartForgedData {
    pub player: String,
    pub part_type: String,
    pub part_id: String,
    pub rarity: u8,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct SpiritAvatarData {
    pub player: String,
    pub beast: u8,
    pub tier: u8,
}

// ---------------------------------------------------------------------------
// The SpinForge contract package ID. In production, load from config.
// ---------------------------------------------------------------------------

const SPINFORGE_PACKAGE: &str = "0x0000000000000000000000000000000000000000000000000000000000000000";

// ---------------------------------------------------------------------------
// Main event loop
// ---------------------------------------------------------------------------

/// Subscribe to Sui events and dispatch to processors.
///
/// This function runs indefinitely. On transient failures it will log and
/// retry after a backoff delay.
pub async fn run(db: PgPool, rpc_url: &str) -> Result<()> {
    tracing::info!(rpc = %rpc_url, "Starting Sui event indexer");

    let mut backoff_secs = 1u64;
    let max_backoff_secs = 60u64;

    loop {
        match subscribe_and_process(&db, rpc_url).await {
            Ok(()) => {
                // Clean exit (shouldn't happen unless the node shuts down).
                tracing::warn!("Event subscription ended cleanly — restarting");
                backoff_secs = 1;
            }
            Err(e) => {
                tracing::error!(
                    error = %e,
                    backoff_secs = backoff_secs,
                    "Event indexer error — retrying"
                );
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(backoff_secs)).await;
        backoff_secs = (backoff_secs * 2).min(max_backoff_secs);
    }
}

/// Inner loop: connect to Sui, subscribe to events, and dispatch.
async fn subscribe_and_process(db: &PgPool, rpc_url: &str) -> Result<()> {
    // Build the Sui client.
    let sui = sui_sdk::SuiClientBuilder::default()
        .build(rpc_url)
        .await
        .context("Failed to connect to Sui RPC")?;

    // Build an event filter for the SpinForge package.
    let filter = sui_sdk::rpc_types::EventFilter::Package(
        SPINFORGE_PACKAGE.parse().context("Invalid package ID")?,
    );

    // Subscribe to real-time events via WebSocket.
    let mut subscription = sui
        .event_api()
        .subscribe_event(filter)
        .await
        .context("Failed to subscribe to Sui events")?;

    tracing::info!("Subscribed to SpinForge events");

    // Process incoming events.
    while let Some(event) = subscription.next().await {
        let event = event.context("Event stream error")?;

        let event_type_str = event.type_.to_string();
        let json_value = event.parsed_json;

        let result = dispatch_event(db, &event_type_str, &json_value).await;
        if let Err(e) = result {
            tracing::error!(
                error = %e,
                event_type = %event_type_str,
                "Failed to process event"
            );
        }
    }

    Ok(())
}

/// Route an event to the correct processor based on its Move type name.
async fn dispatch_event(
    db: &PgPool,
    event_type: &str,
    json: &serde_json::Value,
) -> Result<()> {
    // The full event type is like `<package>::battle::MatchCompleted`.
    // We match on the suffix.
    if event_type.ends_with("::MatchCompleted") {
        let data: MatchCompletedData = serde_json::from_value(json.clone())
            .context("Failed to parse MatchCompleted")?;
        processors::process_match_completed(db, data).await?;
    } else if event_type.ends_with("::RoundResolved") {
        let data: RoundResolvedData = serde_json::from_value(json.clone())
            .context("Failed to parse RoundResolved")?;
        processors::process_round_resolved(db, data).await?;
    } else if event_type.ends_with("::XtremeDashTriggered") {
        let data: XtremeDashData = serde_json::from_value(json.clone())
            .context("Failed to parse XtremeDashTriggered")?;
        processors::process_xtreme_dash(db, data).await?;
    } else if event_type.ends_with("::BurstTriggered") {
        let data: BurstData = serde_json::from_value(json.clone())
            .context("Failed to parse BurstTriggered")?;
        processors::process_burst(db, data).await?;
    } else if event_type.ends_with("::SpinStealOccurred") {
        let data: SpinStealData = serde_json::from_value(json.clone())
            .context("Failed to parse SpinStealOccurred")?;
        processors::process_spin_steal(db, data).await?;
    } else if event_type.ends_with("::PartForged") {
        let data: PartForgedData = serde_json::from_value(json.clone())
            .context("Failed to parse PartForged")?;
        processors::process_part_forged(db, data).await?;
    } else if event_type.ends_with("::SpiritAvatarMinted") {
        let data: SpiritAvatarData = serde_json::from_value(json.clone())
            .context("Failed to parse SpiritAvatarMinted")?;
        processors::process_spirit_avatar_minted(db, data).await?;
    } else {
        tracing::debug!(event_type = %event_type, "Unrecognized event — skipping");
    }

    Ok(())
}
