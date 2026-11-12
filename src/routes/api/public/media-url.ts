import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Deliberately public: TVs play ads without login. The server signs a short-lived
// link only for files of currently active ads or the configured logo; nothing else.
const input = z.object({ path: z.string().min(1).max(500) });

export const Route = createFileRoute("/api/public/media-url")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const parsed = input.safeParse({ path: new URL(request.url).searchParams.get("path") });
        if (!parsed.success) return Response.json({ error: "Consulta inválida." }, { status: 400 });
        const path = parsed.data.path;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date().toISOString().slice(0, 10);
        const [{ data: media }, { data: settings }] = await Promise.all([
          supabaseAdmin.from("media").select("id, end_date").eq("storage_path", path).eq("active", true).limit(1),
          supabaseAdmin.from("app_settings").select("logo_url").eq("logo_url", path).limit(1),
        ]);
        const okMedia = (media ?? []).some((m) => !m.end_date || m.end_date >= today);
        if (!okMedia && !(settings ?? []).length) {
          return Response.json({ error: "Arquivo indisponível." }, { status: 404 });
        }
        const { data, error } = await supabaseAdmin.storage.from("media").createSignedUrl(path, 60 * 60 * 6);
        if (error || !data?.signedUrl) return Response.json({ error: "Arquivo indisponível." }, { status: 503 });
        return Response.json({ url: data.signedUrl }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
