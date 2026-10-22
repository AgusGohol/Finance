// Tampilan dan logika aplikasi. Tidak bergantung langsung pada Firebase:
// semua akses data lewat objek `data` (lihat data-firebase.js).

const CATS = {
  keluar: [
    ["makan", "Makan & Minum"], ["transport", "Transportasi"], ["belanja", "Belanja Harian"], ["tagihan", "Tagihan & Pulsa"],
    ["hiburan", "Hiburan"], ["kesehatan", "Kesehatan"], ["pendidikan", "Pendidikan"], ["keluarga", "Keluarga & Sosial"], ["lainnya", "Lainnya"],
  ],
  masuk: [["gaji", "Gaji"], ["sampingan", "Usaha & Freelance"], ["bonus", "Bonus & THR"], ["lainnya_in", "Pemasukan Lain"]],
};
const CAT_NAME = {};
for (const t in CATS) for (const [k, n] of CATS[t]) CAT_NAME[k] = n;
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const fmt = (n) => "Rp " + Math.round(Math.abs(n)).toLocaleString("id-ID");
const fmtS = (n) => {
  n = Math.abs(n);
  if (n >= 1e6) return (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "jt";
  if (n >= 1e3) return Math.round(n / 1e3) + "rb";
  return String(Math.round(n));
};
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } };

