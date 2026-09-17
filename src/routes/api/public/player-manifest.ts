import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const playerCodeSchema = z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_-]+$/);

export const Route = createFileRoute("/api/public/player-manifest")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        const parsedCode = playerCodeSchema.safeParse(url.searchParams.get("code"));
        if (!parsedCode.success) {
          return Response.json({ error: "Código de tela inválido." }, { status: 400 });
        }

        const code = encodeURIComponent(parsedCode.data);
        const playerPath = `/player/${code}`;
        return Response.json(
          {
            id: playerPath,
            name: `TelaHUB — Exibição ${parsedCode.data}`,
            short_name: "TelaHUB",
            description: "Exibição de anúncios TelaHUB em tela cheia.",
            lang: "pt-BR",
            dir: "ltr",
            start_url: playerPath,
            scope: "/player/",
            display: "fullscreen",
            orientation: "landscape",
            background_color: "#040c0b",
            theme_color: "#040c0b",
            icons: [
              {
                src: "/icons/telahub-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
              },
              {
                src: "/icons/telahub-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
              },
              {
                src: "/icons/telahub-maskable-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
          },
          {
            headers: {
              "Cache-Control": "public, max-age=300",
              "Content-Type": "application/manifest+json; charset=utf-8",
            },
          },
        );
      },
    },
  },
});