# Database performance and running usage — 2026-11-14

Applied database-optimization workflow. No playback, layout, logging, permissions, retention, or freshness changes.

## Recorded project baseline

Window: November 8 00:00 UTC through November 14 14:26 UTC; current date partial and ingestion delayed (latest Cloud records November 13). Amounts are requested credits, not confirmed deductions or cash paid.

- Build/chat/plan: 75.213 credits, separate from runtime.
- Runtime: 34.079513938 requested credits.
- Realtime: 1,249,249 messages; 15.6156125 credits.
- Network: 62.321058637 GB cached plus 7.371892961 GB uncached; 12.665510681 credits.
- Compute Pico: 60.14 recorded instance-hours; 4.655990688 credits. Current quote 0.0774192/hour, 1.8580608 per continuously active 24 hours, 55.741824 per 720 hours, before coverage.
- Functions: 114 worker-days and 799 recorded requests; 1.1411985 credits.
- File storage: 8.353493629 GB-hours; 0.001201569 credits. No database-storage quantity returned; unknown, not zero.

This recording window cannot establish today's full daily running cost or confirm the previous 2.05–2.10 daily estimate.

## Load and source investigation

Statistics reset November 12 19:58:46 UTC. Cumulative timings are elapsed SQL execution time, not CPU measurements. `extensions.pg_stat_statements` exposes the data; the unqualified name does not exist.

Realtime list_changes: 303,804 calls and approximately 1,948,630 ms cumulative elapsed time at initial inspection. Recent realtime log queries returned no rows, so join/drop rates cannot be reconstructed from those logs. Between 14:28:33 and 14:29:43 UTC, list_changes rose from 304,022 to 304,162 calls (about 2/second); this is internal polling, not billable message count or device joins.

Player source already has a fixed channel with screen-id and playlist filters, heartbeat-column exclusion, jittered backoff, and no first-SUBSCRIBED refresh. Public player bundle inspection found this implementation, not the old six-table listener. Left untouched to avoid regressions and freshness changes. Playback cache also remains untouched; avoiding network downloads needs representative TV cache-hit/download measurements, not a SQL-index claim.

Report reads dominated application SQL: date-filtered joined reads averaged 1,073.73 ms over 212 calls; recent-log joined reads averaged 2,711.27 ms over 55 calls. Approximately 122,000 log rows, 15 MB before indexes, with only primary-key index. Full-history scans and sorts confirmed by query plans.

Inspected manual reports, dashboard, MCP list_exhibitions, weekly report job and daily TV reminder. Same date-order indexes support their reads. Weekly per-client queries additionally need media/date indexing. Report content and business-hours/test-screen filtering remain unchanged. Two configured managed jobs: daily reminder at 12:00 UTC and weekly reports Monday 11:00 UTC; no frequent empty-queue schedule found. Execution history not available through list_http_schedules. No app trigger on play_logs found; no NOTIFY-driven logging change needed. No deletion or cleanup performed.

## Applied changes

Migration `drizzle/migrations/0019_optimize_exhibition_report_indexes.sql` applied to the live project database:

- `play_logs_played_at_idx` on played_at DESC.
- `play_logs_media_played_at_idx` on media_id, played_at DESC.

Both confirmed in database, totaling approximately 7.4 MiB. Adds index write/storage overhead; intentionally only these two measured query paths, not indexes on tiny tables or unused fields.

## Equivalent bounded query probes

| Same query before/after | Before | After | Plan after |
| --- | ---: | ---: | --- |
| Latest 100 logs joined with media/screens | 730.715 ms | 2.894 ms | date index, bounded joins |
| Nov 13–14 date range, latest 1,000 logs | 37.901 ms | 2.505 ms | date index |
| Same media/date range, first 1,000 rows ascending | 12.768 ms | 4.812 ms | backward media/date index scan |

These are single bounded probes, sensitive to warm caches/concurrent load, not production p95 or authenticated Data API measurements. Initial recent-log probe scanned roughly 122,000 rows to return 100; new plan scans 100 log rows. All use identical date bounds and limits, but live data continues to arrive.

13 existing node:test tests passed with bun test for client reports, business hours and screen filtering. Vitest was incompatible with these node:test files; rerun with the project's compatible runner succeeded. Automatic build log reports build OK. Local real screen player 4DU2CZ opened with rendered advertisement, no page errors, and one phx_join in 25 seconds. It showed an image at capture, not a video claim. Authenticated panel validation blocked: auth-session --self found no matching requester account; no other identity selected. User must sign in to preview for that check.

Database healthy before/after, no recent exhaustion alerts. Final memory 66%, connections 23/60, data disk 17%. Snapshot does not establish sustained sizing headroom; did not resize or pause. Pico tariff unchanged.

## Next measurement

Compare a full representative period after these changes with the same successful report workload and TV count. Record API report latency, Realtime joins/errors/messages, download bytes/cache behavior, compute hours and ingested requested credits. Do not claim savings from SQL execution-time improvements alone: compute tariff remains fixed while active. Review Usage details after ingestion. Current Realtime source safeguards already deployed; remove/reduce heartbeat event delivery only with an explicit freshness/reliability decision and measured benefit. No such behavior changes made.