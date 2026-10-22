// Lapisan data: login (Firebase Authentication) dan penyimpanan (Cloud Firestore).
// Semua data akun ada di users/{uid}/<koleksi>/... dan dilindungi aturan di firestore.rules.
//
// Koleksi:
//   tx        transaksi (masuk, keluar, transfer, setor, tarik)
//   akun      rekening bank, e-wallet, tunai
//   tabungan  pos tabungan dengan target
//   rencana   rencana jangka panjang (terhubung ke satu pos tabungan)
//   bisnis    usaha milik sendiri
//   settings  dokumen "anggaran"
import { initializeApp } from "firebase/app";
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut,
} from "firebase/auth";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch,
} from "firebase/firestore";

export function createFirebaseData(config) {
  const app = initializeApp(config);
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence] });
  auth.languageCode = "id";

  let db;
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
  }

  let uid = null;
  const col = (name) => collection(db, "users", uid, name);

  return {
    onAuth(cb) {
      return onAuthStateChanged(auth, (u) => { uid = u ? u.uid : null; cb(u ? { uid: u.uid, email: u.email } : null); });
    },
    signIn: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
    signUp: (email, pw) => createUserWithEmailAndPassword(auth, email, pw),
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth),

    /** Pantau seluruh isi satu koleksi. */
    watch(name, next, fail) {
      return onSnapshot(col(name), { includeMetadataChanges: true }, (snap) => {
        next(snap.docs.map((d) => ({ id: d.id, ...d.data() })), { pending: snap.metadata.hasPendingWrites });
      }, fail);
    },
    watchDoc(name, id, next, fail) {
      return onSnapshot(doc(col(name), id), (s) => next(s.exists() ? s.data() : {}), fail);
    },
    newId: (name) => doc(col(name)).id,
    // Perubahan langsung tersimpan di perangkat; janji (promise) selesai saat sampai di server.
    save: (name, id, data) => setDoc(doc(col(name), id), data),
    patch: (name, id, data) => updateDoc(doc(col(name), id), data),
    remove: (name, id) => deleteDoc(doc(col(name), id)),
    /** Perbarui banyak dokumen sekaligus (dipecah per 400). */
    async patchMany(name, items) {
      for (let i = 0; i < items.length; i += 400) {
        const b = writeBatch(db);
        for (const it of items.slice(i, i + 400)) b.update(doc(col(name), it.id), it.data);
        await b.commit();
      }
    },
  };
}
