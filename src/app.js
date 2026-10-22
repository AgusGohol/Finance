// Tampilan dan logika aplikasi Finance. Semua akses data lewat objek `data`
// (lihat data-firebase.js), sehingga bagian ini bisa diuji dengan data tiruan.

/* ================= Konstanta ================= */
const CATS = {
  keluar: [
    ["makan", "Makan & Minum"], ["transport", "Transportasi"], ["belanja", "Belanja Harian"], ["tagihan", "Tagihan & Pulsa"],
    ["hiburan", "Hiburan"], ["kesehatan", "Kesehatan"], ["pendidikan", "Pendidikan"], ["keluarga", "Keluarga & Sosial"],
    ["admin", "Biaya Admin Bank"], ["lainnya", "Lainnya"],
  ],
  masuk: [["gaji", "Gaji"], ["sampingan", "Freelance & Sampingan"], ["bonus", "Bonus & THR"], ["lainnya_in", "Pemasukan Lain"]],
};
const BIZ_CATS = {
  masuk: [["b_jual", "Penjualan"], ["b_jasa", "Jasa / Proyek"], ["b_lain_in", "Pemasukan Lain"]],
  keluar: [
    ["b_stok", "Modal & Stok Barang"], ["b_ops", "Operasional"], ["b_kirim", "Ongkir & Pengemasan"], ["b_iklan", "Iklan & Promosi"],
    ["b_gaji", "Gaji Karyawan"], ["b_sewa", "Sewa Tempat"], ["b_lain", "Biaya Lain"],
  ],
};
const CAT_NAME = {};
for (const g of [CATS, BIZ_CATS]) for (const t in g) for (const [k, n] of g[t]) CAT_NAME[k] = n;

const JENIS = [["bank", "Bank"], ["ewallet", "E-wallet"], ["tunai", "Tunai"], ["lain", "Lainnya"]];
const JENIS_NAME = Object.fromEntries(JENIS);
const PRESETS = {
  bank: ["BCA", "BRI", "Mandiri", "BNI", "BSI", "CIMB Niaga", "Bank Jago", "SeaBank", "BTN", "Permata"],
  ewallet: ["GoPay", "OVO", "DANA", "ShopeePay", "LinkAja"],
  tunai: ["Dompet", "Tunai di rumah"],
  lain: ["Kartu Kredit", "Bibit", "Bareksa"],
};
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const VIEWS = [
  ["beranda", "Beranda", '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'],
  ["transaksi", "Transaksi", '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>'],
  ["rekening", "Rekening", '<path d="M3 9.5 12 4l9 5.5M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20.5h18"/>'],
  ["tabungan", "Tabungan", '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>'],
  ["bisnis", "Bisnis", '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 13h18"/>'],
];
const VIEW_TITLE = { beranda: "Beranda", transaksi: "Transaksi", rekening: "Rekening", tabungan: "Tabungan & Rencana", bisnis: "Bisnis" };
const MONTH_VIEWS = new Set(["beranda", "transaksi", "bisnis"]);