export function startApp({ data, env }) {
  const S = {
    user: null, month: todayStr().slice(0, 7), txs: [], loaded: false, pending: false, budget: {},
    filter: "semua", q: "", type: "keluar", editingId: null, confirmId: null, bEdit: false,
    unsubM: null, unsubB: null, authMode: "masuk",
  };

  function show(view) {
    for (const v of ["setupView", "loadView", "authView", "appView"]) $(v).hidden = v !== view;
  }

  if (!data) { show("setupView"); return; }

  /* ---------- errors ---------- */
  function authErr(e) {
    const c = (e && e.code) || "";
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
      "auth/operation-not-allowed": "Login email/password belum diaktifkan di Firebase (lihat README).",
      "auth/admin-restricted-operation": "Pendaftaran akun baru sedang ditutup.",
    };
    return m[c] || "Gagal masuk. Coba lagi.";
  }
  function dataErr(e) {
    const c = (e && e.code) || "";
    if (c === "permission-denied") return "Akses data ditolak. Periksa aturan Firestore (lihat README).";
    if (c === "resource-exhausted") return "Batas pemakaian gratis Firebase hari ini tercapai. Coba lagi besok.";
    if (c === "unauthenticated") return "Sesi login berakhir. Silakan masuk lagi.";
    return "Gagal menyimpan ke server. Perubahan akan dicoba lagi saat online.";
  }

  /* ---------- auth view ---------- */
  function setAuthMode(m) {
    S.authMode = m;
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
    const p = $("aPw"), show = p.type === "password";
    p.type = show ? "text" : "password"; $("pwToggle").textContent = show ? "Sembunyi" : "Lihat";
  };
  $("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("aEmail").value.trim(), pw = $("aPw").value, err = $("aErr");
    $("aOk").hidden = true;
    if (!email) { err.textContent = "Isi alamat email dulu."; err.hidden = false; return; }
    if (pw.length < 6) { err.textContent = "Password minimal 6 karakter."; err.hidden = false; return; }
    err.hidden = true;
    const btn = $("aSubmit"); btn.disabled = true; btn.textContent = S.authMode === "masuk" ? "Masuk…" : "Membuat akun…";
    try {
      if (S.authMode === "masuk") await data.signIn(email, pw); else await data.signUp(email, pw);
      $("aPw").value = "";
    } catch (ex) { err.textContent = authErr(ex); err.hidden = false; }
    btn.disabled = false; setAuthMode(S.authMode);
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

  /* ---------- session ---------- */
  function stopSubs() {
    if (S.unsubM) S.unsubM(); if (S.unsubB) S.unsubB();
    S.unsubM = S.unsubB = null;
  }
  data.onAuth((user) => {
    stopSubs();
    S.user = user;
    if (!user) { $("acctMenu").hidden = true; setAuthMode("masuk"); show("authView"); return; }
    $("acctEmail").textContent = "Masuk sebagai " + (user.email || "akun ini");
    $("acctVer").textContent = "Versi " + (env.build ? "1.0." + env.build : "pengembangan") + (env.native ? " · Android" : " · Web");
    S.month = todayStr().slice(0, 7); S.txs = []; S.budget = {}; S.loaded = false;
    show("appView");
    S.unsubB = data.subscribeBudget((b) => { S.budget = { ...b }; if (!S.bEdit) render(); }, (e) => toast(dataErr(e)));
    subscribeMonth();
    resetForm();
    checkUpdate();
  });

  function subscribeMonth() {
    if (S.unsubM) S.unsubM();
    S.loaded = false; S.txs = []; render();
    const m = S.month;
    S.unsubM = data.subscribeMonth(m, (txs, meta) => {
      if (m !== S.month) return;
      S.txs = txs; S.pending = meta.pending; S.loaded = true;
      render(); renderSync();
    }, (e) => { S.loaded = true; render(); toast(dataErr(e)); });
  }

  /* ---------- sync status ---------- */
  function renderSync() {
    const el = $("sync");
    if (!navigator.onLine) { el.dataset.s = "offline"; el.textContent = "Offline · tersimpan di perangkat"; }
    else if (S.pending) { el.dataset.s = "pending"; el.textContent = "Menyinkronkan…"; }
    else { el.dataset.s = "ok"; el.textContent = "Tersinkron"; }
  }
  window.addEventListener("online", renderSync);
  window.addEventListener("offline", renderSync);

  /* ---------- update check (APK) ---------- */
  async function checkUpdate() {
    if (!env.native || !env.repo || !env.build) return;
    const last = +lsGet("kas.updCheck") || 0;
    if (Date.now() - last < 6 * 3600e3 && lsGet("kas.updInfo") === null) return;
    try {
      let info = null;
      if (Date.now() - last >= 6 * 3600e3) {
        const r = await fetch(`https://api.github.com/repos/${env.repo}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
        if (!r.ok) return;
        const j = await r.json();
        const n = parseInt(String(j.tag_name || "").replace(/\D/g, ""), 10);
        const apk = (j.assets || []).find((a) => /\.apk$/i.test(a.name));
        info = n > env.build ? { n, url: apk ? apk.browser_download_url : j.html_url } : null;
        lsSet("kas.updCheck", String(Date.now()));
        if (info) lsSet("kas.updInfo", JSON.stringify(info)); else { try { localStorage.removeItem("kas.updInfo"); } catch (e) { /* */ } }
      } else {
        info = JSON.parse(lsGet("kas.updInfo") || "null");
      }
      if (info && info.n > env.build) {
        $("updText").textContent = `Versi baru 1.0.${info.n} tersedia. Unduh lalu pasang di atas aplikasi ini; datamu tetap aman.`;
        $("updLink").href = info.url;
        $("updBanner").hidden = false;
      }
    } catch (e) { /* tidak ada internet: coba lain kali */ }
  }

  /* ---------- derived ---------- */
  const daysIn = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
  const monthName = (m) => { const [y, mo] = m.split("-").map(Number); return MONTHS[mo - 1] + " " + y; };
  const shiftMonth = (m, k) => { let [y, mo] = m.split("-").map(Number); mo += k; while (mo < 1) { mo += 12; y--; } while (mo > 12) { mo -= 12; y++; } return y + "-" + pad(mo); };
  function totals() {
    let i = 0, o = 0, ni = 0, no = 0; const byCat = {}, byDay = {};
    for (const t of S.txs) {
      const a = +t.jumlah || 0;
      if (t.tipe === "masuk") { i += a; ni++; }
      else { o += a; no++; byCat[t.kategori] = (byCat[t.kategori] || 0) + a; const dd = +String(t.tanggal).slice(8, 10); byDay[dd] = (byDay[dd] || 0) + a; }
    }
    return { i, o, ni, no, byCat, byDay };
  }
  const budgetTotal = () => CATS.keluar.reduce((s, [k]) => s + (+S.budget[k] || 0), 0);

  /* ---------- render ---------- */
  function render() {
    const today = todayStr();
    $("monthLabel").textContent = monthName(S.month);
    $("todayBtn").hidden = S.month === today.slice(0, 7);
    $("csvBtn").hidden = env.native || !S.txs.length;
    const T = totals();
    renderSummary(T, today); renderChart(T, today); renderList(today);
    if (!S.bEdit) renderBudget(T);
  }
  function renderSummary(T, today) {
    const net = T.i - T.o, n = $("sNet");
    n.textContent = (net < 0 ? "−" : "") + fmt(net);
    n.className = "big num " + (net < 0 ? "neg" : net > 0 ? "pos" : "");
    $("sRate").textContent = T.i > 0
      ? (net >= 0 ? `Kamu menyisihkan ${Math.round((net / T.i) * 100)}% dari pemasukan` : `Pengeluaran melebihi pemasukan ${Math.round((-net / T.i) * 100)}%`)
      : (T.o > 0 ? "Belum ada pemasukan tercatat" : "Belum ada transaksi");
    $("sIn").textContent = fmt(T.i); $("sInN").textContent = T.ni + " transaksi";
    $("sOut").textContent = fmt(T.o); $("sOutN").textContent = T.no + " transaksi";
    const cur = today.slice(0, 7);
    const days = S.month < cur ? daysIn(S.month) : S.month === cur ? +today.slice(8, 10) : 0;
    $("sAvg").textContent = days ? fmt(T.o / days) : "—";
    $("sAvgN").textContent = days ? `pengeluaran, dihitung dari ${days} hari` : "bulan belum berjalan";
  }
  function niceMax(v) {
    if (v <= 0) return 100000;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
    return 10 * p;
  }
  function renderChart(T, today) {
    const svg = $("chart"), W = Math.round(Math.min(720, Math.max(300, svg.clientWidth || 720))), H = W < 500 ? 190 : 210, L = 44, R = 6, TOP = 12, B = 26, n = daysIn(S.month);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const bt = budgetTotal(), lim = bt ? bt / n : 0;
    let mx = 0; for (const k in T.byDay) mx = Math.max(mx, T.byDay[k]);
    const top = niceMax(Math.max(mx, lim * 1.15));
    const ih = H - TOP - B, iw = W - L - R, bw = iw / n, y = (v) => TOP + ih - (v / top) * ih;
    let s = "";
    for (const f of [0, 0.5, 1]) {
      const v = top * f, yy = y(v).toFixed(1);
      s += `<line class="grid-l" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="ax" x="${L - 6}" y="${(+yy + 3.5).toFixed(1)}" text-anchor="end">${v ? fmtS(v) : "0"}</text>`;
    }
    const isCur = S.month === today.slice(0, 7), td = +today.slice(8, 10);
    for (let d = 1; d <= n; d++) {
      const v = T.byDay[d] || 0, x = L + (d - 1) * bw + bw * 0.18, w = bw * 0.64;
      if (v > 0) {
        const yy = y(v), cls = "bar" + (isCur && d === td ? " today" : "") + (lim && v > lim ? " over" : "");
        s += `<rect class="${cls}" x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${w.toFixed(1)}" height="${(TOP + ih - yy).toFixed(1)}" rx="2"><title>${d} ${MONTHS[+S.month.slice(5) - 1]}: ${fmt(v)}</title></rect>`;
      }
      if (d === 1 || d % 5 === 0) s += `<text class="ax" x="${(L + (d - 0.5) * bw).toFixed(1)}" y="${H - 8}" text-anchor="middle">${d}</text>`;
    }
    if (lim) {
      const yy = y(lim).toFixed(1);
      s += `<line class="lim" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="lim-t" x="${W - R}" y="${(+yy - 5).toFixed(1)}" text-anchor="end">${fmtS(lim)}/hari</text>`;
    }
    svg.innerHTML = s;
    $("legLim").hidden = !lim;
    let hi = 0, hd = 0; for (const k in T.byDay) if (T.byDay[k] > hi) { hi = T.byDay[k]; hd = k; }
    $("chartNote").textContent = hi ? `Tertinggi: tgl ${hd} · ${fmtS(hi)}` : "";
  }
  function renderList(today) {
    const el = $("list");
    if (!S.loaded) { el.innerHTML = '<div class="empty">Memuat transaksi…</div>'; return; }
    if (!S.txs.length) {
      el.innerHTML = `<div class="empty"><strong>Belum ada transaksi di ${monthName(S.month)}.</strong>Catat yang pertama lewat formulir Tambah transaksi.</div>`;
      return;
    }
    const q = S.q.trim().toLowerCase();
    const rows = S.txs
      .filter((t) => (S.filter === "semua" || t.tipe === S.filter) && (!q || String(t.catatan || "").toLowerCase().includes(q) || (CAT_NAME[t.kategori] || "").toLowerCase().includes(q)))
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : (b.dibuat || 0) - (a.dibuat || 0)));
    if (!rows.length) { el.innerHTML = '<div class="empty">Tidak ada transaksi yang cocok dengan filter ini.</div>'; return; }
    const groups = {};
    for (const t of rows) (groups[t.tanggal] = groups[t.tanggal] || []).push(t);
    let h = "";
    for (const d in groups) {
      const dt = new Date(d + "T00:00:00");
      let net = 0; for (const t of groups[d]) net += t.tipe === "masuk" ? +t.jumlah : -t.jumlah;
      const lbl = d === today ? "Hari ini" : `${DAYS[dt.getDay()]}, ${dt.getDate()} ${MONTHS[dt.getMonth()].slice(0, 3)}`;
      h += `<div class="day"><div class="day-h"><span>${lbl}</span><span class="num ${net < 0 ? "neg" : "pos"}">${net < 0 ? "−" : "+"}${fmt(net)}</span></div>`;
      for (const t of groups[d]) {
        const name = esc(CAT_NAME[t.kategori] || t.kategori);
        if (S.confirmId === t.id) {
          h += `<div class="row confirm"><div class="what"><div class="cat">Hapus transaksi ini?</div><div class="note">${name} · ${fmt(t.jumlah)}</div></div><div class="confirm-actions"><button class="btn danger" data-act="del" data-id="${esc(t.id)}">Hapus</button><button class="btn" data-act="nodel">Batal</button></div></div>`;
        } else {
          const amt = `<span class="amt num ${t.tipe === "masuk" ? "pos" : "neg"}">${t.tipe === "masuk" ? "+" : "−"}${fmt(t.jumlah)}</span>`;
          h += `<div class="row${S.editingId === t.id ? " editing" : ""}"><div class="what"><div class="cat">${name}</div><div class="note">${esc(t.catatan || "—")}</div></div>${amt}<div class="acts"><button class="icon-btn" title="Ubah" aria-label="Ubah transaksi" data-act="edit" data-id="${esc(t.id)}">✎</button><button class="icon-btn" title="Hapus" aria-label="Hapus transaksi" data-act="ask" data-id="${esc(t.id)}">✕</button></div></div>`;
        }
      }
      h += "</div>";
    }
    el.innerHTML = h;
  }
  function renderBudget(T) {
    const el = $("budget"), bt = budgetTotal();
    if (!bt && !T.o) {
      el.innerHTML = '<div class="empty"><strong>Belum ada anggaran.</strong>Tekan Ubah untuk menetapkan batas belanja tiap kategori per bulan.</div>';
      return;
    }
    let h = "";
    if (bt) {
      const left = bt - T.o;
      h += `<div class="b-total"><div><div class="label">Sisa anggaran</div><div class="left num ${left < 0 ? "neg" : ""}">${left < 0 ? "−" : ""}${fmt(left)}</div></div><div class="of num">${fmtS(T.o)} dari ${fmtS(bt)}<br>terpakai ${Math.round((T.o / bt) * 100)}%</div></div>`;
    }
    const rows = CATS.keluar.map(([k, n]) => ({ k, n, b: +S.budget[k] || 0, s: T.byCat[k] || 0 }))
      .filter((r) => r.b || r.s)
      .sort((a, b) => (b.b ? b.s / b.b : 9) - (a.b ? a.s / a.b : 9));
    for (const r of rows) {
      const p = r.b ? r.s / r.b : 1, st = !r.b ? "over" : p > 1 ? "over" : p >= 0.85 ? "warn" : "";
      const sub = !r.b ? "Tanpa anggaran" : p > 1 ? `Lewat ${fmt(r.s - r.b)}` : `Sisa ${fmt(r.b - r.s)}`;
      h += `<div class="b-row"><div class="b-top"><span class="n">${r.n}</span><span class="v num">${fmtS(r.s)} / ${r.b ? fmtS(r.b) : "—"}</span></div><div class="track"><div class="fill ${st}" style="width:${Math.min(100, p * 100).toFixed(1)}%"></div></div><span class="b-sub ${st}">${sub}</span></div>`;
    }
    el.innerHTML = h;
  }
  function renderBudgetEdit() {
    let h = '<div class="b-edit">';
    for (const [k, n] of CATS.keluar) {
      const v = +S.budget[k] || 0;
      h += `<label for="b_${k}">${n}</label><input id="b_${k}" data-k="${k}" inputmode="numeric" value="${v ? v.toLocaleString("id-ID") : ""}" placeholder="0">`;
    }
    h += '</div><div class="form-actions" style="margin-top:14px"><button class="btn primary" id="bSave">Simpan anggaran</button><button class="btn" id="bCancel">Batal</button></div>';
    $("budget").innerHTML = h;
    $("budget").querySelectorAll("input").forEach((i) => i.addEventListener("input", moneyInput));
    $("bSave").onclick = () => {
      const b = {};
      $("budget").querySelectorAll("input").forEach((i) => { const v = parseMoney(i.value); if (v > 0) b[i.dataset.k] = v; });
      S.budget = b; S.bEdit = false; $("bEditBtn").hidden = false; render();
      data.saveBudget(b).catch((e) => toast(dataErr(e)));
      toast("Anggaran tersimpan");
    };
    $("bCancel").onclick = () => { S.bEdit = false; $("bEditBtn").hidden = false; render(); };
  }

  /* ---------- form ---------- */
  const parseMoney = (v) => +String(v).replace(/[^\d]/g, "") || 0;
  function moneyInput(e) { const el = e.target, v = parseMoney(el.value); el.value = v ? v.toLocaleString("id-ID") : ""; }
  function setType(t) {
    S.type = t;
    document.querySelectorAll("#typeSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === t)));
    const sel = $("fCat"), prev = sel.value;
    sel.innerHTML = CATS[t].map(([k, n]) => `<option value="${k}">${n}</option>`).join("");
    if (CATS[t].some((c) => c[0] === prev)) sel.value = prev;
  }
  function resetForm() {
    const today = todayStr();
    S.editingId = null;
    $("formTitle").textContent = "Tambah transaksi"; $("fSubmit").textContent = "Simpan transaksi"; $("fCancel").hidden = true;
    $("fAmt").value = ""; $("fNote").value = ""; $("fErr").hidden = true;
    $("fDate").value = S.month === today.slice(0, 7) ? today : S.month + "-01";
  }
  function startEdit(id) {
    const t = S.txs.find((x) => x.id === id); if (!t) return;
    S.editingId = id; S.confirmId = null; setType(t.tipe);
    $("fCat").value = t.kategori; $("fAmt").value = (+t.jumlah).toLocaleString("id-ID"); $("fDate").value = t.tanggal; $("fNote").value = t.catatan || "";
    $("formTitle").textContent = "Ubah transaksi"; $("fSubmit").textContent = "Perbarui transaksi"; $("fCancel").hidden = false;
    renderList(todayStr());
    $("cardForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("txForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const amt = parseMoney($("fAmt").value), date = $("fDate").value, err = $("fErr");
    if (!amt) { err.textContent = "Isi jumlah uangnya dulu."; err.hidden = false; $("fAmt").focus(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { err.textContent = "Pilih tanggal transaksi."; err.hidden = false; return; }
    err.hidden = true;
    const prev = S.editingId ? S.txs.find((x) => x.id === S.editingId) : null;
    const rec = {
      tipe: S.type, jumlah: amt, kategori: $("fCat").value, catatan: $("fNote").value.trim().slice(0, 120),
      tanggal: date, bulan: date.slice(0, 7), dibuat: prev ? prev.dibuat || Date.now() : Date.now(),
    };
    const wasEdit = !!S.editingId;
    // Tidak menunggu server: data langsung tersimpan di perangkat dan dikirim saat online.
    data.saveTx(S.editingId, rec).catch((ex) => toast(dataErr(ex)));
    resetForm();
    toast(rec.bulan !== S.month ? `Tersimpan di ${monthName(rec.bulan)}` : wasEdit ? "Transaksi diperbarui" : "Transaksi tersimpan");
  });
  $("fCancel").onclick = () => { resetForm(); renderList(todayStr()); };
  $("fAmt").addEventListener("input", moneyInput);
  $("quick").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $("fAmt").value = (parseMoney($("fAmt").value) + +b.dataset.v).toLocaleString("id-ID");
  });
  document.querySelectorAll("#typeSeg button").forEach((b) => (b.onclick = () => setType(b.dataset.t)));

  /* ---------- list, nav, account ---------- */
  $("list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.act === "edit") return startEdit(id);
    if (b.dataset.act === "ask") { S.confirmId = id; renderList(todayStr()); return; }
    if (b.dataset.act === "nodel") { S.confirmId = null; renderList(todayStr()); return; }
    if (b.dataset.act === "del") {
      S.confirmId = null; if (S.editingId === id) resetForm();
      data.delTx(id).catch((ex) => toast(dataErr(ex)));
      toast("Transaksi dihapus");
    }
  });
  document.querySelectorAll(".chip").forEach((c) => (c.onclick = () => {
    S.filter = c.dataset.f;
    document.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    renderList(todayStr());
  }));
  let qT;
  $("q").addEventListener("input", (e) => { clearTimeout(qT); qT = setTimeout(() => { S.q = e.target.value; renderList(todayStr()); }, 120); });
  function go(m) { S.month = m; S.confirmId = null; if (!S.editingId) resetForm(); subscribeMonth(); }
  $("prevM").onclick = () => go(shiftMonth(S.month, -1));
  $("nextM").onclick = () => go(shiftMonth(S.month, 1));
  $("todayBtn").onclick = () => go(todayStr().slice(0, 7));
  $("bEditBtn").onclick = () => { S.bEdit = true; $("bEditBtn").hidden = true; renderBudgetEdit(); };
  $("acctBtn").onclick = (e) => {
    e.stopPropagation();
    const m = $("acctMenu"); m.hidden = !m.hidden; $("acctBtn").setAttribute("aria-expanded", String(!m.hidden));
  };
  document.addEventListener("click", (e) => {
    if (!$("acctMenu").hidden && !e.target.closest(".acct")) { $("acctMenu").hidden = true; $("acctBtn").setAttribute("aria-expanded", "false"); }
  });
  $("logoutBtn").onclick = () => { $("acctMenu").hidden = true; data.signOut().catch(() => toast("Gagal keluar. Coba lagi.")); };
  $("csvBtn").onclick = () => {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [["Tanggal", "Tipe", "Kategori", "Catatan", "Jumlah"]].concat(
      [...S.txs].sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1)).map((t) => [
        t.tanggal, t.tipe === "masuk" ? "Pemasukan" : "Pengeluaran", CAT_NAME[t.kategori] || t.kategori, t.catatan || "", t.tipe === "masuk" ? t.jumlah : -t.jumlah,
      ]));
    const blob = new Blob(["﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `kas-${S.month}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  // Kembali ke aplikasi setelah lama di latar belakang: perbarui tanggal "hari ini".
  let rT;
  window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { if (S.user) renderChart(totals(), todayStr()); }, 150); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.user) { render(); renderSync(); } });

  let tT;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(tT); tT = setTimeout(() => (t.hidden = true), 2800); }

  setType("keluar");
  show("loadView");
}
