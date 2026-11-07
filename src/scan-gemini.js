// Membaca screenshot transaksi (mutasi m-banking, riwayat e-wallet, struk, bukti transfer)
// dengan Gemini lewat Firebase AI Logic. Hasilnya selalu ditinjau pengguna sebelum disimpan.
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";

// Model utama (cepat), lalu cadangan bila model utama penuh, lambat, atau tidak tersedia.
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
// Batas tunggu per percobaan. Lewat dari ini, coba model cadangan lalu tampilkan pesan.
const TIMEOUT_MS = 45000;

export const SCAN_CATS = {
  keluar: ["makan", "transport", "belanja", "tagihan", "hiburan", "kesehatan", "pendidikan", "keluarga", "admin", "lainnya"],
  masuk: ["gaji", "sampingan", "bonus", "lainnya_in"],
};

const schema = Schema.object({
  properties: {
    sumber: Schema.string({ description: "Nama bank atau e-wallet asal screenshot, mis. BCA, BRI, Mandiri, GoPay, DANA. Kosongkan bila tidak jelas." }),
    transaksi: Schema.array({
      items: Schema.object({
        properties: {
          tanggal: Schema.string({ description: "Tanggal transaksi format YYYY-MM-DD. Kosongkan bila tidak terlihat." }),
          arah: Schema.enumString({ enum: ["masuk", "keluar"] }),
          jumlah: Schema.number({ description: "Nominal dalam rupiah, bilangan bulat positif tanpa titik/koma." }),
          keterangan: Schema.string({ description: "Keterangan singkat: nama toko, penerima/pengirim, atau deskripsi." }),
          kategori: Schema.enumString({ enum: [...SCAN_CATS.keluar, ...SCAN_CATS.masuk] }),
        },
        optionalProperties: ["tanggal"],
      }),
    }),
  },
  optionalProperties: ["sumber"],
});

function prompt(today) {
  return `Kamu membaca screenshot keuangan dari HP pengguna di Indonesia: mutasi rekening m-banking, riwayat e-wallet, struk belanja, atau bukti transfer.
Tugas: ambil SETIAP transaksi yang terlihat dan kembalikan sebagai JSON sesuai skema.

Aturan:
- Hari ini ${today}. Bila tanggal tanpa tahun, pakai tahun yang membuat tanggal itu tidak melewati hari ini.
- arah "keluar" untuk uang keluar (DB, Debit, tanda minus, pembayaran, transfer ke orang lain, tarik tunai, top up ke e-wallet lain, biaya admin).
- arah "masuk" untuk uang masuk (CR, Kredit, tanda plus, transfer masuk, gaji, refund, cashback, bunga).
- jumlah: nominal transaksi saja dalam rupiah sebagai bilangan bulat. "Rp 1.250.000,00" = 1250000. Jangan ambil angka saldo.
- ABAIKAN: baris saldo awal/akhir/saldo tersedia, transaksi gagal/dibatalkan, iklan, promo, menu aplikasi.
- Struk belanja: satu transaksi keluar sebesar TOTAL yang dibayar, bukan per barang.
- Bukti transfer: satu transaksi; biaya admin yang tertulis terpisah jadi transaksi keluar sendiri berkategori "admin".
- kategori keluar: makan (makan/minum/kafe/GoFood), transport (bensin, ojek, parkir, tol, tiket), belanja (supermarket, minimarket, marketplace), tagihan (listrik/PLN, air, internet, pulsa, paket data, cicilan, langganan), hiburan, kesehatan, pendidikan, keluarga (transfer ke keluarga/teman, sumbangan), admin (biaya admin/transfer/bulanan bank), lainnya.
- kategori masuk: gaji, sampingan (penjualan, proyek, freelance), bonus (bonus, THR, cashback, bunga), lainnya_in.
- keterangan maksimal 60 karakter, tanpa nomor rekening lengkap.
- Bila tidak ada transaksi yang terbaca, kembalikan transaksi kosong.`;
}

