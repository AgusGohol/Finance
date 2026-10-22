// Dijalankan di GitHub Actions sebelum `npx cap add android`:
// membuat APK membuka versi web terbaru di GitHub Pages, sehingga tampilan & fitur
// selalu ter-update tanpa memasang APK baru. Bila tidak ada internet saat dibuka,
// APK menampilkan offline.html dari dalam aplikasi.
import { readFileSync, writeFileSync } from "node:fs";

const repo = process.env.GITHUB_REPOSITORY || "";
const [owner, name] = repo.split("/");
if (!owner || !name) { console.log("GITHUB_REPOSITORY kosong; APK memakai file bawaan."); process.exit(0); }
const url = `https://${owner.toLowerCase()}.github.io/${name}/`;
const cfg = JSON.parse(readFileSync("capacitor.config.json", "utf8"));
cfg.server = { ...(cfg.server || {}), url, errorPath: "offline.html" };
writeFileSync("capacitor.config.json", JSON.stringify(cfg, null, 2) + "\n");
console.log("APK akan membuka " + url);
