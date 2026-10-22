// Membangun versi web ke folder dist/ (dipakai GitHub Pages dan APK Android).
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BUILD = String(process.env.APP_BUILD || process.env.GITHUB_RUN_NUMBER || "0");
const REPO = String(process.env.GITHUB_REPOSITORY || "");
const out = "dist";

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "fonts"), { recursive: true });

// 1. Kode aplikasi + Firebase SDK digabung jadi satu file (agar APK bisa jalan offline).
await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "esm",
  minify: true,
  sourcemap: false,
  target: ["es2020", "chrome90", "safari15"],
  outfile: join(out, "app.js"),
  define: { __BUILD__: JSON.stringify(BUILD), __REPO__: JSON.stringify(REPO) },
  loader: { ".json": "json" },
  logLevel: "info",
});

// 2. Font disimpan lokal supaya tampil sama walau offline.
const fonts = [
  ["plus-jakarta-sans", "Plus Jakarta Sans", [400, 500, 600, 700, 800]],
  ["ibm-plex-mono", "IBM Plex Mono", [400, 500, 600]],
];
let fontCss = "";
for (const [pkg, family, weights] of fonts) {
  for (const w of weights) {
    const file = `${pkg}-latin-${w}-normal.woff2`;
    const src = join("node_modules", "@fontsource", pkg, "files", file);
    if (!existsSync(src)) { console.warn(`! Font tidak ditemukan, dilewati: ${src}`); continue; }
    cpSync(src, join(out, "fonts", file));
    fontCss += `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url("fonts/${file}") format("woff2")}\n`;
  }
}
writeFileSync(join(out, "fonts.css"), fontCss);

// 3. File statis.
cpSync("src/styles.css", join(out, "styles.css"));
cpSync("src/manifest.webmanifest", join(out, "manifest.webmanifest"));
cpSync("src/icons", join(out, "icons"), { recursive: true });
writeFileSync(join(out, "index.html"), readFileSync("src/index.html", "utf8").replaceAll("%BUILD%", BUILD));

// 4. Service worker untuk versi web (offline & bisa dipasang ke layar utama).
const assets = ["./", "index.html", "app.js", "styles.css", "fonts.css", "manifest.webmanifest",
  ...readdirSync(join(out, "fonts")).map((f) => "fonts/" + f),
  ...readdirSync(join(out, "icons")).map((f) => "icons/" + f)];
writeFileSync(join(out, "sw.js"), readFileSync("src/sw.js", "utf8")
  .replace("__VERSION__", JSON.stringify("kas-" + BUILD))
  .replace("__ASSETS__", JSON.stringify(assets)));

// GitHub Pages: jangan proses dengan Jekyll.
writeFileSync(join(out, ".nojekyll"), "");
console.log(`Selesai: build ${BUILD}${REPO ? " untuk " + REPO : ""}`);