async function toInline(file) {
  // Perkecil gambar besar (screenshot panjang) supaya cepat dikirim, tetap terbaca.
  const bmp = await createImageBitmap(file);
  const MAX_W = 1080, MAX_H = 3600;
  const scale = Math.min(1, MAX_W / bmp.width, MAX_H / bmp.height);
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d").drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  const data = c.toDataURL("image/jpeg", 0.82).split(",")[1];
  return { inlineData: { mimeType: "image/jpeg", data } };
}

export function createGeminiScanner(app) {
  let ai = null;
  const models = {};
  const noThink = new Set(); // model yang menolak pengaturan "berpikir singkat"
  const model = (name) => {
    if (!ai) ai = getAI(app, { backend: new GoogleAIBackend() });
    const key = name + (noThink.has(name) ? ":plain" : "");
    const generationConfig = { responseMimeType: "application/json", responseSchema: schema, temperature: 0 };
    // Membaca screenshot tidak butuh penalaran panjang; berpikir singkat jauh lebih cepat.
    if (!noThink.has(name)) generationConfig.thinkingConfig = { thinkingLevel: "LOW" };
    return (models[key] = models[key] || getGenerativeModel(ai, { model: name, generationConfig }, { timeout: TIMEOUT_MS + 5000 }));
  };
  function withTimeout(p) {
    let t;
    const timer = new Promise((_, rej) => { t = setTimeout(() => { const e = new Error("timeout"); e.code = "timeout"; rej(e); }, TIMEOUT_MS); });
    return Promise.race([p, timer]).finally(() => clearTimeout(t));
  }

  async function ask(parts) {
    let lastErr;
    for (const name of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await withTimeout(model(name).generateContent(parts));
          return JSON.parse(res.response.text());
        } catch (e) {
          lastErr = e;
          const st = e && e.customErrorData && e.customErrorData.status;
          // Model tidak mendukung pengaturan berpikir: ulangi model yang sama tanpa pengaturan itu.
          if (st === 400 && !noThink.has(name) && /think/i.test(String(e.message))) { noThink.add(name); continue; }
          break;
        }
      }
      const st = lastErr && lastErr.customErrorData && lastErr.customErrorData.status;
      const slow = lastErr && (lastErr.code === "timeout" || lastErr.name === "AbortError" || /abort|timeout/i.test(String(lastErr.message)));
      // Coba model cadangan bila model ini penuh, lambat, tidak ada, atau sedang bermasalah.
      if (!(slow || st === 429 || st === 404 || st === 500 || st === 503)) break;
    }
    throw lastErr;
  }

  return {
    /** @returns {Promise<{sumber:string, transaksi:Array}>} */
    async read(file, today) {
      const img = await toInline(file);
      const out = await ask([prompt(today), img]);
      return { sumber: String(out.sumber || ""), transaksi: Array.isArray(out.transaksi) ? out.transaksi : [] };
    },
    errorText(e) {
      const code = (e && e.code) || "", st = e && e.customErrorData && e.customErrorData.status;
      if (code === "api-not-enabled" || st === 403) return "Fitur baca screenshot belum diaktifkan di Firebase. Buka Firebase → AI Logic → Mulai, lalu pilih Gemini Developer API.";
      if (code === "timeout" || (e && (e.name === "AbortError" || /abort|timeout/i.test(String(e.message))))) return "Gemini terlalu lama menjawab. Coba lagi sebentar lagi, atau potong screenshot yang sangat panjang menjadi dua.";
      if (st === 429) return "Batas gratis pembacaan screenshot sedang habis. Coba lagi beberapa menit lagi atau besok.";
      if (code === "fetch-error" && !st) return "Tidak ada koneksi internet. Membaca screenshot butuh internet.";
      if (code === "response-error") return "Screenshot ini tidak bisa dibaca. Coba screenshot yang lebih jelas atau tidak terpotong.";
      if (e && e.name === "InvalidStateError") return "File ini bukan gambar yang bisa dibuka.";
      return "Gagal membaca screenshot. Coba lagi.";
    },
  };
}
