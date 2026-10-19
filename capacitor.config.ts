import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.loomy.telahub",
  appName: "TelaHUB",
  webDir: "capacitor-www",
  server: {
    url: "https://telahub.lovable.app/app",
    cleartext: false,
    errorPath: "offline.html",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
