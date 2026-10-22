// Lapisan data: login (Firebase Authentication) dan penyimpanan (Cloud Firestore).
// Data tiap akun ada di users/{uid}/... dan dilindungi aturan di firestore.rules.
import { initializeApp } from "firebase/app";
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut,
} from "firebase/auth";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  collection, doc, query, where, onSnapshot, setDoc, deleteDoc,
} from "firebase/firestore";

export function createFirebaseData(config) {
  const app = initializeApp(config);
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence] });
  auth.languageCode = "id";

  let db;
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    // Mis. mode penyamaran: simpan di memori saja.
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
  }

  let uid = null;
  const txCol = () => collection(db, "users", uid, "tx");

  return {
    onAuth(cb) {
      return onAuthStateChanged(auth, (u) => { uid = u ? u.uid : null; cb(u ? { uid: u.uid, email: u.email } : null); });
    },
    signIn: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
    signUp: (email, pw) => createUserWithEmailAndPassword(auth, email, pw),
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth),

    subscribeMonth(month, next, fail) {
      const q = query(txCol(), where("bulan", "==", month));
      return onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
        next(snap.docs.map((d) => ({ id: d.id, ...d.data() })), {
          pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache,
        });
      }, fail);
    },
    subscribeBudget(next, fail) {
      return onSnapshot(doc(db, "users", uid, "settings", "anggaran"), (s) => next(s.exists() ? s.data() : {}), fail);
    },
    // Perubahan langsung tersimpan di perangkat; janji (promise) selesai saat sudah sampai di server.
    saveTx(id, data) {
      const ref = id ? doc(txCol(), id) : doc(txCol());
      return setDoc(ref, data);
    },
    delTx: (id) => deleteDoc(doc(txCol(), id)),
    saveBudget: (b) => setDoc(doc(db, "users", uid, "settings", "anggaran"), b),
  };
}
