mod db;
mod indexer;
mod routes;
mod ws;

use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::Context;
use axum::Router;
use redis::aio::ConnectionManager;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::ws::rooms::RoomManager;

/// Shared application state passed to every handler via axum's `State` extractor.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: ConnectionManager,
    pub sui_rpc_url: String,
    pub rooms: Arc<RwLock<RoomManager>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env file (non-fatal if missing — production uses real env vars).
    let _ = dotenvy::dotenv();

    // Structured logging via tracing.
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "spinforge_server=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // PostgreSQL connection pool.
    let database_url = std::env::var("DATABASE_URL")
        .context("DATABASE_URL must be set")?;
    let db = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await
        .context("Failed to connect to PostgreSQL")?;

    tracing::info!("Connected to PostgreSQL");

    // Run migrations embedded in the binary (sqlx migrate).
    sqlx::migrate!("./src/db/migrations")
        .run(&db)
        .await
        .context("Failed to run database migrations")?;

    tracing::info!("Database migrations applied");

    // Redis connection manager (auto-reconnect).
    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://localhost:6379".to_string());
    let redis_client = redis::Client::open(redis_url.as_str())
        .context("Invalid REDIS_URL")?;
    let redis = ConnectionManager::new(redis_client)
        .await
        .context("Failed to connect to Redis")?;

    tracing::info!("Connected to Redis");

    // Sui RPC URL for the indexer.
    let sui_rpc_url = std::env::var("SUI_RPC_URL")
        .unwrap_or_else(|_| "https://fullnode.testnet.sui.io:443".to_string());

    // Shared state.
    let state = AppState {
        db: db.clone(),
        redis,
        sui_rpc_url: sui_rpc_url.clone(),
        rooms: Arc::new(RwLock::new(RoomManager::new())),
    };

    // Spawn the Sui event indexer as a background task.
    let indexer_db = db.clone();
    let indexer_rpc = sui_rpc_url.clone();
    tokio::spawn(async move {
        if let Err(e) = indexer::event_listener::run(indexer_db, &indexer_rpc).await {
            tracing::error!(error = %e, "Sui event indexer crashed");
        }
    });

    tracing::info!("Sui event indexer spawned");

    // Build the router.
    let app = build_router(state);

    // Bind and serve.
    let port: u16 = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse()
        .context("SERVER_PORT must be a valid u16")?;
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    tracing::info!(%addr, "SpinForge server listening");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn build_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .merge(routes::matchmaking::router())
        .merge(routes::battle_relay::router())
        .merge(routes::leaderboard::router())
        .merge(routes::tournament::router())
        .merge(routes::player::router())
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state)
}
