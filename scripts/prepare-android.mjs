// Dijalankan di GitHub Actions setelah `npx cap add android`:
// memasang ikon & layar pembuka, nomor versi, dan tanda tangan APK.
import { appendFileSync, cpSync, existsSync, readFileSync } from "node:fs";

if (!existsSync("android/app/build.gradle")) {
  console.error("Folder android belum ada. Jalankan `npx cap add android` dulu.");
  process.exit(1);
}

cpSync("resources/android/res", "android/app/src/main/res", { recursive: true, force: true });

const gradle = "android/app/build.gradle";
const MARK = "// KAS-PRIBADI: versi & tanda tangan";
if (!readFileSync(gradle, "utf8").includes(MARK)) {
  appendFileSync(gradle, `
${MARK}
def kasBuild = System.getenv("APP_BUILD") ?: "1"
def kasKeystore = System.getenv("KEYSTORE_FILE")
android {
    defaultConfig {
        versionCode Integer.parseInt(kasBuild)
        versionName "1.0." + kasBuild
    }
    signingConfigs {
        release {
            if (kasKeystore) {
                storeFile file(kasKeystore)
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias(System.getenv("KEY_ALIAS") ?: "kaspribadi")
                keyPassword System.getenv("KEYSTORE_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            if (kasKeystore) {
                signingConfig signingConfigs.release
            }
        }
    }
}
`);
}
console.log("Proyek Android siap dibangun.");
