# ---- Stage 1: Build ----
FROM rust:1.78-slim-bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache dependencies by copying manifests first.
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true
RUN rm -rf src

# Copy source and build the real binary.
COPY src/ src/
RUN cargo build --release

# ---- Stage 2: Runtime ----
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 spinforge \
    && useradd --uid 1001 --gid spinforge --shell /bin/false spinforge

COPY --from=builder /app/target/release/spinforge-server /usr/local/bin/spinforge-server
RUN chmod +x /usr/local/bin/spinforge-server

USER spinforge
EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

ENTRYPOINT ["spinforge-server"]
