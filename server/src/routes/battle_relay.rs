use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

use crate::ws::{handler::authenticate_player, rooms::RoomMessage};
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/api/battle/ws", get(ws_upgrade))
}

/// WebSocket upgrade handler.
///
/// Query params: `?match_id=<uuid>&player=<address>&token=<signature>`
async fn ws_upgrade(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<WsConnectParams>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state, params))
}

#[derive(Debug, Deserialize)]
pub struct WsConnectParams {
    pub match_id: String,
    pub player: String,
    pub token: String,
}

/// Inbound message types from clients during a battle.
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    /// Commit phase: player sends hash(zone_choice + nonce).
    Commit { hash: String },
    /// Reveal phase: player sends plaintext zone_choice + nonce.
    Reveal { zone: u8, nonce: String },
    /// Technique card played.
    PlayCard { card_id: String },
    /// Spirit beast activation.
    ActivateSpirit,
    /// Heartbeat / keep-alive.
    Ping,
}

/// Outbound message types broadcast to battle room participants.
#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type")]
pub enum ServerMessage {
    /// Confirm player joined the room.
    Joined { player: String, players_in_room: usize },
    /// Both commits received — prompt reveal.
    CommitsReady,
    /// Round result after resolution.
    RoundResult {
        turn: u8,
        am_a: u64,
        am_b: u64,
        damage_a: u64,
        damage_b: u64,
        finish: Option<String>,
        points: Option<u8>,
    },
    /// Match completed.
    MatchComplete { winner: String, score_a: u8, score_b: u8 },
    /// Error message.
    Error { message: String },
    /// Heartbeat response.
    Pong,
}

// ---------------------------------------------------------------------------
// Socket lifecycle
// ---------------------------------------------------------------------------

async fn handle_socket(socket: WebSocket, state: AppState, params: WsConnectParams) {
    let (mut ws_sink, mut ws_stream) = socket.split();

    // Authenticate the player (signature verification placeholder).
    if !authenticate_player(&params.player, &params.token).await {
        let err = ServerMessage::Error {
            message: "Authentication failed".into(),
        };
        let _ = ws_sink
            .send(Message::Text(serde_json::to_string(&err).unwrap().into()))
            .await;
        return;
    }

    // Join or create the battle room.
    let rx = {
        let mut rooms = state.rooms.write().await;
        let room = rooms.get_or_create(&params.match_id);
        room.add_player(&params.player);

        let joined = ServerMessage::Joined {
            player: params.player.clone(),
            players_in_room: room.player_count(),
        };
        let _ = room.broadcast(RoomMessage::Text(serde_json::to_string(&joined).unwrap()));

        room.subscribe()
    };

    let match_id = params.match_id.clone();
    let player = params.player.clone();

    // Spawn a task to forward broadcast messages to this client's WebSocket.
    let mut rx = rx;
    let forward_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            match msg {
                RoomMessage::Text(text) => {
                    if ws_sink.send(Message::Text(text.into())).await.is_err() {
                        break;
                    }
                }
                RoomMessage::Close => {
                    let _ = ws_sink.close().await;
                    break;
                }
            }
        }
    });

    // Read inbound messages from this client.
    while let Some(Ok(msg)) = ws_stream.next().await {
        match msg {
            Message::Text(text) => {
                let parsed: Result<ClientMessage, _> = serde_json::from_str(&text);
                match parsed {
                    Ok(client_msg) => {
                        handle_client_message(
                            &state,
                            &match_id,
                            &player,
                            client_msg,
                        )
                        .await;
                    }
                    Err(e) => {
                        tracing::warn!(error = %e, "Invalid WebSocket message from {}", player);
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    // Cleanup: remove player from room.
    {
        let mut rooms = state.rooms.write().await;
        if let Some(room) = rooms.get_mut(&match_id) {
            room.remove_player(&player);
            if room.is_empty() {
                rooms.remove(&match_id);
            }
        }
    }

    forward_task.abort();
    tracing::info!(player = %player, match_id = %match_id, "Player disconnected from battle");
}

// ---------------------------------------------------------------------------
// Message dispatch
// ---------------------------------------------------------------------------

async fn handle_client_message(
    state: &AppState,
    match_id: &str,
    player: &str,
    msg: ClientMessage,
) {
    match msg {
        ClientMessage::Commit { hash } => {
            tracing::debug!(player = %player, match_id = %match_id, "Commit received");

            let mut rooms = state.rooms.write().await;
            if let Some(room) = rooms.get_mut(match_id) {
                room.record_commit(player, &hash);

                if room.both_committed() {
                    let ready = ServerMessage::CommitsReady;
                    let _ = room.broadcast(RoomMessage::Text(
                        serde_json::to_string(&ready).unwrap(),
                    ));
                }
            }
        }
        ClientMessage::Reveal { zone, nonce } => {
            tracing::debug!(player = %player, zone = zone, "Reveal received");

            let mut rooms = state.rooms.write().await;
            if let Some(room) = rooms.get_mut(match_id) {
                let valid = room.verify_and_record_reveal(player, zone, &nonce);
                if !valid {
                    let err = ServerMessage::Error {
                        message: "Reveal does not match commit".into(),
                    };
                    let _ = room.broadcast(RoomMessage::Text(
                        serde_json::to_string(&err).unwrap(),
                    ));
                    return;
                }

                // If both reveals are in, trigger round resolution.
                if room.both_revealed() {
                    // Round resolution would call on-chain or local physics here.
                    // For now, broadcast a placeholder result.
                    let result = ServerMessage::RoundResult {
                        turn: room.current_turn(),
                        am_a: 0,
                        am_b: 0,
                        damage_a: 0,
                        damage_b: 0,
                        finish: None,
                        points: None,
                    };
                    let _ = room.broadcast(RoomMessage::Text(
                        serde_json::to_string(&result).unwrap(),
                    ));
                    room.advance_turn();
                }
            }
        }
        ClientMessage::PlayCard { card_id } => {
            tracing::debug!(player = %player, card_id = %card_id, "Card played");
        }
        ClientMessage::ActivateSpirit => {
            tracing::debug!(player = %player, "Spirit activated");
        }
        ClientMessage::Ping => {
            let rooms = state.rooms.read().await;
            if let Some(room) = rooms.get(match_id) {
                let _ = room.broadcast(RoomMessage::Text(
                    serde_json::to_string(&ServerMessage::Pong).unwrap(),
                ));
            }
        }
    }
}
