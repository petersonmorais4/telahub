import { createFileRoute } from "@tanstack/react-router";

// Public short link (/apk) that redirects to the latest APK on the public GitHub release.
const APK_URL = "https://github.com/petersonmorais4/telahub/releases/download/apk-latest/telahub.apk";

export const Route = createFileRoute("/apk")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 302,
          headers: { Location: APK_URL, "Cache-Control": "no-store" },
        }),
    },
  },
});
