import { createFileRoute } from "@tanstack/react-router";
import { liveContentInput, loadLiveContent } from "@/lib/live-content-source";

// Deliberately public: only weather/market data, no account or screen data.
// GET only, validated provider parameters, no caller-supplied URLs or mutations.
export const Route = createFileRoute("/api/public/live-content")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const input = liveContentInput.safeParse({
          type: url.searchParams.get("type"),
          city: url.searchParams.get("city"),
        });
        if (!input.success) {
          return Response.json({ error: "Consulta inválida." }, { status: 400 });
        }
        try {
          return Response.json(await loadLiveContent(input.data), {
            headers: { "Cache-Control": "public, max-age=60" },
          });
        } catch {
          return Response.json({ error: "Informações temporariamente indisponíveis." }, {
            status: 503, headers: { "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});