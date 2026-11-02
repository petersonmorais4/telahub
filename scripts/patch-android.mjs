// Patches the Capacitor-generated Android project for TV boxes. Run after `npx cap add android`.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const APP_ID = "com.loomy.telahub";
const ROOT = "android/app";
const MAIN = join(ROOT, "src/main");
const RES = join(MAIN, "res");
const ICON = "public/icons/telahub-512.png";
const run = Number.parseInt(process.env.GITHUB_RUN_NUMBER ?? "1", 10) || 1;

const read = (p) => readFileSync(p, "utf8");
const write = (p, s) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s); };
const log = (m) => console.log(`[patch-android] ${m}`);

// ---------- AndroidManifest.xml ----------
const manifestPath = join(MAIN, "AndroidManifest.xml");
let m = read(manifestPath);
const headerAdds = [
  '<uses-feature android:name="android.hardware.touchscreen" android:required="false" />',
  '<uses-feature android:name="android.software.leanback" android:required="false" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
].filter((l) => !m.includes(l.match(/name="([^"]+)"/)[1]));
if (headerAdds.length) m = m.replace(/<application/, `${headerAdds.join("\n    ")}\n\n    <application`);

m = m.replace(/<activity([^>]*android:name="[^"]*MainActivity"[^>]*)>/, (full, attrs) => {
  let a = attrs;
  if (!a.includes("android:banner")) a += '\n            android:banner="@drawable/banner"';
  if (!a.includes("android:screenOrientation")) a += '\n            android:screenOrientation="sensorLandscape"';
  return `<activity${a}>`;
});
if (!m.includes("LEANBACK_LAUNCHER")) {
  m = m.replace(
    /(<category android:name="android.intent.category.LAUNCHER"\s*\/>)/,
    '$1\n                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />',
  );
}
if (!m.includes(".BootReceiver")) {
  m = m.replace(
    /<\/application>/,
    `    <receiver android:name=".BootReceiver" android:enabled="true" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
    </application>`,
  );
}
write(manifestPath, m);
log("manifest patched");

// ---------- MainActivity + BootReceiver ----------
function findFile(dir, names) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { const r = findFile(p, names); if (r) return r; }
    else if (names.includes(e)) return p;
  }
  return null;
}
const mainActivity = findFile(join(MAIN, "java"), ["MainActivity.java", "MainActivity.kt"])
  ?? (existsSync(join(MAIN, "kotlin")) ? findFile(join(MAIN, "kotlin"), ["MainActivity.kt"]) : null);
if (!mainActivity) throw new Error("MainActivity not found");
const pkgDir = dirname(mainActivity);
const isKotlin = mainActivity.endsWith(".kt");

if (isKotlin) {
  write(mainActivity, `package ${APP_ID}

import android.os.Bundle
import android.view.View
import android.view.WindowManager
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemUi()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUi()
    }

    @Suppress("DEPRECATION")
    private fun hideSystemUi() {
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN)
    }
}
`);
  write(join(pkgDir, "BootReceiver.kt"), `package ${APP_ID}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val launch = Intent(context, MainActivity::class.java)
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(launch)
        }
    }
}
`);
} else {
  write(mainActivity, `package ${APP_ID};

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @SuppressWarnings("deprecation")
    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN);
    }
}
`);
  write(join(pkgDir, "BootReceiver.java"), `package ${APP_ID};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Intent launch = new Intent(context, MainActivity.class);
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launch);
        }
    }
}
`);
}
log(`MainActivity (${isKotlin ? "Kotlin" : "Java"}) + BootReceiver written`);

// ---------- signing ----------
const gradlePath = existsSync(join(ROOT, "build.gradle")) ? join(ROOT, "build.gradle") : join(ROOT, "build.gradle.kts");
if (!existsSync(gradlePath)) throw new Error("app build.gradle not found");
const kts = gradlePath.endsWith(".kts");
const KEYSTORE_B64 = "signing/telahub-debug.keystore.b64";
if (!existsSync(KEYSTORE_B64)) throw new Error(`${KEYSTORE_B64} not found`);
const keystore = Buffer.from(read(KEYSTORE_B64).replace(/\s/g, ""), "base64");
if (keystore.length === 0) throw new Error("keystore is empty");
writeFileSync(join(ROOT, "telahub.keystore"), keystore);

let g = read(gradlePath);
const debugSigning = kts
  ? `getByName("debug") {
            storeFile = file("telahub.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }`
  : `debug {
            storeFile file("telahub.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }`;
const debugBuildType = kts
  ? `getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
        }`
  : `debug {
            signingConfig signingConfigs.debug
        }`;
const androidOpen = /(^|\n)android\s*\{/;
if (!androidOpen.test(g)) throw new Error("android { } block not found in app build.gradle");
if (/\bsigningConfigs\s*\{/.test(g)) {
  g = g.replace(/\bsigningConfigs\s*\{/, (s) => `${s}\n        ${debugSigning}`);
} else {
  g = g.replace(androidOpen, (s) => `${s}\n    signingConfigs {\n        ${debugSigning}\n    }\n`);
}
if (/\bbuildTypes\s*\{/.test(g)) {
  g = g.replace(/\bbuildTypes\s*\{/, (s) => `${s}\n        ${debugBuildType}`);
} else {
  // A second android { } block is evaluated after the first, so signingConfigs already exists.
  g += `\nandroid {\n    buildTypes {\n        ${debugBuildType}\n    }\n}\n`;
}
if (!g.includes("telahub.keystore")) throw new Error("failed to inject signing config");
write(gradlePath, g);
log("signing config applied");

// ---------- versionCode / versionName ----------
const versionCode = 1000 + run;
g = g.replace(/versionCode\s*=?\s*\d+/, kts ? `versionCode = ${versionCode}` : `versionCode ${versionCode}`);
g = g.replace(/versionName\s*=?\s*"[^"]*"/, kts ? `versionName = "1.0.${run}"` : `versionName "1.0.${run}"`);
write(gradlePath, g);
log(`version set to 1.0.${run} (${versionCode})`);

// ---------- Icons + banner (ImageMagick) ----------
const magick = (() => {
  for (const bin of ["magick", "convert"]) {
    try { execFileSync(bin, ["-version"], { stdio: "ignore" }); return bin; } catch {}
  }
  throw new Error("ImageMagick not found (magick/convert)");
})();
const im = (args) => execFileSync(magick, args, { stdio: "inherit" });

const densities = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
for (const [d, [size, fg]] of Object.entries(densities)) {
  const dir = join(RES, `mipmap-${d}`);
  mkdirSync(dir, { recursive: true });
  im([ICON, "-resize", `${size}x${size}`, join(dir, "ic_launcher.png")]);
  im([ICON, "-resize", `${size}x${size}`, join(dir, "ic_launcher_round.png")]);
  // Adaptive foreground: icon at ~66% inside the safe zone, dark background.
  const inner = Math.round(fg * 0.66);
  im(["-size", `${fg}x${fg}`, "xc:#040c0b", "(", ICON, "-resize", `${inner}x${inner}`, ")",
    "-gravity", "center", "-composite", join(dir, "ic_launcher_foreground.png")]);
}
// Adaptive icon background color
const bgXml = join(RES, "values/ic_launcher_background.xml");
write(bgXml, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#040c0b</color>\n</resources>\n`);

mkdirSync(join(RES, "drawable"), { recursive: true });
im(["-size", "320x180", "xc:#040c0b", "(", ICON, "-resize", "140x140", ")",
  "-gravity", "center", "-composite", join(RES, "drawable/banner.png")]);
log("icons and banner generated");
