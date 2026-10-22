import config from "../firebase-config.json";
import { createFirebaseData } from "./data-firebase.js";
import { startApp } from "./app.js";

/* global __BUILD__, __REPO__ */
const native = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
const configured = !!(config && config.apiKey && config.projectId && config.appId);

startApp({
  data: configured ? createFirebaseData(config) : null,
  env: { native, build: Number(__BUILD__) || 0, repo: __REPO__ },
});

// Di APK yang memuat file bawaan (https://localhost) service worker tidak diperlukan.
if ("serviceWorker" in navigator && location.protocol === "https:" && location.hostname !== "localhost") {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
