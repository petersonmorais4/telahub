import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.loomy.telahub",
  appName: "TelaHUB",
  webDir: "capacitor-www",
  server: {
    url: "https://telahub.app/app",
    cleartext: false,
    errorPath: "offline.html",
    // Keep every TelaHUB address inside the app WebView; otherwise Android hands
    // redirects (e.g. old domain -> telahub.app) to the system browser (Amazon Silk).
    allowNavigation: [
      "telahub.app",
      "*.telahub.app",
      "telahub.lovable.app",
      "*.lovable.app",
      "*.supabase.co",
    ],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
