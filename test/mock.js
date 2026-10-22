// Data tiruan untuk menguji tampilan tanpa Firebase.
export function createMockData({ loggedIn = true } = {}) {
  let user = loggedIn ? { uid: "u1", email: "kamu@contoh.id" } : null;
  let authCb = () => {};
  const m = new Date().toISOString().slice(0, 7);
  const tx = [
    [1,"masuk","gaji",8500000,"Gaji bulanan"],[1,"keluar","tagihan",350000,"Internet rumah"],[2,"keluar","makan",45000,"Nasi ayam + es teh"],
    [3,"keluar","transport",54000,"Isi bensin motor"],[4,"keluar","belanja",286000,"Belanja mingguan"],[6,"keluar","tagihan",200000,"Token listrik"],
    [9,"keluar","hiburan",100000,"Nonton bioskop"],[11,"keluar","belanja",312000,"Belanja mingguan"],[15,"masuk","sampingan",1250000,"Desain logo klien"],
    [17,"keluar","makan",175000,"Makan malam bareng teman"],[18,"keluar","keluarga",300000,"Kondangan teman"],[20,"keluar","hiburan",186000,"Langganan streaming"],
  ].map((r,i)=>({id:"t"+i,tipe:r[1],kategori:r[2],jumlah:r[3],catatan:r[4],tanggal:m+"-"+String(r[0]).padStart(2,"0"),bulan:m,dibuat:i}));
  let budget = { makan:2000000, transport:600000, belanja:1000000, tagihan:900000, hiburan:400000, kesehatan:300000, keluarga:500000 };
  const subs = new Set(); let bsub = null;
  const emit = () => { for (const s of subs) s.next(tx.filter(t=>t.bulan===s.m), {pending:false}); };
  return {
    onAuth(cb){ authCb = cb; setTimeout(()=>cb(user), 50); return ()=>{}; },
    async signIn(e,p){ if(p!=="rahasia") throw {code:"auth/invalid-credential"}; user={uid:"u1",email:e}; authCb(user); },
    async signUp(e,p){ user={uid:"u1",email:e}; authCb(user); },
    async resetPassword(){},
    async signOut(){ user=null; authCb(null); },
    subscribeMonth(m,next){ const s={m,next}; subs.add(s); setTimeout(()=>next(tx.filter(t=>t.bulan===m),{pending:false}),30); return ()=>subs.delete(s); },
    subscribeBudget(next){ bsub=next; setTimeout(()=>next(budget),20); return ()=>{}; },
    async saveTx(id,d){ if(id){ const i=tx.findIndex(t=>t.id===id); tx[i]={id,...d}; } else tx.push({id:"n"+Date.now(),...d}); emit(); },
    async delTx(id){ const i=tx.findIndex(t=>t.id===id); if(i>=0) tx.splice(i,1); emit(); },
    async saveBudget(b){ budget=b; bsub&&bsub(b); },
  };
}