/* ================= Utilitas ================= */
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const fmt = (n) => "Rp " + Math.round(Math.abs(n)).toLocaleString("id-ID");
const fmtSigned = (n) => (n < 0 ? "−" : "") + fmt(n);
const fmtS = (n) => {
  const a = Math.abs(n);
  const s = a >= 1e9 ? (a / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "M"
    : a >= 1e6 ? (a / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "jt"
      : a >= 1e3 ? Math.round(a / 1e3) + "rb" : String(Math.round(a));
  return (n < 0 ? "−" : "") + s;
};
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const parseMoney = (v) => +String(v ?? "").replace(/[^\d]/g, "") || 0;
const moneyVal = (n) => (n ? Math.round(n).toLocaleString("id-ID") : "");
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } };
const daysIn = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
const monthName = (m) => { const [y, mo] = m.split("-").map(Number); return MONTHS[mo - 1] + " " + y; };
const monthShort = (m) => { const [y, mo] = m.split("-").map(Number); return MONTHS[mo - 1].slice(0, 3) + " " + y; };
const shiftMonth = (m, k) => { let [y, mo] = m.split("-").map(Number); mo += k; while (mo < 1) { mo += 12; y--; } while (mo > 12) { mo -= 12; y++; } return y + "-" + pad(mo); };
const monthDiff = (a, b) => { const [ya, ma] = a.split("-").map(Number), [yb, mb] = b.split("-").map(Number); return (yb - ya) * 12 + (mb - ma); };
const initials = (name) => {
  const w = String(name || "?").trim().split(/\s+/);
  const s = w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 3);
  return s.toUpperCase();
};
const icon = (paths, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const opt = (v, label, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(label)}</option>`;

/* ================= Aplikasi ================= */
export function startApp({ data, env }) {
  const S = {
    user: null, view: "beranda", month: todayStr().slice(0, 7),
    tx: [], akun: [], tab: [], ren: [], biz: [], budget: {},
    loaded: { tx: false, akun: false, tabungan: false, rencana: false, bisnis: false },
    pending: {}, unsubs: [],
    f: { tipe: "semua", akun: "", scope: "", q: "" },
    confirmId: null, showArchived: false,
  };
  let D = null; // data turunan (saldo, ringkasan)

  function show(view) { for (const v of ["setupView", "loadView", "authView", "appView"]) $(v).hidden = v !== view; }
  if (!data) { show("setupView"); return; }

  /* ---------- pesan galat ---------- */
  function authErr(e) {
    const m = {
      "auth/invalid-email": "Format email tidak valid.",
      "auth/missing-email": "Isi alamat email dulu.",
      "auth/missing-password": "Isi password dulu.",
      "auth/invalid-credential": "Email atau password salah.",
      "auth/wrong-password": "Email atau password salah.",
      "auth/user-not-found": "Akun dengan email ini belum terdaftar.",
      "auth/email-already-in-use": "Email ini sudah punya akun. Pilih Masuk.",
      "auth/weak-password": "Password terlalu lemah. Pakai minimal 6 karakter.",
      "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.",
      "auth/network-request-failed": "Tidak ada koneksi internet. Login butuh internet.",
      "auth/operation-not-allowed": "Login email/password belum diaktifkan di Firebase.",
      "auth/admin-restricted-operation": "Pendaftaran akun baru sedang ditutup.",
    };
    return m[(e && e.code) || ""] || "Gagal masuk. Coba lagi.";
  }
  function dataErr(e) {
    const c = (e && e.code) || "";
    if (c === "permission-denied") return "Akses data ditolak. Periksa aturan Firestore.";
    if (c === "resource-exhausted") return "Batas pemakaian gratis Firebase hari ini tercapai. Coba lagi besok.";
    if (c === "unauthenticated") return "Sesi login berakhir. Silakan masuk lagi.";
    return "Gagal menyimpan ke server. Perubahan akan dicoba lagi saat online.";
  }
  const write = (p) => { p.catch((e) => toast(dataErr(e))); };

  /* ---------- layar login ---------- */
  let authMode = "masuk";
  function setAuthMode(m) {
    authMode = m;
    document.querySelectorAll("#authView .seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    $("aSubmit").textContent = m === "masuk" ? "Masuk" : "Buat akun";
    $("aPw").autocomplete = m === "masuk" ? "current-password" : "new-password";
    $("pwHint").hidden = m === "masuk";
    $("aForgot").hidden = m !== "masuk";
    $("authLead").textContent = m === "masuk"
      ? "Masuk untuk melihat catatan keuanganmu di HP dan komputer."
      : "Buat akun sekali, lalu pakai email dan password yang sama di semua perangkat.";
    $("aErr").hidden = true; $("aOk").hidden = true;
  }
  document.querySelectorAll("#authView .seg button").forEach((b) => (b.onclick = () => setAuthMode(b.dataset.mode)));
  $("pwToggle").onclick = () => {
    const p = $("aPw"), on = p.type === "password";
    p.type = on ? "text" : "password"; $("pwToggle").textContent = on ? "Sembunyi" : "Lihat";
  };
  $("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("aEmail").value.trim(), pw = $("aPw").value, err = $("aErr");
    $("aOk").hidden = true;
    if (!email) { err.textContent = "Isi alamat email dulu."; err.hidden = false; return; }
    if (pw.length < 6) { err.textContent = "Password minimal 6 karakter."; err.hidden = false; return; }
    err.hidden = true;
    const btn = $("aSubmit"); btn.disabled = true; btn.textContent = authMode === "masuk" ? "Masuk…" : "Membuat akun…";
    try {
      if (authMode === "masuk") await data.signIn(email, pw); else await data.signUp(email, pw);
      $("aPw").value = "";
    } catch (ex) { err.textContent = authErr(ex); err.hidden = false; }
    btn.disabled = false; setAuthMode(authMode);
  });
  $("aForgot").onclick = async () => {
    const email = $("aEmail").value.trim(), err = $("aErr"), ok = $("aOk");
    ok.hidden = true;
    if (!email) { err.textContent = "Tulis emailmu di kolom Email, lalu tekan Lupa password lagi."; err.hidden = false; return; }
    try {
      await data.resetPassword(email);
      err.hidden = true; ok.textContent = `Link untuk membuat password baru sudah dikirim ke ${email}. Cek juga folder spam.`; ok.hidden = false;
    } catch (ex) { err.textContent = authErr(ex); err.hidden = false; }
  };

  /* ---------- sesi ---------- */
  function stopSubs() { S.unsubs.forEach((u) => u()); S.unsubs = []; }
  const COLS = [["tx", "tx"], ["akun", "akun"], ["tabungan", "tab"], ["rencana", "ren"], ["bisnis", "biz"]];
  data.onAuth((user) => {
    stopSubs(); closeSheet();
    S.user = user;
    if (!user) { setAuthMode("masuk"); show("authView"); return; }
    for (const [col, key] of COLS) { S[key] = []; S.loaded[col] = false; }
    S.budget = {}; S.month = todayStr().slice(0, 7);
    const h = (location.hash || "").slice(1);
    S.view = VIEWS.some((v) => v[0] === h) ? h : "beranda";
    show("appView");
    for (const [col, key] of COLS) {
      S.unsubs.push(data.watch(col, (docs, meta) => {
        S[key] = docs; S.loaded[col] = true; S.pending[col] = meta.pending; scheduleRender();
      }, (e) => { S.loaded[col] = true; scheduleRender(); toast(dataErr(e)); }));
    }
    S.unsubs.push(data.watchDoc("settings", "anggaran", (b) => { S.budget = { ...b }; scheduleRender(); }, (e) => toast(dataErr(e))));
    buildNav(); render(); checkUpdate();
  });

  let rq = 0;
  function scheduleRender() { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; render(); }); }

  /* ---------- sinkron ---------- */
  function renderSync() {
    const pending = Object.values(S.pending).some(Boolean);
    let s = "ok", t = "Tersinkron";
    if (!navigator.onLine) { s = "offline"; t = "Offline · tersimpan di perangkat"; }
    else if (pending) { s = "pending"; t = "Menyinkronkan…"; }
    for (const id of ["sync", "sync2"]) { const el = $(id); el.dataset.s = s; el.textContent = s === "offline" && id === "sync2" ? "Offline" : t; }
  }
  window.addEventListener("online", renderSync);
  window.addEventListener("offline", renderSync);

  /* ---------- cek versi baru (APK) ---------- */
  async function checkUpdate() {
    if (!env.native || !env.repo || !env.build) return;
    try {
      const last = +lsGet("kas.updCheck") || 0;
      let info = JSON.parse(lsGet("kas.updInfo") || "null");
      if (Date.now() - last >= 6 * 3600e3) {
        const r = await fetch(`https://api.github.com/repos/${env.repo}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
        if (!r.ok) return;
        const j = await r.json();
        const n = parseInt(String(j.tag_name || "").replace(/\D/g, ""), 10);
        const apk = (j.assets || []).find((a) => /\.apk$/i.test(a.name));
        info = n > env.build ? { n, url: apk ? apk.browser_download_url : j.html_url } : null;
        lsSet("kas.updCheck", String(Date.now()));
        lsSet("kas.updInfo", JSON.stringify(info));
      }
      if (info && info.n > env.build) {
        $("updText").textContent = `Versi baru 1.0.${info.n} tersedia. Unduh lalu pasang di atas aplikasi ini; datamu tetap aman.`;
        $("updLink").href = info.url;
        $("updBanner").hidden = false;
      }
    } catch (e) { /* tidak ada internet: coba lain kali */ }
  }

  /* ================= Perhitungan ================= */
  // Transaksi mengubah saldo rekening hanya jika terjadi setelah tanggal saldo awal rekening itu.
  const countsFor = (t, a) => {
    const d = a.saldoTgl || "0000-00-00";
    return t.tanggal > d || (t.tanggal === d && (t.dibuat || 0) >= (a.dibuat || 0));
  };
  function derive() {
    const akunMap = {}, tabMap = {}, renMap = {}, bizMap = {};
    S.akun.forEach((a) => (akunMap[a.id] = a)); S.tab.forEach((t) => (tabMap[t.id] = t));
    S.ren.forEach((r) => (renMap[r.id] = r)); S.biz.forEach((b) => (bizMap[b.id] = b));
    const bal = {}, pot = {};
    S.akun.forEach((a) => (bal[a.id] = +a.saldoAwal || 0));
    S.tab.forEach((p) => (pot[p.id] = +p.saldoAwal || 0));
    const m = S.month;
    const M = { masuk: 0, masukBiz: 0, keluar: 0, keluarBiz: 0, setor: 0, tarik: 0, byCat: {}, byDay: {}, n: 0 };
    const potMonth = {}, akunMonth = {}, bizMonths = {}; // bizMonths[id][YYYY-MM] = {masuk, keluar, byCat}
    let unassigned = 0;
    const add = (t, id, v) => { const a = akunMap[id]; if (a && countsFor(t, a)) bal[id] += v; };
    const am = (id, k, v) => { if (!id) return; (akunMonth[id] = akunMonth[id] || { masuk: 0, keluar: 0 })[k] += v; };
    for (const t of S.tx) {
      const amt = +t.jumlah || 0, inMonth = t.bulan === m;
      if ((t.tipe === "masuk" || t.tipe === "keluar") && !akunMap[t.akun]) unassigned++;
      if (t.bisnis) {
        const bm = ((bizMonths[t.bisnis] = bizMonths[t.bisnis] || {})[t.bulan] = bizMonths[t.bisnis][t.bulan] || { masuk: 0, keluar: 0, byCat: {} });
        if (t.tipe === "masuk") bm.masuk += amt;
        if (t.tipe === "keluar") { bm.keluar += amt; bm.byCat[t.kategori] = (bm.byCat[t.kategori] || 0) + amt; }
      }
      switch (t.tipe) {
        case "masuk":
          add(t, t.akun, amt);
          if (inMonth) { M.masuk += amt; if (t.bisnis) M.masukBiz += amt; am(t.akun, "masuk", amt); }
          break;
        case "keluar":
          add(t, t.akun, -amt);
          if (inMonth) {
            M.keluar += amt; am(t.akun, "keluar", amt);
            if (t.bisnis) M.keluarBiz += amt; else M.byCat[t.kategori] = (M.byCat[t.kategori] || 0) + amt;
            const d = +String(t.tanggal).slice(8, 10); M.byDay[d] = (M.byDay[d] || 0) + amt;
          }
          break;
        case "transfer": {
          const fee = +t.biaya || 0;
          add(t, t.akun, -(amt + fee)); add(t, t.keAkun, amt);
          if (inMonth) {
            am(t.akun, "keluar", amt + fee); am(t.keAkun, "masuk", amt);
            if (fee) { M.keluar += fee; M.byCat.admin = (M.byCat.admin || 0) + fee; const d = +String(t.tanggal).slice(8, 10); M.byDay[d] = (M.byDay[d] || 0) + fee; }
          }
          break;
        }
        case "setor":
          add(t, t.akun, -amt); if (t.tabungan in pot) pot[t.tabungan] += amt;
          if (inMonth) { M.setor += amt; am(t.akun, "keluar", amt); }
          if (t.bulan === todayStr().slice(0, 7)) potMonth[t.tabungan] = (potMonth[t.tabungan] || 0) + amt;
          break;
        case "tarik":
          add(t, t.akun, amt); if (t.tabungan in pot) pot[t.tabungan] -= amt;
          if (inMonth) { M.tarik += amt; am(t.akun, "masuk", amt); }
          if (t.bulan === todayStr().slice(0, 7)) potMonth[t.tabungan] = (potMonth[t.tabungan] || 0) - amt;
          break;
      }
      if (inMonth) M.n++;
    }
    const aktifAkun = S.akun.filter((a) => !a.arsip).sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    const aktifTab = S.tab.filter((p) => !p.arsip).sort((a, b) => (a.dibuat || 0) - (b.dibuat || 0));
    const aktifBiz = S.biz.filter((b) => !b.arsip).sort((a, b) => (a.dibuat || 0) - (b.dibuat || 0));
    const totalAkun = S.akun.reduce((s, a) => s + bal[a.id], 0);
    const totalTab = S.tab.reduce((s, p) => s + pot[p.id], 0);
    const linkedPlan = {}; S.ren.forEach((r) => { if (r.tabungan) linkedPlan[r.tabungan] = r; });
    return { akunMap, tabMap, renMap, bizMap, bal, pot, M, potMonth, akunMonth, bizMonths, unassigned, aktifAkun, aktifTab, aktifBiz, totalAkun, totalTab, linkedPlan };
  }
  function planInfo(r) {
    const p = D.tabMap[r.tabungan];
    const saldo = p ? D.pot[p.id] : 0, target = +r.target || 0;
    const cur = todayStr().slice(0, 7);
    const left = r.tenggat ? monthDiff(cur, r.tenggat) + 1 : 0; // termasuk bulan ini
    const thisMonth = p ? D.potMonth[p.id] || 0 : 0;
    const startBal = saldo - thisMonth;
    const need = left > 0 ? Math.max(0, target - startBal) / left : 0;
    let status = "", cls = "";
    if (target && saldo >= target) { status = "Tercapai"; cls = "good"; }
    else if (left <= 0) { status = "Tenggat lewat"; cls = "bad"; }
    else if (thisMonth >= need - 0.5) { status = "Bulan ini sesuai rencana"; cls = "good"; }
    else { status = `Kurang ${fmt(need - thisMonth)} bulan ini`; cls = "warn"; }
    return { p, saldo, target, left, need, thisMonth, status, cls, pct: target ? Math.min(1, Math.max(0, saldo / target)) : 0 };
  }
  const akunLabel = (id) => (D.akunMap[id] ? D.akunMap[id].nama : "Rekening terhapus");
  const tabLabel = (id) => (D.tabMap[id] ? D.tabMap[id].nama : "Tabungan terhapus");

  /* ================= Navigasi & kerangka ================= */
  function buildNav() {
    const item = (cls) => VIEWS.map(([k, n, p]) => `<button class="${cls}" data-act="nav" data-view="${k}" aria-current="${S.view === k ? "page" : "false"}">${icon(p)}<span>${n}</span></button>`).join("");
    $("sideNav").innerHTML = item("nav-item");
    $("tabBar").innerHTML = item("tab-item");
  }
  function go(view) {
    if (S.view === view) return;
    S.view = view; S.confirmId = null;
    try { history.replaceState(null, "", "#" + view); } catch (e) { /* abaikan */ }
    document.querySelectorAll("[data-act=nav]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.view === view)));
    render(); window.scrollTo(0, 0);
  }

  function render() {
    if (!S.user) return;
    D = derive();
    $("pageTitle").textContent = innerWidth <= 860 ? VIEWS.find((v) => v[0] === S.view)[1] : VIEW_TITLE[S.view];
    $("monthNav").hidden = !MONTH_VIEWS.has(S.view);
    $("monthLabel").textContent = monthName(S.month);
    $("monthToday").hidden = S.month === todayStr().slice(0, 7);
    const v = $("view");
    const ready = S.loaded.tx && S.loaded.akun;
    if (!ready) { v.innerHTML = '<div class="empty big">Memuat data…</div>'; renderSync(); return; }
    v.innerHTML = ({ beranda: vBeranda, transaksi: vTransaksi, rekening: vRekening, tabungan: vTabungan, bisnis: vBisnis })[S.view]();
    renderSync();
  }

  /* ================= Komponen kecil ================= */
  const badge = (a) => `<span class="badge j-${esc(a ? a.jenis : "lain")}" aria-hidden="true">${esc(initials(a ? a.nama : "?"))}</span>`;
  const bar = (pct, cls = "") => `<div class="track"><div class="fill ${cls}" style="width:${(Math.min(1, Math.max(0, pct)) * 100).toFixed(1)}%"></div></div>`;
  const emptyBox = (title, text, btn) => `<div class="empty"><strong>${title}</strong>${text}${btn ? `<div class="empty-act">${btn}</div>` : ""}</div>`;

  function txRow(t) {
    const today = todayStr();
    void today;
    let title = "", sub = [], amtCls = "", sign = "", amt = +t.jumlah || 0;
    if (t.tipe === "masuk" || t.tipe === "keluar") {
      title = CAT_NAME[t.kategori] || t.kategori || "Tanpa kategori";
      amtCls = t.tipe === "masuk" ? "pos" : "neg"; sign = t.tipe === "masuk" ? "+" : "−";
    } else if (t.tipe === "transfer") {
      title = `Transfer ke ${akunLabel(t.keAkun)}`; amtCls = "neu"; sign = "";
    } else if (t.tipe === "setor") {
      title = `Setor ke ${tabLabel(t.tabungan)}`; amtCls = "sav"; sign = "";
    } else if (t.tipe === "tarik") {
      title = `Tarik dari ${tabLabel(t.tabungan)}`; amtCls = "sav"; sign = "";
    }
    const chips = [];
    if (t.akun) chips.push(`<span class="chip-s">${esc(t.tipe === "transfer" ? "dari " + akunLabel(t.akun) : akunLabel(t.akun))}</span>`);
    else if (t.tipe === "masuk" || t.tipe === "keluar") chips.push('<span class="chip-s warn">belum ada rekening</span>');
    if (t.bisnis) chips.push(`<span class="chip-s biz">${esc(D.bizMap[t.bisnis] ? D.bizMap[t.bisnis].nama : "Bisnis")}</span>`);
    if (t.tipe === "transfer" && +t.biaya) chips.push(`<span class="chip-s">biaya ${fmt(t.biaya)}</span>`);
    if (t.catatan) sub.push(esc(t.catatan));
    if (S.confirmId === t.id) {
      return `<div class="row confirm"><div class="what"><div class="cat">Hapus transaksi ini?</div><div class="note">${esc(title)} · ${fmt(amt)} — saldo terkait ikut dikembalikan.</div></div><div class="confirm-actions"><button class="btn danger" data-act="tx-del" data-id="${esc(t.id)}">Hapus</button><button class="btn" data-act="tx-nodel">Batal</button></div></div>`;
    }
    return `<div class="row" data-act="tx-edit" data-id="${esc(t.id)}" tabindex="0" role="button" aria-label="Ubah ${esc(title)}">
      <div class="what"><div class="cat">${esc(title)}</div><div class="meta">${chips.join("")}${sub.length ? `<span class="note">${sub.join(" · ")}</span>` : ""}</div></div>
      <span class="amt num ${amtCls}">${sign}${fmt(amt)}</span>
      <button class="icon-btn" title="Hapus" aria-label="Hapus transaksi" data-act="tx-ask" data-id="${esc(t.id)}">✕</button></div>`;
  }
  function txGroups(rows) {
    const today = todayStr();
    const groups = {};
    for (const t of rows) (groups[t.tanggal] = groups[t.tanggal] || []).push(t);
    let h = "";
    for (const d of Object.keys(groups).sort().reverse()) {
      const dt = new Date(d + "T00:00:00");
      let net = 0;
      for (const t of groups[d]) net += t.tipe === "masuk" ? +t.jumlah : t.tipe === "keluar" ? -t.jumlah : t.tipe === "transfer" ? -(+t.biaya || 0) : 0;
      const lbl = d === today ? "Hari ini" : `${DAYS[dt.getDay()]}, ${dt.getDate()} ${MONTHS[dt.getMonth()].slice(0, 3)} ${dt.getFullYear()}`;
      h += `<div class="day"><div class="day-h"><span>${lbl}</span>${net ? `<span class="num ${net < 0 ? "neg" : "pos"}">${net < 0 ? "−" : "+"}${fmt(net)}</span>` : ""}</div>`;
      h += groups[d].sort((a, b) => (b.dibuat || 0) - (a.dibuat || 0)).map(txRow).join("") + "</div>";
    }
    return h;
  }

  /* ================= Beranda ================= */
  function vBeranda() {
    const M = D.M, net = M.masuk - M.keluar, total = D.totalAkun + D.totalTab;
    let h = "";
    // Ringkasan uang
    h += `<section class="hero">
      <div class="hero-total">
        <span class="label">Total uangmu</span>
        <span class="hero-num num${total < 0 ? " neg" : ""}">${fmtSigned(total)}</span>
        <div class="hero-split">
          <button class="split" data-act="nav" data-view="rekening"><span>Di rekening</span><b class="num">${fmtSigned(D.totalAkun)}</b></button>
          <button class="split" data-act="nav" data-view="tabungan"><span>Di tabungan</span><b class="num">${fmtSigned(D.totalTab)}</b></button>
        </div>
      </div>
      <div class="hero-month">
        <div class="stat"><span class="label">Pemasukan</span><b class="num pos">${fmt(M.masuk)}</b><small>${M.masukBiz ? `${fmtS(M.masukBiz)} dari bisnis` : "bulan ini"}</small></div>
        <div class="stat"><span class="label">Pengeluaran</span><b class="num neg">${fmt(M.keluar)}</b><small>${M.keluarBiz ? `${fmtS(M.keluarBiz)} untuk bisnis` : "bulan ini"}</small></div>
        <div class="stat"><span class="label">Selisih</span><b class="num ${net < 0 ? "neg" : ""}">${fmtSigned(net)}</b><small>${M.masuk ? (net >= 0 ? `${Math.round((net / M.masuk) * 100)}% dari pemasukan tersisa` : "pengeluaran lebih besar") : "pemasukan − pengeluaran"}</small></div>
        <div class="stat"><span class="label">Disisihkan</span><b class="num sav">${fmtSigned(M.setor - M.tarik)}</b><small>masuk ke tabungan</small></div>
      </div>
    </section>`;

    if (!D.aktifAkun.length) {
      h += `<section class="card onboard"><h2>Mulai dengan menambahkan rekening</h2><p class="muted">Tambahkan semua tempat uangmu disimpan: rekening bank, e-wallet, dan uang tunai. Isi saldonya saat ini, lalu setiap transaksi otomatis menambah atau mengurangi saldo rekening yang dipilih.</p>
      <div class="preset-row">${["BCA", "BRI", "Mandiri", "BNI", "GoPay", "DANA", "Dompet"].map((n) => `<button class="chip" data-act="akun-new" data-preset="${n}">+ ${n}</button>`).join("")}</div></section>`;
    }
    if (D.unassigned && D.aktifAkun.length) {
      h += `<section class="banner warn-b"><p><strong>${D.unassigned} transaksi lama belum terhubung ke rekening.</strong> Hubungkan supaya terlihat di riwayat rekening. Saldo rekening tidak berubah karena transaksi itu terjadi sebelum saldo awal dicatat.</p>
      <div class="banner-act"><select id="migAkun" aria-label="Pilih rekening">${D.aktifAkun.map((a) => opt(a.id, a.nama)).join("")}</select><button class="btn primary" data-act="migrate">Hubungkan</button></div></section>`;
    }

    h += '<div class="cols"><div class="col">';
    // Rekening
    if (D.aktifAkun.length) {
      h += `<section class="card"><div class="card-h"><h2>Rekening</h2><button class="btn ghost" data-act="nav" data-view="rekening">Lihat semua</button></div><div class="acc-strip">`;
      h += D.aktifAkun.map((a) => `<button class="acc-mini" data-act="akun-tx" data-id="${esc(a.id)}">${badge(a)}<span class="acc-n">${esc(a.nama)}</span><b class="num ${D.bal[a.id] < 0 ? "neg" : ""}">${fmtSigned(D.bal[a.id])}</b></button>`).join("");
      h += `</div></section>`;
    }
    // Grafik
    h += `<section class="card"><div class="card-h"><h2>Pengeluaran harian</h2><span class="label">${chartNote()}</span></div>${chart()}</section>`;
    // Transaksi terakhir
    const recent = S.tx.filter((t) => t.bulan === S.month).sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : (b.dibuat || 0) - (a.dibuat || 0))).slice(0, 6);
    h += `<section class="card"><div class="card-h"><h2>Transaksi terakhir</h2><button class="btn ghost" data-act="nav" data-view="transaksi">Lihat semua</button></div>`;
    h += recent.length ? `<div class="list">${txGroups(recent)}</div>` : emptyBox(`Belum ada transaksi di ${monthName(S.month)}.`, "Tekan tombol + untuk mencatat pemasukan, pengeluaran, transfer, atau setoran tabungan.");
    h += "</section></div><div class=\"col\">";
    // Anggaran
    h += budgetCard();
    // Rencana & tabungan
    h += `<section class="card"><div class="card-h"><h2>Rencana & tabungan</h2><button class="btn ghost" data-act="nav" data-view="tabungan">Buka</button></div>`;
    if (!S.ren.length && !D.aktifTab.length) h += emptyBox("Belum ada rencana.", "Buat rencana jangka panjang, mis. dana darurat atau DP rumah, dan lihat berapa yang perlu disisihkan tiap bulan.", '<button class="btn" data-act="ren-new">Buat rencana</button>');
    for (const r of S.ren.slice().sort((a, b) => (a.tenggat || "").localeCompare(b.tenggat || "")).slice(0, 3)) {
      const P = planInfo(r);
      h += `<div class="mini-goal"><div class="b-top"><span class="n">${esc(r.nama)}</span><span class="v num">${fmtS(P.saldo)} / ${fmtS(P.target)}</span></div>${bar(P.pct, P.cls === "bad" ? "over" : P.cls === "warn" ? "warn" : "")}<span class="b-sub ${P.cls}">${esc(P.status)}</span></div>`;
    }
    h += "</section>";
    // Bisnis
    if (D.aktifBiz.length) {
      h += `<section class="card"><div class="card-h"><h2>Laba bisnis</h2><button class="btn ghost" data-act="nav" data-view="bisnis">Buka</button></div>`;
      for (const b of D.aktifBiz) {
        const x = (D.bizMonths[b.id] || {})[S.month] || { masuk: 0, keluar: 0 }, laba = x.masuk - x.keluar;
        h += `<div class="kv"><span>${esc(b.nama)}</span><b class="num ${laba < 0 ? "neg" : "pos"}">${fmtSigned(laba)}</b></div>`;
      }
      h += "</section>";
    }
    h += "</div></div>";
    return h;
  }
  function chartNote() {
    let hi = 0, hd = 0; for (const k in D.M.byDay) if (D.M.byDay[k] > hi) { hi = D.M.byDay[k]; hd = k; }
    return hi ? `Tertinggi: tgl ${hd} · ${fmtS(hi)}` : "";
  }
  function niceMax(v) {
    if (v <= 0) return 100000;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
    return 10 * p;
  }
  function chart() {
    const W = Math.round(Math.min(720, Math.max(300, (($("view").clientWidth || 720) - 40) * (innerWidth >= 1100 ? 0.6 : 1))));
    const H = W < 500 ? 180 : 200, L = 44, R = 6, TOP = 12, B = 26, n = daysIn(S.month);
    const bt = budgetTotal(), lim = bt ? bt / n : 0;
    let mx = 0; for (const k in D.M.byDay) mx = Math.max(mx, D.M.byDay[k]);
    const top = niceMax(Math.max(mx, lim * 1.15));
    const ih = H - TOP - B, iw = W - L - R, bw = iw / n, y = (v) => TOP + ih - (v / top) * ih;
    let s = "";
    for (const f of [0, 0.5, 1]) {
      const v = top * f, yy = y(v).toFixed(1);
      s += `<line class="grid-l" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="ax" x="${L - 6}" y="${(+yy + 3.5).toFixed(1)}" text-anchor="end">${v ? fmtS(v) : "0"}</text>`;
    }
    const today = todayStr(), isCur = S.month === today.slice(0, 7), td = +today.slice(8, 10);
    for (let d = 1; d <= n; d++) {
      const v = D.M.byDay[d] || 0, x = L + (d - 1) * bw + bw * 0.18, w = bw * 0.64;
      if (v > 0) {
        const yy = y(v), cls = "bar" + (isCur && d === td ? " today" : "") + (lim && v > lim ? " over" : "");
        s += `<rect class="${cls}" x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(1, TOP + ih - yy).toFixed(1)}" rx="2"><title>${d} ${MONTHS[+S.month.slice(5) - 1]}: ${fmt(v)}</title></rect>`;
      }
      if (d === 1 || d % 5 === 0) s += `<text class="ax" x="${(L + (d - 0.5) * bw).toFixed(1)}" y="${H - 8}" text-anchor="middle">${d}</text>`;
    }
    if (lim) {
      const yy = y(lim).toFixed(1);
      s += `<line class="lim" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="lim-t" x="${W - R}" y="${(+yy - 5).toFixed(1)}" text-anchor="end">${fmtS(lim)}/hari</text>`;
    }
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik pengeluaran per hari">${s}</svg>
      <div class="legend"><span><i class="sw-acc"></i>Pengeluaran per hari</span>${lim ? '<span><i class="sw-out"></i>Melewati jatah harian</span><span><i class="sw-warn"></i>Jatah harian dari anggaran</span>' : ""}</div>`;
  }
  const budgetTotal = () => CATS.keluar.reduce((s, [k]) => s + (+S.budget[k] || 0), 0);
  function budgetCard() {
    const bt = budgetTotal();
    let spent = 0; for (const [k] of CATS.keluar) spent += D.M.byCat[k] || 0;
    let h = `<section class="card"><div class="card-h"><h2>Anggaran pribadi</h2><button class="btn ghost" data-act="budget-edit">Ubah</button></div>`;
    if (!bt && !spent) return h + emptyBox("Belum ada anggaran.", "Tetapkan batas belanja tiap kategori per bulan. Pengeluaran bisnis tidak dihitung di sini.", '<button class="btn" data-act="budget-edit">Atur anggaran</button>') + "</section>";
    if (bt) {
      const left = bt - spent;
      h += `<div class="b-total"><div><div class="label">Sisa anggaran</div><div class="left num ${left < 0 ? "neg" : ""}">${fmtSigned(left)}</div></div><div class="of num">${fmtS(spent)} dari ${fmtS(bt)}<br>terpakai ${Math.round((spent / bt) * 100)}%</div></div>`;
    }
    const rows = CATS.keluar.map(([k, n]) => ({ k, n, b: +S.budget[k] || 0, s: D.M.byCat[k] || 0 })).filter((r) => r.b || r.s)
      .sort((a, b) => (b.b ? b.s / b.b : 9) - (a.b ? a.s / a.b : 9));
    for (const r of rows) {
      const p = r.b ? r.s / r.b : 1, st = !r.b ? "over" : p > 1 ? "over" : p >= 0.85 ? "warn" : "";
      const sub = !r.b ? "Tanpa anggaran" : p > 1 ? `Lewat ${fmt(r.s - r.b)}` : `Sisa ${fmt(r.b - r.s)}`;
      h += `<div class="b-row"><div class="b-top"><span class="n">${r.n}</span><span class="v num">${fmtS(r.s)} / ${r.b ? fmtS(r.b) : "—"}</span></div>${bar(p, st)}<span class="b-sub ${st}">${sub}</span></div>`;
    }
    return h + "</section>";
  }

  /* ================= Transaksi ================= */
  function filteredTx() {
    const f = S.f, q = f.q.trim().toLowerCase();
    return S.tx.filter((t) => {
      if (t.bulan !== S.month) return false;
      if (f.tipe === "masuk" || f.tipe === "keluar" || f.tipe === "transfer") { if (t.tipe !== f.tipe) return false; }
      else if (f.tipe === "tabungan" && t.tipe !== "setor" && t.tipe !== "tarik") return false;
      if (f.akun && t.akun !== f.akun && t.keAkun !== f.akun) return false;
      if (f.scope === "pribadi" && t.bisnis) return false;
      if (f.scope && f.scope !== "pribadi" && t.bisnis !== f.scope) return false;
      if (q) {
        const hay = [t.catatan, CAT_NAME[t.kategori], akunLabel(t.akun), t.keAkun && akunLabel(t.keAkun), t.tabungan && tabLabel(t.tabungan)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }
  function vTransaksi() {
    const f = S.f, rows = filteredTx();
    let mi = 0, mo = 0; for (const t of rows) { if (t.tipe === "masuk") mi += +t.jumlah; if (t.tipe === "keluar") mo += +t.jumlah; if (t.tipe === "transfer") mo += +t.biaya || 0; }
    const chips = [["semua", "Semua"], ["keluar", "Keluar"], ["masuk", "Masuk"], ["transfer", "Transfer"], ["tabungan", "Tabungan"]]
      .map(([k, n]) => `<button class="chip" data-act="f-tipe" data-v="${k}" aria-pressed="${f.tipe === k}">${n}</button>`).join("");
    let h = `<section class="card"><div class="filters">${chips}</div>
      <div class="filter-row">
        <select id="fAkun" aria-label="Filter rekening">${opt("", "Semua rekening", f.akun)}${S.akun.map((a) => opt(a.id, a.nama + (a.arsip ? " (arsip)" : ""), f.akun)).join("")}</select>
        <select id="fScope" aria-label="Filter pribadi atau bisnis">${opt("", "Pribadi & bisnis", f.scope)}${opt("pribadi", "Pribadi saja", f.scope)}${S.biz.map((b) => opt(b.id, "Bisnis: " + b.nama, f.scope)).join("")}</select>
        <input class="search" id="fQ" type="search" placeholder="Cari catatan, kategori…" aria-label="Cari transaksi" value="${esc(f.q)}">
      </div>
      <div class="sum-line"><span>${rows.length} transaksi</span><span>Masuk <b class="num pos">${fmt(mi)}</b></span><span>Keluar <b class="num neg">${fmt(mo)}</b></span>${env.native ? "" : '<button class="btn ghost small" data-act="csv">Unduh CSV</button>'}</div>
      </section>`;
    h += `<section class="card"><div class="list">`;
    if (!S.tx.some((t) => t.bulan === S.month)) h += emptyBox(`Belum ada transaksi di ${monthName(S.month)}.`, "Tekan tombol + untuk mencatat yang pertama.");
    else if (!rows.length) h += emptyBox("Tidak ada yang cocok.", "Ubah filter atau kata pencarian.");
    else h += txGroups(rows);
    return h + "</div></section>";
  }

  /* ================= Rekening ================= */
  function vRekening() {
    let h = `<section class="hero slim"><div class="hero-total"><span class="label">Total di semua rekening</span><span class="hero-num num${D.totalAkun < 0 ? " neg" : ""}">${fmtSigned(D.totalAkun)}</span></div>
      <div class="hero-btns"><button class="btn primary" data-act="akun-new">+ Tambah rekening</button><button class="btn" data-act="add-tx" data-tipe="transfer" ${D.aktifAkun.length < 2 ? "disabled" : ""}>Transfer antar rekening</button></div></section>`;
    if (!D.aktifAkun.length) {
      return h + `<section class="card">${emptyBox("Belum ada rekening.", "Tambahkan rekening bank, e-wallet, atau uang tunai beserta saldonya saat ini.", '<button class="btn primary" data-act="akun-new">Tambah rekening</button>')}</section>`;
    }
    for (const [j, jn] of JENIS) {
      const list = D.aktifAkun.filter((a) => (a.jenis || "lain") === j);
      if (!list.length) continue;
      const sub = list.reduce((s, a) => s + D.bal[a.id], 0);
      h += `<section class="group"><div class="group-h"><h2>${jn}</h2><span class="num muted">${fmtSigned(sub)}</span></div><div class="acc-grid">`;
      for (const a of list) {
        const mm = D.akunMonth[a.id] || { masuk: 0, keluar: 0 };
        h += `<article class="card acc">
          <div class="acc-top">${badge(a)}<div class="acc-name"><b>${esc(a.nama)}</b><span class="muted small">${JENIS_NAME[a.jenis] || "Lainnya"}</span></div><button class="btn ghost small" data-act="akun-edit" data-id="${esc(a.id)}">Ubah</button></div>
          <div class="acc-bal num ${D.bal[a.id] < 0 ? "neg" : ""}">${fmtSigned(D.bal[a.id])}</div>
          <div class="acc-flow"><span>Bulan ini masuk <b class="num pos">${fmtS(mm.masuk)}</b></span><span>keluar <b class="num neg">${fmtS(mm.keluar)}</b></span></div>
          <div class="acc-act"><button class="btn small" data-act="add-tx" data-tipe="keluar" data-akun="${esc(a.id)}">Catat</button><button class="btn small" data-act="add-tx" data-tipe="transfer" data-akun="${esc(a.id)}" ${D.aktifAkun.length < 2 ? "disabled" : ""}>Transfer</button><button class="btn small" data-act="akun-tx" data-id="${esc(a.id)}">Riwayat</button></div>
        </article>`;
      }
      h += "</div></section>";
    }
    const arch = S.akun.filter((a) => a.arsip);
    if (arch.length) {
      h += `<section class="group"><button class="btn ghost" data-act="toggle-arch">${S.showArchived ? "Sembunyikan" : "Tampilkan"} ${arch.length} rekening diarsipkan</button>`;
      if (S.showArchived) h += `<div class="card list">${arch.map((a) => `<div class="kv"><span>${badge(a)} ${esc(a.nama)}</span><span class="num muted">${fmtSigned(D.bal[a.id])}</span><button class="btn ghost small" data-act="akun-edit" data-id="${esc(a.id)}">Ubah</button></div>`).join("")}</div>`;
      h += "</section>";
    }
    return h;
  }

  /* ================= Tabungan & Rencana ================= */
  function vTabungan() {
    let h = `<section class="hero slim"><div class="hero-total"><span class="label">Total tabungan</span><span class="hero-num num sav">${fmtSigned(D.totalTab)}</span><small class="muted">Uang yang sudah kamu sisihkan dari rekening.</small></div>
      <div class="hero-btns"><button class="btn primary" data-act="ren-new">+ Rencana baru</button><button class="btn" data-act="tab-new">+ Tabungan baru</button></div></section>`;
    // Rencana
    h += `<section class="group"><div class="group-h"><h2>Rencana jangka panjang</h2></div>`;
    if (!S.ren.length) {
      h += `<div class="card">${emptyBox("Belum ada rencana.", "Contoh: Dana darurat Rp 20 jt sampai Des 2027, DP rumah Rp 150 jt sampai 2030. Aplikasi menghitung berapa yang perlu disisihkan tiap bulan.", '<button class="btn primary" data-act="ren-new">Buat rencana</button>')}</div>`;
    } else {
      h += '<div class="goal-grid">';
      for (const r of S.ren.slice().sort((a, b) => (a.tenggat || "").localeCompare(b.tenggat || ""))) {
        const P = planInfo(r);
        const leftTxt = P.left > 0 ? (P.left >= 24 ? `${Math.floor(P.left / 12)} tahun ${P.left % 12 ? (P.left % 12) + " bulan " : ""}lagi` : `${P.left} bulan lagi`) : "tenggat sudah lewat";
        h += `<article class="card goal">
          <div class="goal-h"><div><b class="goal-n">${esc(r.nama)}</b><span class="muted small">Target ${r.tenggat ? monthShort(r.tenggat) : "—"} · ${leftTxt}</span></div><button class="btn ghost small" data-act="ren-edit" data-id="${esc(r.id)}">Ubah</button></div>
          <div class="goal-nums"><span class="num big2">${fmt(P.saldo)}</span><span class="muted num">dari ${fmt(P.target)}</span></div>
          ${bar(P.pct, P.cls === "bad" ? "over" : P.cls === "warn" ? "warn" : "")}
          <div class="goal-grid2">
            <div><span class="label">Perlu per bulan</span><b class="num">${P.target && P.saldo >= P.target ? "—" : fmt(P.need)}</b></div>
            <div><span class="label">Bulan ini</span><b class="num sav">${fmtSigned(P.thisMonth)}</b></div>
          </div>
          <span class="pill ${P.cls}">${esc(P.status)}</span>
          <div class="goal-foot"><span class="muted small">Dana di tabungan <b>${esc(P.p ? P.p.nama : "—")}</b></span>${P.p ? `<button class="btn small primary" data-act="add-tx" data-tipe="tabungan" data-arah="setor" data-tab="${esc(P.p.id)}">Setor</button>` : ""}</div>
        </article>`;
      }
      h += "</div>";
    }
    h += "</section>";
    // Tabungan
    h += `<section class="group"><div class="group-h"><h2>Tabungan</h2></div>`;
    if (!D.aktifTab.length) {
      h += `<div class="card">${emptyBox("Belum ada tabungan.", "Buat pos tabungan, mis. Liburan atau Ganti HP. Setor dari rekening mana saja: saldo rekening berkurang, tabungan bertambah.", '<button class="btn primary" data-act="tab-new">Buat tabungan</button>')}</div>`;
    } else {
      h += '<div class="goal-grid">';
      for (const p of D.aktifTab) {
        const bal = D.pot[p.id], tg = +p.target || 0, plan = D.linkedPlan[p.id];
        h += `<article class="card goal">
          <div class="goal-h"><div><b class="goal-n">${esc(p.nama)}</b><span class="muted small">${plan ? `Untuk rencana ${esc(plan.nama)}` : p.lokasi ? `Disimpan di ${esc(p.lokasi)}` : "Pos tabungan"}</span></div><button class="btn ghost small" data-act="tab-edit" data-id="${esc(p.id)}">Ubah</button></div>
          <div class="goal-nums"><span class="num big2 sav">${fmtSigned(bal)}</span>${tg ? `<span class="muted num">dari ${fmt(tg)}</span>` : ""}</div>
          ${tg ? bar(bal / tg) + `<span class="b-sub">${bal >= tg ? "Target tercapai" : `Kurang ${fmt(tg - bal)} · ${Math.round((bal / tg) * 100)}%`}</span>` : ""}
          <div class="acc-act"><button class="btn small primary" data-act="add-tx" data-tipe="tabungan" data-arah="setor" data-tab="${esc(p.id)}">Setor</button><button class="btn small" data-act="add-tx" data-tipe="tabungan" data-arah="tarik" data-tab="${esc(p.id)}" ${bal <= 0 ? "disabled" : ""}>Tarik</button></div>
        </article>`;
      }
      h += "</div>";
    }
    return h + "</section>";
  }

  /* ================= Bisnis ================= */
  function vBisnis() {
    let h = "";
    if (!D.aktifBiz.length) {
      return `<section class="card">${emptyBox("Belum ada bisnis.", "Tambahkan usahamu sendiri. Pemasukan (penjualan, jasa) dan biayanya (stok, ongkir, iklan) dicatat terpisah dari keuangan pribadi, lalu labanya dihitung tiap bulan. Uangnya tetap masuk dan keluar dari rekening yang kamu pilih.", '<button class="btn primary" data-act="biz-new">Tambah bisnis</button>')}</section>`;
    }
    let tm = 0, tk = 0;
    for (const b of D.aktifBiz) { const x = (D.bizMonths[b.id] || {})[S.month] || { masuk: 0, keluar: 0 }; tm += x.masuk; tk += x.keluar; }
    const tl = tm - tk;
    h += `<section class="hero"><div class="hero-total"><span class="label">Laba semua bisnis · ${monthName(S.month)}</span><span class="hero-num num ${tl < 0 ? "neg" : "pos"}">${fmtSigned(tl)}</span>
      <div class="hero-split"><div class="split"><span>Pemasukan</span><b class="num pos">${fmt(tm)}</b></div><div class="split"><span>Biaya</span><b class="num neg">${fmt(tk)}</b></div></div></div>
      <div class="hero-btns"><button class="btn" data-act="biz-new">+ Tambah bisnis</button></div></section>`;
    h += '<div class="goal-grid wide">';
    for (const b of D.aktifBiz) {
      const months = D.bizMonths[b.id] || {}, x = months[S.month] || { masuk: 0, keluar: 0, byCat: {} }, laba = x.masuk - x.keluar;
      const margin = x.masuk ? Math.round((laba / x.masuk) * 100) : null;
      const last = []; for (let i = 5; i >= 0; i--) { const m = shiftMonth(S.month, -i), y = months[m] || { masuk: 0, keluar: 0 }; last.push([m, y.masuk - y.keluar]); }
      const top = Object.entries(x.byCat || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
      h += `<article class="card biz">
        <div class="goal-h"><div><b class="goal-n">${esc(b.nama)}</b><span class="muted small">${esc(b.deskripsi || "Bisnis")}</span></div><button class="btn ghost small" data-act="biz-edit" data-id="${esc(b.id)}">Ubah</button></div>
        <div class="biz-nums">
          <div><span class="label">Pemasukan</span><b class="num pos">${fmt(x.masuk)}</b></div>
          <div><span class="label">Biaya</span><b class="num neg">${fmt(x.keluar)}</b></div>
          <div><span class="label">Laba</span><b class="num ${laba < 0 ? "neg" : "pos"}">${fmtSigned(laba)}</b>${margin !== null ? `<small class="muted">margin ${margin}%</small>` : ""}</div>
        </div>
        <div class="label">Laba 6 bulan terakhir</div>${miniBars(last)}
        ${top.length ? `<div class="label">Biaya terbesar bulan ini</div>${top.map(([k, v]) => `<div class="kv"><span>${esc(CAT_NAME[k] || k)}</span><span class="num">${fmt(v)}</span></div>`).join("")}` : ""}
        <div class="acc-act"><button class="btn small primary" data-act="add-tx" data-tipe="masuk" data-biz="${esc(b.id)}">+ Pemasukan</button><button class="btn small" data-act="add-tx" data-tipe="keluar" data-biz="${esc(b.id)}">+ Biaya</button><button class="btn small" data-act="biz-tx" data-id="${esc(b.id)}">Riwayat</button></div>
      </article>`;
    }
    h += "</div>";
    const arch = S.biz.filter((b) => b.arsip);
    if (arch.length) h += `<p class="muted small">${arch.length} bisnis diarsipkan: ${arch.map((b) => `<button class="link" data-act="biz-edit" data-id="${esc(b.id)}">${esc(b.nama)}</button>`).join(", ")}</p>`;
    return h;
  }
  function miniBars(rows) {
    const W = 300, H = 92, B = 18, T = 14, max = Math.max(1, ...rows.map((r) => Math.abs(r[1])));
    const hasNeg = rows.some((r) => r[1] < 0), base = hasNeg ? T + (H - T - B) / 2 : H - B, scale = hasNeg ? (H - T - B) / 2 : H - T - B;
    const bw = W / rows.length;
    let s = `<line class="grid-l" x1="0" x2="${W}" y1="${base}" y2="${base}"/>`;
    rows.forEach(([m, v], i) => {
      const hgt = (Math.abs(v) / max) * scale, x = i * bw + bw * 0.22, w = bw * 0.56;
      if (v) s += `<rect class="${v < 0 ? "bar over" : "bar pos-b"}" x="${x.toFixed(1)}" y="${(v < 0 ? base : base - hgt).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(1, hgt).toFixed(1)}" rx="2"><title>${monthShort(m)}: ${fmtSigned(v)}</title></rect>`;
      if (v && i === rows.length - 1) s += `<text class="ax" x="${(x + w / 2).toFixed(1)}" y="${(v < 0 ? base + hgt + 11 : base - hgt - 3).toFixed(1)}" text-anchor="middle">${fmtS(v)}</text>`;
      s += `<text class="ax" x="${(x + w / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle">${MONTHS[+m.slice(5) - 1].slice(0, 3)}</text>`;
    });
    return `<svg class="chart mini" viewBox="0 0 ${W} ${H}" role="img" aria-label="Laba enam bulan terakhir">${s}</svg>`;
  }

  /* ================= Lembar (sheet) ================= */
  let sheetOnClose = null;
  function openSheet(title, html, onBind) {
    $("sheetTitle").textContent = title;
    $("sheetBody").innerHTML = html;
    $("sheet").hidden = false;
    document.body.classList.add("locked");
    if (onBind) onBind($("sheetBody"));
    const first = $("sheetBody").querySelector("[autofocus]");
    if (first && innerWidth > 700) first.focus();
  }
  function closeSheet() {
    if ($("sheet").hidden) return;
    $("sheet").hidden = true; $("sheetBody").innerHTML = "";
    document.body.classList.remove("locked");
    if (sheetOnClose) { const f = sheetOnClose; sheetOnClose = null; f(); }
  }
  $("sheet").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
  const field = (id, label, inner, hint) => `<div class="field"><label for="${id}">${label}</label>${inner}${hint ? `<small class="muted">${hint}</small>` : ""}</div>`;
  const moneyInput = (id, val, extra = "") => `<div class="money"><span>Rp</span><input id="${id}" inputmode="numeric" autocomplete="off" placeholder="0" value="${moneyVal(val)}" ${extra}></div>`;
  function bindMoney(root) {
    root.querySelectorAll(".money input").forEach((i) => i.addEventListener("input", () => { const v = parseMoney(i.value); i.value = v ? v.toLocaleString("id-ID") : ""; }));
  }
  const errBox = '<p class="err" id="sErr" role="alert" hidden></p>';
  function sheetErr(msg) { const e = $("sErr"); if (e) { e.textContent = msg; e.hidden = !msg; } }

  /* ---------- formulir transaksi ---------- */
  function openTx(o = {}) {
    const ed = o.id ? S.tx.find((t) => t.id === o.id) : null;
    const F = ed ? {
      id: ed.id, tipe: ed.tipe === "setor" || ed.tipe === "tarik" ? "tabungan" : ed.tipe, arah: ed.tipe === "tarik" ? "tarik" : "setor",
      jumlah: +ed.jumlah, akun: ed.akun || "", keAkun: ed.keAkun || "", biaya: +ed.biaya || 0, scope: ed.bisnis || "pribadi",
      kategori: ed.kategori || "", tabungan: ed.tabungan || "", tanggal: ed.tanggal, catatan: ed.catatan || "", dibuat: ed.dibuat,
    } : {
      id: null, tipe: o.tipe || "keluar", arah: o.arah || "setor", jumlah: 0, akun: o.akun || lsGet("kas.lastAkun") || "",
      keAkun: "", biaya: 0, scope: o.biz || "pribadi", kategori: "", tabungan: o.tab || "",
      tanggal: S.month === todayStr().slice(0, 7) ? todayStr() : S.month + "-01", catatan: "",
    };
    const akunList = D.aktifAkun.concat(ed ? S.akun.filter((a) => a.arsip && (a.id === F.akun || a.id === F.keAkun)) : []);
    if (!akunList.some((a) => a.id === F.akun)) F.akun = akunList[0] ? akunList[0].id : "";
    if (F.tipe === "transfer" && !F.keAkun) { const other = akunList.find((a) => a.id !== F.akun); F.keAkun = other ? other.id : ""; }

    function read() {
      const g = (id) => { const el = $(id); return el ? el.value : undefined; };
      if ($("tJml")) F.jumlah = parseMoney(g("tJml"));
      if ($("tAkun")) F.akun = g("tAkun");
      if ($("tKe")) F.keAkun = g("tKe");
      if ($("tBiaya")) F.biaya = parseMoney(g("tBiaya"));
      if ($("tScope")) F.scope = g("tScope");
      if ($("tCat")) F.kategori = g("tCat");
      if ($("tTab")) F.tabungan = g("tTab");
      if ($("tTgl")) F.tanggal = g("tTgl");
      if ($("tNote")) F.catatan = g("tNote");
    }
    function catList() { const g = F.scope === "pribadi" ? CATS : BIZ_CATS; return g[F.tipe] || []; }
    function draw() {
      if (!akunList.length) {
        openSheet("Catat transaksi", emptyBox("Tambahkan rekening dulu.", "Setiap transaksi dicatat dari atau ke rekening tertentu, supaya saldonya otomatis berubah.", '<button class="btn primary" data-act="akun-new">Tambah rekening</button>'));
        return;
      }
      const types = [["keluar", "Keluar"], ["masuk", "Masuk"], ["transfer", "Transfer"], ["tabungan", "Tabungan"]];
      let h = `<div class="seg four" role="group" aria-label="Jenis transaksi">${types.map(([k, n]) => `<button type="button" data-t="${k}" aria-pressed="${F.tipe === k}" ${k === "transfer" && akunList.length < 2 ? "disabled" : ""}>${n}</button>`).join("")}</div><form id="txF" novalidate>`;
      if (F.tipe === "tabungan") {
        h += `<div class="seg" role="group" aria-label="Setor atau tarik"><button type="button" data-arah="setor" aria-pressed="${F.arah === "setor"}">Setor ke tabungan</button><button type="button" data-arah="tarik" aria-pressed="${F.arah === "tarik"}">Tarik dari tabungan</button></div>`;
      }
      h += field("tJml", "Jumlah", moneyInput("tJml", F.jumlah, "autofocus") + '<div class="quick">' + [10000, 50000, 100000, 500000].map((v) => `<button type="button" data-add="${v}">+${fmtS(v)}</button>`).join("") + "</div>");
      const akOpts = (sel) => akunList.map((a) => opt(a.id, `${a.nama} · ${fmtSigned(D.bal[a.id])}`, sel)).join("");
      if (F.tipe === "keluar" || F.tipe === "masuk") {
        if (!catList().some((c) => c[0] === F.kategori)) F.kategori = catList()[0][0];
        h += field("tAkun", F.tipe === "masuk" ? "Masuk ke rekening" : "Dibayar dari rekening", `<select id="tAkun">${akOpts(F.akun)}</select>`);
        h += `<div class="pair">${field("tScope", "Untuk", `<select id="tScope">${opt("pribadi", "Pribadi", F.scope)}${D.aktifBiz.concat(S.biz.filter((b) => b.arsip && b.id === F.scope)).map((b) => opt(b.id, "Bisnis: " + b.nama, F.scope)).join("")}</select>`)}
          ${field("tCat", "Kategori", `<select id="tCat">${catList().map(([k, n]) => opt(k, n, F.kategori)).join("")}</select>`)}</div>`;
      } else if (F.tipe === "transfer") {
        h += `<div class="pair">${field("tAkun", "Dari", `<select id="tAkun">${akOpts(F.akun)}</select>`)}${field("tKe", "Ke", `<select id="tKe">${akOpts(F.keAkun)}</select>`)}</div>`;
        h += field("tBiaya", "Biaya admin (jika ada)", moneyInput("tBiaya", F.biaya), "Dicatat sebagai pengeluaran Biaya Admin Bank.");
      } else {
        const pots = D.aktifTab.concat(S.tab.filter((p) => p.arsip && p.id === F.tabungan));
        if (!pots.length) {
          h += emptyBox("Belum ada tabungan.", "Buat pos tabungan dulu, lalu setor dari rekening mana saja.", '<button class="btn primary" type="button" data-act="tab-new">Buat tabungan</button>');
        } else {
          if (!pots.some((p) => p.id === F.tabungan)) F.tabungan = pots[0].id;
          h += `<div class="pair">${field("tTab", "Tabungan", `<select id="tTab">${pots.map((p) => opt(p.id, `${p.nama} · ${fmtSigned(D.pot[p.id])}`, F.tabungan)).join("")}</select>`)}
            ${field("tAkun", F.arah === "setor" ? "Diambil dari rekening" : "Masuk ke rekening", `<select id="tAkun">${akOpts(F.akun)}</select>`)}</div>`;
        }
      }
      h += `<div class="pair">${field("tTgl", "Tanggal", `<input id="tTgl" type="date" value="${esc(F.tanggal)}">`)}${field("tNote", "Catatan", `<input id="tNote" maxlength="120" value="${esc(F.catatan)}" placeholder="opsional">`)}</div>`;
      h += `<div class="preview" id="tPrev" aria-live="polite"></div>${errBox}
        <div class="form-actions"><button class="btn primary" type="submit">${F.id ? "Simpan perubahan" : "Simpan"}</button>${F.id ? '<button class="btn danger-o" type="button" id="tDel">Hapus</button>' : ""}</div></form>`;
      openSheet(F.id ? "Ubah transaksi" : "Catat transaksi", h, bind);
      preview();
    }
    // Saldo setelah transaksi, tanpa menghitung versi lama transaksi yang sedang diubah.
    function preview() {
      read();
      const el = $("tPrev"); if (!el) return;
      const base = (id) => {
        let b = D.bal[id] || 0;
        if (ed) {
          const a = D.akunMap[id], amt = +ed.jumlah || 0;
          if (a && countsFor(ed, a)) {
            if (ed.akun === id) b -= ed.tipe === "masuk" || ed.tipe === "tarik" ? amt : -(amt + (ed.tipe === "transfer" ? +ed.biaya || 0 : 0));
            if (ed.tipe === "transfer" && ed.keAkun === id) b -= amt;
          }
        }
        return b;
      };
      const potBase = (id) => { let b = D.pot[id] || 0; if (ed && ed.tabungan === id) b -= ed.tipe === "setor" ? +ed.jumlah : -ed.jumlah; return b; };
      const line = (name, from, to) => `<div class="pv"><span>${esc(name)}</span><span class="num">${fmtSigned(from)} → <b class="${to < 0 ? "neg" : ""}">${fmtSigned(to)}</b></span></div>`;
      const j = F.jumlah;
      let h = "";
      if (!j) { el.innerHTML = ""; return; }
      if (F.tipe === "keluar" || F.tipe === "masuk") { const b = base(F.akun); h = line(akunLabel(F.akun), b, b + (F.tipe === "masuk" ? j : -j)); }
      else if (F.tipe === "transfer") {
        if (F.akun === F.keAkun) { el.innerHTML = '<p class="err">Rekening asal dan tujuan harus berbeda.</p>'; return; }
        const a = base(F.akun), b = base(F.keAkun); h = line(akunLabel(F.akun), a, a - j - F.biaya) + line(akunLabel(F.keAkun), b, b + j);
      } else if (F.tabungan) {
        const a = base(F.akun), p = potBase(F.tabungan), s = F.arah === "setor" ? 1 : -1;
        h = line(akunLabel(F.akun), a, a - s * j) + line(tabLabel(F.tabungan), p, p + s * j);
      }
      el.innerHTML = h ? `<span class="label">Saldo setelah disimpan</span>${h}` : "";
    }
    function bind(root) {
      bindMoney(root);
      root.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => {
        read(); F.tipe = b.dataset.t;
        if (F.tipe === "transfer" && (!F.keAkun || F.keAkun === F.akun)) { const o2 = akunList.find((a) => a.id !== F.akun); F.keAkun = o2 ? o2.id : ""; }
        draw();
      }));
      root.querySelectorAll("[data-arah]").forEach((b) => (b.onclick = () => { read(); F.arah = b.dataset.arah; draw(); }));
      root.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => { const i = $("tJml"); i.value = (parseMoney(i.value) + +b.dataset.add).toLocaleString("id-ID"); preview(); }));
      const sc = $("tScope"); if (sc) sc.onchange = () => { read(); F.kategori = ""; draw(); };
      root.querySelectorAll("input,select").forEach((i) => i.addEventListener(i.tagName === "SELECT" ? "change" : "input", preview));
      const del = $("tDel");
      if (del) del.onclick = () => {
        if (del.dataset.sure) { write(data.remove("tx", F.id)); closeSheet(); toast("Transaksi dihapus"); return; }
        del.dataset.sure = "1"; del.textContent = "Yakin hapus?"; del.classList.add("danger");
      };
      $("txF").onsubmit = (e) => { e.preventDefault(); save(); };
    }
    function save() {
      read();
      if (!F.jumlah) return sheetErr("Isi jumlah uangnya dulu.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(F.tanggal || "")) return sheetErr("Pilih tanggal transaksi.");
      if (!F.akun) return sheetErr("Pilih rekening.");
      const rec = { tanggal: F.tanggal, bulan: F.tanggal.slice(0, 7), catatan: (F.catatan || "").trim().slice(0, 120), jumlah: F.jumlah, akun: F.akun, dibuat: F.dibuat || Date.now() };
      if (F.tipe === "keluar" || F.tipe === "masuk") Object.assign(rec, { tipe: F.tipe, kategori: F.kategori, bisnis: F.scope === "pribadi" ? null : F.scope });
      else if (F.tipe === "transfer") {
        if (!F.keAkun || F.keAkun === F.akun) return sheetErr("Pilih rekening tujuan yang berbeda.");
        Object.assign(rec, { tipe: "transfer", keAkun: F.keAkun, biaya: F.biaya || 0 });
      } else {
        if (!F.tabungan) return sheetErr("Buat atau pilih tabungan dulu.");
        Object.assign(rec, { tipe: F.arah, tabungan: F.tabungan });
      }
      lsSet("kas.lastAkun", F.akun);
      write(data.save("tx", F.id || data.newId("tx"), rec));
      closeSheet();
      toast(rec.bulan !== S.month ? `Tersimpan di ${monthName(rec.bulan)}` : F.id ? "Perubahan disimpan" : "Transaksi tersimpan");
    }
    draw();
  }

  /* ---------- formulir rekening ---------- */
  function openAkun(id, preset) {
    const a = id ? D.akunMap[id] : null;
    const F = { jenis: a ? a.jenis || "lain" : preset ? (Object.keys(PRESETS).find((k) => PRESETS[k].includes(preset)) || "bank") : "bank", nama: a ? a.nama : preset || "" };
    const cur = a ? D.bal[a.id] : 0;
    function draw() {
      const used = S.tx.some((t) => t.akun === id || t.keAkun === id);
      let h = `<div class="seg four" role="group" aria-label="Jenis rekening">${JENIS.map(([k, n]) => `<button type="button" data-j="${k}" aria-pressed="${F.jenis === k}">${n}</button>`).join("")}</div><form id="aF" novalidate>`;
      h += `<div class="preset-row">${PRESETS[F.jenis].map((n) => `<button type="button" class="chip" data-p="${esc(n)}">${esc(n)}</button>`).join("")}</div>`;
      h += field("aNama", "Nama", `<input id="aNama" maxlength="40" value="${esc(F.nama)}" placeholder="mis. BCA Tahapan" autofocus>`);
      h += field("aSaldo", "Saldo sekarang", moneyInput("aSaldo", Math.max(0, cur)), a ? "Ubah bila berbeda dengan saldo asli; aplikasi menyesuaikannya tanpa mengubah riwayat." : "Isi saldo yang ada di rekening ini sekarang. Transaksi baru akan menambah atau menguranginya.");
      h += `${errBox}<div class="form-actions"><button class="btn primary" type="submit">${a ? "Simpan" : "Tambah rekening"}</button>`;
      if (a) h += a.arsip ? '<button class="btn" type="button" id="aArch">Aktifkan lagi</button>' : `<button class="btn" type="button" id="aArch">Arsipkan</button>`;
      if (a && !used) h += '<button class="btn danger-o" type="button" id="aDel">Hapus</button>';
      h += "</div>";
      if (a && used) h += '<p class="muted small">Rekening yang sudah punya transaksi tidak bisa dihapus, tapi bisa diarsipkan supaya tidak muncul di pilihan.</p>';
      openSheet(a ? "Ubah rekening" : "Tambah rekening", h + "</form>", (root) => {
        bindMoney(root);
        root.querySelectorAll("[data-j]").forEach((b) => (b.onclick = () => { F.nama = $("aNama").value; F.jenis = b.dataset.j; draw(); }));
        root.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => { $("aNama").value = b.dataset.p; }));
        const ar = $("aArch"); if (ar) ar.onclick = () => { write(data.patch("akun", a.id, { arsip: !a.arsip })); closeSheet(); toast(a.arsip ? "Rekening diaktifkan" : "Rekening diarsipkan"); };
        const dl = $("aDel"); if (dl) dl.onclick = () => {
          if (dl.dataset.sure) { write(data.remove("akun", a.id)); closeSheet(); toast("Rekening dihapus"); return; }
          dl.dataset.sure = "1"; dl.textContent = "Yakin hapus?"; dl.classList.add("danger");
        };
        $("aF").onsubmit = (e) => {
          e.preventDefault();
          const nama = $("aNama").value.trim(), saldo = parseMoney($("aSaldo").value);
          if (!nama) return sheetErr("Beri nama rekeningnya.");
          if (a) {
            const upd = { nama, jenis: F.jenis };
            if (saldo !== Math.max(0, cur)) upd.saldoAwal = (+a.saldoAwal || 0) + (saldo - cur);
            write(data.patch("akun", a.id, upd)); toast("Rekening disimpan");
          } else {
            const now = Date.now();
            write(data.save("akun", data.newId("akun"), { nama, jenis: F.jenis, saldoAwal: saldo, saldoTgl: todayStr(), dibuat: now, urutan: now, arsip: false }));
            toast(`${nama} ditambahkan`);
          }
          closeSheet();
        };
      });
    }
    draw();
  }

  /* ---------- formulir tabungan ---------- */
  function openTab(id) {
    const p = id ? D.tabMap[id] : null, cur = p ? D.pot[p.id] : 0;
    let h = '<form id="pF" novalidate>';
    h += field("pNama", "Nama tabungan", `<input id="pNama" maxlength="40" value="${esc(p ? p.nama : "")}" placeholder="mis. Liburan, Ganti HP" autofocus>`);
    h += field("pTarget", "Target (opsional)", moneyInput("pTarget", p ? +p.target || 0 : 0));
    h += field("pSaldo", p ? "Saldo tabungan sekarang" : "Sudah terkumpul (opsional)", moneyInput("pSaldo", Math.max(0, cur)), p ? "Ubah bila berbeda; riwayat setoran tidak berubah." : "Isi bila sudah ada uang yang disisihkan dan belum tercatat di rekening mana pun.");
    h += field("pLok", "Disimpan di (opsional)", `<input id="pLok" maxlength="40" value="${esc(p ? p.lokasi || "" : "")}" placeholder="mis. Bank Jago kantong, Bibit, celengan">`);
    const used = p && S.tx.some((t) => t.tabungan === p.id);
    h += `${errBox}<div class="form-actions"><button class="btn primary" type="submit">${p ? "Simpan" : "Buat tabungan"}</button>${p ? `<button class="btn" type="button" id="pArch">${p.arsip ? "Aktifkan lagi" : "Arsipkan"}</button>` : ""}${p && !used && !D.linkedPlan[p.id] ? '<button class="btn danger-o" type="button" id="pDel">Hapus</button>' : ""}</div></form>`;
    openSheet(p ? "Ubah tabungan" : "Tabungan baru", h, (root) => {
      bindMoney(root);
      const ar = $("pArch"); if (ar) ar.onclick = () => { write(data.patch("tabungan", p.id, { arsip: !p.arsip })); closeSheet(); };
      const dl = $("pDel"); if (dl) dl.onclick = () => {
        if (dl.dataset.sure) { write(data.remove("tabungan", p.id)); closeSheet(); toast("Tabungan dihapus"); return; }
        dl.dataset.sure = "1"; dl.textContent = "Yakin hapus?"; dl.classList.add("danger");
      };
      $("pF").onsubmit = (e) => {
        e.preventDefault();
        const nama = $("pNama").value.trim(); if (!nama) return sheetErr("Beri nama tabungannya.");
        const target = parseMoney($("pTarget").value), saldo = parseMoney($("pSaldo").value), lokasi = $("pLok").value.trim();
        if (p) {
          const upd = { nama, target, lokasi };
          if (saldo !== Math.max(0, cur)) upd.saldoAwal = (+p.saldoAwal || 0) + (saldo - cur);
          write(data.patch("tabungan", p.id, upd));
        } else write(data.save("tabungan", data.newId("tabungan"), { nama, target, lokasi, saldoAwal: saldo, dibuat: Date.now(), arsip: false }));
        closeSheet(); toast(p ? "Tabungan disimpan" : "Tabungan dibuat");
      };
    });
  }

  /* ---------- formulir rencana ---------- */
  function openRen(id) {
    const r = id ? D.renMap[id] : null;
    const cur = todayStr().slice(0, 7), def = r && r.tenggat ? r.tenggat : shiftMonth(cur, 12);
    const [dy, dm] = def.split("-").map(Number), y0 = +cur.slice(0, 4);
    let h = '<form id="rF" novalidate>';
    h += field("rNama", "Nama rencana", `<input id="rNama" maxlength="50" value="${esc(r ? r.nama : "")}" placeholder="mis. Dana darurat, DP rumah, Umrah" autofocus>`);
    h += field("rTarget", "Target dana", moneyInput("rTarget", r ? +r.target || 0 : 0));
    h += `<div class="pair">${field("rBln", "Tercapai pada bulan", `<select id="rBln">${MONTHS.map((n, i) => opt(i + 1, n, dm)).join("")}</select>`)}${field("rThn", "Tahun", `<select id="rThn">${Array.from({ length: 31 }, (_, i) => y0 + i).map((y) => opt(y, y, dy)).join("")}</select>`)}</div>`;
    const pots = D.aktifTab.filter((p) => !D.linkedPlan[p.id] || (r && D.linkedPlan[p.id].id === r.id));
    h += field("rTab", "Dananya dikumpulkan di", `<select id="rTab">${r ? "" : opt("__new", "Buat tabungan baru dengan nama yang sama", "__new")}${pots.map((p) => opt(p.id, `${p.nama} · ${fmtSigned(D.pot[p.id])}`, r ? r.tabungan : "")).join("")}</select>`, "Setoran ke tabungan ini dihitung sebagai kemajuan rencana.");
    h += field("rNote", "Catatan (opsional)", `<input id="rNote" maxlength="120" value="${esc(r ? r.catatan || "" : "")}">`);
    h += `<div class="preview" id="rPrev"></div>${errBox}<div class="form-actions"><button class="btn primary" type="submit">${r ? "Simpan" : "Buat rencana"}</button>${r ? '<button class="btn danger-o" type="button" id="rDel">Hapus rencana</button>' : ""}</div></form>`;
    openSheet(r ? "Ubah rencana" : "Rencana baru", h, (root) => {
      bindMoney(root);
      const prev = () => {
        const t = parseMoney($("rTarget").value), ten = $("rThn").value + "-" + pad($("rBln").value), tabId = $("rTab").value;
        const have = tabId && tabId !== "__new" ? D.pot[tabId] || 0 : 0, left = monthDiff(cur, ten) + 1;
        $("rPrev").innerHTML = t && left > 0 ? `<span class="label">Perkiraan</span><div class="pv"><span>Perlu disisihkan</span><b class="num">${fmt(Math.max(0, t - have) / left)} / bulan</b></div><div class="pv"><span>Selama</span><span>${left} bulan (sampai ${monthShort(ten)})</span></div>` : left <= 0 ? '<p class="err">Pilih bulan yang belum lewat.</p>' : "";
      };
      root.querySelectorAll("input,select").forEach((i) => i.addEventListener(i.tagName === "SELECT" ? "change" : "input", prev)); prev();
      const dl = $("rDel"); if (dl) dl.onclick = () => {
        if (dl.dataset.sure) { write(data.remove("rencana", r.id)); closeSheet(); toast("Rencana dihapus. Tabungannya tetap ada."); return; }
        dl.dataset.sure = "1"; dl.textContent = "Yakin hapus?"; dl.classList.add("danger");
      };
      $("rF").onsubmit = (e) => {
        e.preventDefault();
        const nama = $("rNama").value.trim(), target = parseMoney($("rTarget").value), tenggat = $("rThn").value + "-" + pad($("rBln").value);
        if (!nama) return sheetErr("Beri nama rencananya.");
        if (!target) return sheetErr("Isi target dananya.");
        if (monthDiff(cur, tenggat) < 0) return sheetErr("Pilih bulan yang belum lewat.");
        let tab = $("rTab").value;
        if (tab === "__new") { tab = data.newId("tabungan"); write(data.save("tabungan", tab, { nama, target, lokasi: "", saldoAwal: 0, dibuat: Date.now(), arsip: false })); }
        const rec = { nama, target, tenggat, tabungan: tab, catatan: $("rNote").value.trim(), dibuat: r ? r.dibuat || Date.now() : Date.now() };
        write(data.save("rencana", r ? r.id : data.newId("rencana"), rec));
        closeSheet(); toast(r ? "Rencana disimpan" : "Rencana dibuat");
      };
    });
  }

  /* ---------- formulir bisnis ---------- */
  function openBiz(id) {
    const b = id ? D.bizMap[id] : null, used = b && S.tx.some((t) => t.bisnis === b.id);
    let h = '<form id="zF" novalidate>';
    h += field("zNama", "Nama bisnis", `<input id="zNama" maxlength="40" value="${esc(b ? b.nama : "")}" placeholder="mis. Toko Kue Bunda" autofocus>`);
    h += field("zDesk", "Keterangan (opsional)", `<input id="zDesk" maxlength="60" value="${esc(b ? b.deskripsi || "" : "")}" placeholder="mis. Jualan online di Shopee">`);
    h += `${errBox}<div class="form-actions"><button class="btn primary" type="submit">${b ? "Simpan" : "Tambah bisnis"}</button>${b ? `<button class="btn" type="button" id="zArch">${b.arsip ? "Aktifkan lagi" : "Arsipkan"}</button>` : ""}${b && !used ? '<button class="btn danger-o" type="button" id="zDel">Hapus</button>' : ""}</div></form>`;
    openSheet(b ? "Ubah bisnis" : "Tambah bisnis", h, () => {
      const ar = $("zArch"); if (ar) ar.onclick = () => { write(data.patch("bisnis", b.id, { arsip: !b.arsip })); closeSheet(); };
      const dl = $("zDel"); if (dl) dl.onclick = () => {
        if (dl.dataset.sure) { write(data.remove("bisnis", b.id)); closeSheet(); return; }
        dl.dataset.sure = "1"; dl.textContent = "Yakin hapus?"; dl.classList.add("danger");
      };
      $("zF").onsubmit = (e) => {
        e.preventDefault();
        const nama = $("zNama").value.trim(); if (!nama) return sheetErr("Beri nama bisnisnya.");
        const rec = { nama, deskripsi: $("zDesk").value.trim() };
        if (b) write(data.patch("bisnis", b.id, rec)); else write(data.save("bisnis", data.newId("bisnis"), { ...rec, dibuat: Date.now(), arsip: false }));
        closeSheet(); toast(b ? "Bisnis disimpan" : `${nama} ditambahkan`);
      };
    });
  }

  /* ---------- anggaran ---------- */
  function openBudget() {
    let h = '<form id="bF" novalidate><p class="muted small">Batas belanja pribadi per bulan. Kosongkan kategori yang tidak perlu dibatasi.</p><div class="b-edit">';
    for (const [k, n] of CATS.keluar) h += `<label for="b_${k}">${n}</label><div class="money sm"><span>Rp</span><input id="b_${k}" data-k="${k}" inputmode="numeric" value="${moneyVal(+S.budget[k] || 0)}" placeholder="0"></div>`;
    h += '</div><div class="form-actions"><button class="btn primary" type="submit">Simpan anggaran</button></div></form>';
    openSheet("Anggaran pribadi", h, (root) => {
      bindMoney(root);
      $("bF").onsubmit = (e) => {
        e.preventDefault();
        const b = {}; root.querySelectorAll("[data-k]").forEach((i) => { const v = parseMoney(i.value); if (v) b[i.dataset.k] = v; });
        write(data.save("settings", "anggaran", b)); S.budget = b; closeSheet(); render(); toast("Anggaran tersimpan");
      };
    });
  }

  /* ---------- akun pengguna ---------- */
  function openAccount() {
    const h = `<div class="kv"><span>Masuk sebagai</span><b>${esc(S.user.email || "akun ini")}</b></div>
      <div class="kv"><span>Versi</span><span>${env.build ? "1.0." + env.build : "pengembangan"} · ${env.native ? "Android" : "Web"}</span></div>
      <div class="kv"><span>Data</span><span>${S.tx.length} transaksi · ${S.akun.length} rekening</span></div>
      <div class="form-actions"><button class="btn block" id="logout">Keluar dari akun</button></div>`;
    openSheet("Akun", h, () => { $("logout").onclick = () => { closeSheet(); data.signOut().catch(() => toast("Gagal keluar. Coba lagi.")); }; });
  }

  /* ================= Aksi ================= */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || !S.user || b.disabled) return;
    const id = b.dataset.id, act = b.dataset.act;
    if (b.closest("#sheetBody") && !["akun-new", "tab-new"].includes(act)) return; // aksi di dalam lembar ditangani formulirnya
    switch (act) {
      case "nav": go(b.dataset.view); break;
      case "add-tx": closeSheet(); openTx({ tipe: b.dataset.tipe, akun: b.dataset.akun, biz: b.dataset.biz, tab: b.dataset.tab, arah: b.dataset.arah }); break;
      case "tx-edit": if (!e.target.closest("[data-act=tx-ask]")) openTx({ id }); break;
      case "tx-ask": e.stopPropagation(); S.confirmId = id; render(); break;
      case "tx-nodel": S.confirmId = null; render(); break;
      case "tx-del": S.confirmId = null; write(data.remove("tx", id)); toast("Transaksi dihapus"); break;
      case "akun-new": closeSheet(); openAkun(null, b.dataset.preset); break;
      case "akun-edit": openAkun(id); break;
      case "akun-tx": S.f = { tipe: "semua", akun: id, scope: "", q: "" }; go("transaksi"); render(); break;
      case "biz-tx": S.f = { tipe: "semua", akun: "", scope: id, q: "" }; go("transaksi"); render(); break;
      case "toggle-arch": S.showArchived = !S.showArchived; render(); break;
      case "tab-new": closeSheet(); openTab(); break;
      case "tab-edit": openTab(id); break;
      case "ren-new": openRen(); break;
      case "ren-edit": openRen(id); break;
      case "biz-new": openBiz(); break;
      case "biz-edit": openBiz(id); break;
      case "budget-edit": openBudget(); break;
      case "account": openAccount(); break;
      case "month-prev": S.month = shiftMonth(S.month, -1); S.confirmId = null; render(); break;
      case "month-next": S.month = shiftMonth(S.month, 1); S.confirmId = null; render(); break;
      case "month-today": S.month = todayStr().slice(0, 7); render(); break;
      case "f-tipe": S.f.tipe = b.dataset.v; render(); break;
      case "migrate": {
        const ak = $("migAkun").value;
        const items = S.tx.filter((t) => (t.tipe === "masuk" || t.tipe === "keluar") && !D.akunMap[t.akun]).map((t) => ({ id: t.id, data: { akun: ak } }));
        write(data.patchMany("tx", items)); toast(`${items.length} transaksi dihubungkan ke ${akunLabel(ak)}`);
        break;
      }
      case "csv": exportCsv(); break;
    }
  });
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".row[data-act=tx-edit]")) { e.preventDefault(); openTx({ id: e.target.dataset.id }); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "fAkun") { S.f.akun = e.target.value; render(); }
    if (e.target.id === "fScope") { S.f.scope = e.target.value; render(); }
  });
  let qT;
  document.addEventListener("input", (e) => {
    if (e.target.id !== "fQ") return;
    clearTimeout(qT);
    qT = setTimeout(() => {
      S.f.q = e.target.value; const pos = e.target.selectionStart; render();
      const el = $("fQ"); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (er) { /* */ } }
    }, 200);
  });

  function exportCsv() {
    const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const TIPE = { masuk: "Pemasukan", keluar: "Pengeluaran", transfer: "Transfer", setor: "Setor tabungan", tarik: "Tarik tabungan" };
    const rows = [["Tanggal", "Tipe", "Rekening", "Ke rekening / tabungan", "Untuk", "Kategori", "Catatan", "Jumlah", "Biaya admin"]].concat(
      filteredTx().sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1)).map((t) => [
        t.tanggal, TIPE[t.tipe] || t.tipe, akunLabel(t.akun), t.keAkun ? akunLabel(t.keAkun) : t.tabungan ? tabLabel(t.tabungan) : "",
        t.bisnis ? (D.bizMap[t.bisnis] || {}).nama || "Bisnis" : "Pribadi", CAT_NAME[t.kategori] || "", t.catatan || "",
        t.tipe === "keluar" ? -t.jumlah : t.jumlah, +t.biaya || "",
      ]));
    const blob = new Blob(["﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `finance-${S.month}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  let rT;
  let lastW = innerWidth;
  // Hanya saat lebar berubah (bukan saat keyboard HP muncul), supaya kolom isian tidak kehilangan fokus.
  window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { if (S.user && innerWidth !== lastW) { lastW = innerWidth; render(); } }, 200); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.user) render(); });

  let tT;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(tT); tT = setTimeout(() => (t.hidden = true), 2800); }

  show("loadView");
}
