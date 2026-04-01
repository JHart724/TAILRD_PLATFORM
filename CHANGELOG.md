# Changelog

All notable changes to TAILRD Heart will be documented in this file.

## [0.1.0.0] - 2026-04-01

Care teams can now respond to clinical gaps directly from the platform. Every gap card has Order, Refer, and Not Applicable buttons. Executives see gap response rates on their dashboards. The analytics backend is fixed and ready for real tracking.

### Added

- Gap action tracking across all 6 cardiovascular modules (HF, EP, SH, CAD, VD, PV). Care teams can mark gaps as ordered, referred, or dismissed with a reason.
- Gap Response Rate card on all 6 executive dashboards showing how care teams respond to detected gaps.
- GapAction database model with indexed columns for fast aggregation queries.
- POST /api/gap-actions endpoint for recording gap views and actions.
- GET /api/gap-actions/response-rates endpoint for executive dashboard data.
- useGapActions React hook with demo mode fallback.
- Shared GapCard component for consistent gap card rendering.
- Filter chip system across all 6 gap detection dashboards.
- Clinical gap sub-tabs (GDMT, Advanced Device, Rare Cardiomyopathy, etc.) within each module.
- Porsche metallic color palette with semantic data visualization colors.
- Visual depth and module color identity on service line dashboards.

### Changed

- ActivityType enum unified between Prisma schema and TypeScript (was diverged across 2 definitions). Single source of truth now.
- ModuleType enum updated to include ADMIN and ANALYTICS.
- Gap detection restructured into clinical sub-tabs across all modules.
- Semantic color coding applied to all executive dashboards, waterfalls, and benchmarks.

### Fixed

- AnalyticsTracker silently dropped events due to missing required fields (sessionId, ipAddress, path, method). Now provides defaults.
- Removed @ts-nocheck from analytics routes, fixing 35+ latent TypeScript errors.
- Replaced semantic gold/green color misuse in revenue and benchmark components.
- Removed hardcoded initiative text from gap sub-tabs.
- Sticky sidebar, visible texture, on-palette icon colors.
