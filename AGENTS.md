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
- Live weather and market queries share `src/lib/live-query-policy.ts`; ignore WebView offline/hidden signals and retry missing data promptly because TV connectivity events can be inaccurate.
- Player weather is fetched directly from the device (open-meteo allows CORS) with `/api/public/live-content` as fallback, because the provider rejects requests from the hosting edge network; market data still uses the endpoint. Android WebViews may omit origin metadata required by RPC CSRF checks, so never weaken global CSRF protection.
