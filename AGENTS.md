<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The app exposes an MCP server (`/mcp`, Supabase OAuth, name `telahub`); tools live in `src/lib/mcp/tools/` (one `defineTool` per file) and are registered in `src/lib/mcp/index.ts` — never hand-edit the generated `src/routes/mcp.ts` or `.well-known` routes.
- The Android TV APK is a Capacitor shell built only in CI (`.github/workflows/build-apk.yml` + `scripts/patch-android.mjs`); `android/` is generated per build and never committed, because the APK just loads the published `/app` route.
- The published APK (release `apk-latest`) is built only by the manual workflow dispatch, signed with `signing/telahub-debug.keystore.b64`; never replace or delete that keystore, or installed devices can no longer update. Pushes never touch the release; `release/telahub-2026-10-26.apk` is just a backup. `/apk` only redirects to the public `apk-latest` release download.
- Live weather and market queries share `src/lib/live-query-policy.ts`; ignore WebView offline/hidden signals and retry missing data promptly because TV connectivity events can be inaccurate.
- News slides size their text against the actual player container and keep the headline and summary non-shrinking together; compact layouts omit secondary stories before clipping the main summary.
- Manual reports share one filtered log collection for totals, rows and PDF; a null point selection means all and an empty selection means none, preventing unchecked points from leaking into exports.
- Screen business hours use one shared São Paulo-time evaluator for manual/client reports and offline reminders, with half-open intervals and overnight support; null preserves legacy behaviour until hours are configured.
- Player weather is fetched directly from the device (open-meteo allows CORS) with `/api/public/live-content` as fallback, because the provider rejects requests from the hosting edge network; market data still uses the endpoint. Android WebViews may omit origin metadata required by RPC CSRF checks, so never weaken global CSRF protection.
- Team roles are admin/operator/viewer in `user_roles`; panel writes require `is_staff()` (admin/operator), reads `is_member()`, and user management goes through admin-checked server functions in `src/lib/users.functions.ts`, because new signups default to viewer and must not escalate themselves.
- Financial data (expenses, revenues) is gated by `can_finance_read/write()` which excludes the `operacional` role; sales funnel tables (`sales_leads`, `sales_lead_events`) are gated by `is_sales()` (admin + operacional), because RLS, not the menu, must enforce who sees money.
- Player Realtime uses one fixed-name channel per screen with only screens (filtered by id, ignoring heartbeat columns) and playlist_items (filtered), exponential backoff and refresh only after a real drop, because unfiltered multi-table channels caused a join/refresh storm that dominated database load.
- Keep exhibition log indexes on played_at and (media_id, played_at): dashboard and report date-order queries must avoid full-history scans without changing logging or report contents.
