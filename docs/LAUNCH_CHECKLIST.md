# SpinForge Launch Checklist

## Pre-Launch: Smart Contracts

- [ ] All 17 Move modules pass `sui move test` with zero failures
- [ ] Security audit complete — 5 High issues fixed (see SECURITY_AUDIT.md)
- [ ] Medium/Low audit findings resolved or mitigated
- [ ] Professional third-party audit engaged and completed
- [ ] Contracts deployed to Sui mainnet
- [ ] Contract addresses verified and published on Sui Explorer
- [ ] AdminCap secured in multi-sig wallet
- [ ] TreasuryCap minting policies configured with per-epoch caps
- [ ] Upgrade policies set (immutable or governed by multi-sig)

## Pre-Launch: Backend Infrastructure

- [ ] Production backend deployed (region: TBD based on player distribution)
- [ ] Database backups configured — daily automated + pre-deploy snapshots
- [ ] Database migration scripts tested on staging
- [ ] Redis cache layer operational for session and matchmaking data
- [ ] WebSocket server load-tested for 500+ concurrent connections
- [ ] API rate limiting configured per endpoint
- [ ] CORS and CSP headers configured for production domain
- [ ] SSL/TLS certificates provisioned and auto-renewing

## Pre-Launch: Frontend

- [ ] Next.js production build optimized (<200KB initial JS bundle)
- [ ] PixiJS battle assets lazy-loaded with preload on matchmaking entry
- [ ] CDN configured for static assets (images, audio, fonts)
- [ ] Error boundary and fallback UI for all critical paths
- [ ] Analytics tracking verified (tutorial funnel, battle events, marketplace activity)
- [ ] Mobile-responsive layout tested on iOS Safari and Android Chrome
- [ ] Accessibility audit passed (WCAG 2.1 AA)

## Pre-Launch: Monitoring and Ops

- [ ] Grafana dashboards configured:
  - Contract interaction success/failure rates
  - Backend API latency (p50, p95, p99)
  - WebSocket connection count and error rate
  - Matchmaking queue depth and wait time
  - Database query performance
- [ ] Prometheus alerting rules:
  - API error rate > 5% for 5 minutes
  - p99 latency > 3 seconds
  - WebSocket disconnection rate > 10%
  - Database connection pool exhaustion
  - Disk usage > 80%
- [ ] PagerDuty or equivalent on-call rotation configured
- [ ] Incident response runbook documented
- [ ] Log aggregation operational (structured JSON logs)

## Pre-Launch: Game Balance

- [ ] Component stat ranges reviewed and balanced
- [ ] Battle simulation run for 10,000+ matches — win rate distribution within 45-55% for all archetypes
- [ ] Pack drop rates verified: Common 70%, Uncommon 20%, Rare 8%, Epic 1.8%, Legendary 0.2%
- [ ] FORGE token economy modeled — inflation/deflation projections for 6 months
- [ ] SPARK token earn rates balanced against marketplace pricing

## Beta Testing Program

- [ ] Closed beta invite system operational (100-500 players)
- [ ] Beta feedback form integrated (in-app and Discord bot)
- [ ] Bug bounty program announced with reward tiers:
  - Critical (fund loss, exploit): $1,000-$5,000 equivalent in FORGE
  - High (game-breaking bug): $500-$1,000
  - Medium (significant UX issue): $100-$500
  - Low (minor issue): $50-$100
- [ ] Beta player data wipe policy communicated (wipe before mainnet launch)
- [ ] Minimum 2-week beta period with at least 1 balance patch cycle
- [ ] Beta exit criteria defined:
  - Zero Critical/High bugs open
  - Tutorial completion rate > 80%
  - Average matchmaking wait < 30 seconds
  - Server uptime > 99.5% over 7-day rolling window

## Launch Day

- [ ] Contracts deployed and verified on mainnet
- [ ] Backend scaled to handle launch traffic (2x expected peak)
- [ ] CDN cache warmed for all static assets
- [ ] Starter pack supply pre-minted for first 10,000 players
- [ ] zkLogin providers configured (Google, Apple, Twitch)
- [ ] Sponsored transaction relayer funded with sufficient SUI
- [ ] Kill switch tested — ability to pause contracts and matchmaking if critical issue found

## Launch Day: Community

- [ ] Discord server open with moderation bots active
- [ ] Twitter/X announcement scheduled
- [ ] Launch blog post published
- [ ] Player documentation site live (game mechanics, FAQ, terms of service)
- [ ] Community managers on standby for first 48 hours
- [ ] Initial tournament scheduled within first week of launch

## Post-Launch: First Week

- [ ] Daily monitoring review (error rates, latency, player counts)
- [ ] Hotfix deployment pipeline tested and ready
- [ ] Player feedback triaged daily
- [ ] First balance patch based on real match data (if needed)
- [ ] Token economy metrics reviewed against projections
- [ ] Scale infrastructure based on actual traffic patterns

## Legal and Compliance

- [ ] Terms of Service published and accepted on registration
- [ ] Privacy Policy published (GDPR/CCPA compliant)
- [ ] NFT and token disclaimers in place
- [ ] Age verification gate (13+ minimum)
- [ ] Regional restrictions configured (if applicable)
