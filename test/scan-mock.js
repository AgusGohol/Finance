// Pembaca screenshot tiruan untuk pengujian tampilan (tanpa Gemini).
export function createMockScanner({ fail = false, slow = false, limit = 0 } = {}) {
  let calls = 0;
  const m = new Date().toISOString().slice(0, 7);
  const d = (n) => m + "-" + String(n).padStart(2, "0");
  return {
    async read(file, today, extra) {
      window.__lastExtra = extra;
      await new Promise((r) => setTimeout(r, slow ? 2600 : 300));
      if (fail) { const e = new Error("x"); e.code = "api-not-enabled"; throw e; }
      if (calls++ < limit) { const e = new Error("quota"); e.code = "fetch-error"; e.customErrorData = { status: 429 }; throw e; }
      return {
        sumber: "BCA",
        transaksi: [
          { tanggal: d(4), arah: "keluar", jumlah: 286000, keterangan: "SUPERINDO KEMANG", kategori: "belanja" },
          { tanggal: d(12), arah: "keluar", jumlah: 45500, keterangan: "Kopi Kenangan", kategori: "makan" },
          { tanggal: d(12), arah: "masuk", jumlah: 750000, keterangan: "TRF dari ANDI PRATAMA", kategori: "sampingan" },
          { tanggal: d(13), arah: "keluar", jumlah: 2500, keterangan: "Biaya admin transfer", kategori: "admin" },
          { arah: "keluar", jumlah: 120000, keterangan: "Token PLN", kategori: "tagihan" },
        ],
      };
    },
    errorText(e) { return e.code === "api-not-enabled" ? "Fitur baca screenshot belum diaktifkan di Firebase." : "Gagal membaca screenshot."; },
  };
}
