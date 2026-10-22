// Data tiruan untuk menguji tampilan tanpa Firebase.
export function createMockData({ loggedIn = true, empty = false, legacy = false } = {}) {
  let user = loggedIn ? { uid: "u1", email: "kamu@contoh.id" } : null;
  let authCb = () => {};
  const now = new Date(), m = now.toISOString().slice(0, 7), pm = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().slice(0, 7);
  const d = (day, mm = m) => mm + "-" + String(day).padStart(2, "0");
  let n = 0; const id = () => "id" + (++n);
  const db = { tx: [], akun: [], tabungan: [], rencana: [], bisnis: [], settings: [] };
  if (!empty) {
    const t0 = Date.now() - 40 * 864e5;
    db.akun = [
      { id: "bca", nama: "BCA", jenis: "bank", saldoAwal: 4200000, saldoTgl: d(1, pm), dibuat: t0, urutan: 1 },
      { id: "bri", nama: "BRI", jenis: "bank", saldoAwal: 1500000, saldoTgl: d(1, pm), dibuat: t0, urutan: 2 },
      { id: "gopay", nama: "GoPay", jenis: "ewallet", saldoAwal: 150000, saldoTgl: d(1, pm), dibuat: t0, urutan: 3 },
      { id: "dompet", nama: "Dompet", jenis: "tunai", saldoAwal: 300000, saldoTgl: d(1, pm), dibuat: t0, urutan: 4 },
    ];
    db.bisnis = [{ id: "kue", nama: "Toko Kue Bunda", deskripsi: "Jualan kue online", dibuat: t0 }];
    db.tabungan = [{ id: "darurat", nama: "Dana darurat", target: 20000000, saldoAwal: 6000000, lokasi: "Bank Jago", dibuat: t0 }, { id: "libur", nama: "Liburan Bali", target: 5000000, saldoAwal: 0, dibuat: t0 + 1 }];
    db.rencana = [{ id: "r1", nama: "Dana darurat", target: 20000000, tenggat: `${now.getFullYear() + 1}-12`, tabungan: "darurat", dibuat: t0 }];
    db.settings = [{ id: "anggaran", makan: 2000000, transport: 600000, belanja: 1000000, tagihan: 900000, hiburan: 400000, keluarga: 500000 }];
    const T = (tanggal, tipe, jumlah, extra) => db.tx.push({ id: id(), tanggal, bulan: tanggal.slice(0, 7), tipe, jumlah, catatan: "", dibuat: Date.parse(tanggal) + n, ...extra });
    T(d(1, pm), "masuk", 8500000, { akun: "bca", kategori: "gaji", catatan: "Gaji" });
    T(d(10, pm), "keluar", 1200000, { akun: "bca", kategori: "belanja" });
    T(d(5, pm), "masuk", 2400000, { akun: "bri", kategori: "b_jual", bisnis: "kue" });
    T(d(6, pm), "keluar", 900000, { akun: "bri", kategori: "b_stok", bisnis: "kue" });
    T(d(1), "masuk", 8500000, { akun: "bca", kategori: "gaji", catatan: "Gaji bulanan" });
    T(d(1), "keluar", 350000, { akun: "bca", kategori: "tagihan", catatan: "Internet rumah" });
    T(d(2), "transfer", 500000, { akun: "bca", keAkun: "gopay", biaya: 2500, catatan: "Top up" });
    T(d(3), "keluar", 54000, { akun: "gopay", kategori: "transport", catatan: "Ojek online" });
    T(d(4), "keluar", 286000, { akun: "bca", kategori: "belanja", catatan: "Belanja mingguan" });
    T(d(5), "setor", 1500000, { akun: "bca", tabungan: "darurat" });
    T(d(6), "masuk", 3150000, { akun: "bri", kategori: "b_jual", bisnis: "kue", catatan: "Pesanan arisan" });
    T(d(7), "keluar", 1100000, { akun: "bri", kategori: "b_stok", bisnis: "kue", catatan: "Tepung, mentega" });
    T(d(8), "keluar", 160000, { akun: "bri", kategori: "b_kirim", bisnis: "kue" });
    T(d(9), "keluar", 100000, { akun: "dompet", kategori: "hiburan", catatan: "Nonton" });
    T(d(10), "setor", 500000, { akun: "bca", tabungan: "libur" });
    T(d(11), "keluar", 175000, { akun: "gopay", kategori: "makan", catatan: "Makan malam" });
    if (legacy) { T(d(2), "keluar", 45000, { kategori: "makan", catatan: "Data lama" }); T(d(3), "keluar", 30000, { kategori: "transport" }); }
  }
  const subs = [];
  const emit = (col) => subs.filter((s) => s.col === col).forEach((s) => s.fire());
  return {
    onAuth(cb) { authCb = cb; setTimeout(() => cb(user), 30); return () => {}; },
    async signIn(e, p) { if (p !== "rahasia") throw { code: "auth/invalid-credential" }; user = { uid: "u1", email: e }; authCb(user); },
    async signUp(e) { user = { uid: "u1", email: e }; authCb(user); },
    async resetPassword() {},
    async signOut() { user = null; authCb(null); },
    watch(col, next) {
      const s = { col, fire: () => next(db[col].map((x) => ({ ...x })), { pending: false }) };
      subs.push(s); setTimeout(s.fire, 20); return () => subs.splice(subs.indexOf(s), 1);
    },
    watchDoc(col, did, next) {
      const s = { col, fire: () => { const x = db[col].find((y) => y.id === did); const c = x ? { ...x } : {}; delete c.id; next(c); } };
      subs.push(s); setTimeout(s.fire, 20); return () => subs.splice(subs.indexOf(s), 1);
    },
    newId: () => id(),
    async save(col, did, data) { const i = db[col].findIndex((x) => x.id === did); const rec = { id: did, ...data }; if (i >= 0) db[col][i] = rec; else db[col].push(rec); emit(col); },
    async patch(col, did, data) { const x = db[col].find((y) => y.id === did); Object.assign(x, data); emit(col); },
    async remove(col, did) { const i = db[col].findIndex((x) => x.id === did); if (i >= 0) db[col].splice(i, 1); emit(col); },
    async patchMany(col, items) { for (const it of items) Object.assign(db[col].find((y) => y.id === it.id), it.data); emit(col); },
    _db: db,
  };
}
