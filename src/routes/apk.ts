import { createFileRoute } from "@tanstack/react-router";

// Public short link (/apk) that serves the latest Android APK from the private
// GitHub release, so TV devices can download it without a GitHub login.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/github";
const REPO = "petersonmorais4/telahub";

export const Route = createFileRoute("/apk")({
  server: {
    handlers: {
      GET: async () => {
        const lovableKey = process.env["LOVABLE_API_KEY"];
        const githubKey = process.env["GITHUB_API_KEY"];
        if (!lovableKey || !githubKey) {
          return new Response("Download indisponível", { status: 503 });
        }
        const headers = {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": githubKey,
        };
        const rel = await fetch(`${GATEWAY_URL}/repos/${REPO}/releases/tags/apk-latest`, {
          headers: { ...headers, Accept: "application/vnd.github+json" },
        });
        if (!rel.ok) {
          console.error(`APK release lookup failed [${rel.status}]: ${await rel.text()}`);
          return new Response("APK não encontrado", { status: 502 });
        }
        const release = (await rel.json()) as { assets?: { id: number; name: string }[] };
        const asset = release.assets?.find((a) => a.name.endsWith(".apk"));
        if (!asset) return new Response("APK não encontrado", { status: 404 });

        const assetUrl = `${GATEWAY_URL}/repos/${REPO}/releases/assets/${asset.id}`;
        const assetHeaders = { ...headers, Accept: "application/octet-stream" };

        // Prefer sending the device straight to GitHub's short-lived signed file URL,
        // so large downloads are not cut off while being relayed through the edge.
        const probe = await fetch(assetUrl, { headers: assetHeaders, redirect: "manual" });
        const location = probe.headers.get("location");
        if (probe.status >= 300 && probe.status < 400 && location) {
          return new Response(null, {
            status: 302,
            headers: { Location: location, "Cache-Control": "no-store" },
          });
        }

        // Fallback: relay the file, passing its size so downloaders can resume/verify.
        const file =
          probe.ok && probe.body
            ? probe
            : await fetch(assetUrl, { headers: assetHeaders, redirect: "follow" });
        if (!file.ok || !file.body) {
          console.error(`APK download failed [${file.status}]: ${await file.text()}`);
          return new Response("Falha ao baixar o APK", { status: 502 });
        }
        const out = new Headers({
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Disposition": 'attachment; filename="telahub.apk"',
          "Cache-Control": "no-store",
        });
        const len = file.headers.get("content-length");
        if (len) out.set("Content-Length", len);
        return new Response(file.body, { headers: out });
      },
    },
  },
});
