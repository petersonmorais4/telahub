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

- WhatsApp events are durably ingested at `/api/public/whatsapp/webhook`; admin reads use RLS and sends use authenticated server functions because provider credentials must remain server-only.
- The app exposes an MCP server (`/mcp`, Supabase OAuth, name `telahub`); tools live in `src/lib/mcp/tools/` (one `defineTool` per file) and are registered in `src/lib/mcp/index.ts` — never hand-edit the generated `src/routes/mcp.ts` or `.well-known` routes.
