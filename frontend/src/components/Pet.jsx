import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const STAGE_EMOJI = { egg: "🥚", baby: "🐣", adult: "🐉" };
const STAGE_LABEL = { egg: "Яйцо", baby: "Детёныш", adult: "Взрослый" };
const MOOD_LABEL  = (m) => m >= 75 ? "Счастлив 😄" : m >= 40 ? "Доволен 🙂" : m >= 15 ? "Грустит 😢" : "Несчастен 😭";

function Bar({ value, color, label }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"rgba(255,255,255,0.55)", marginBottom:4 }}>
        <span>{label}</span><span>{value}%</span>
      </div>
      <div style={{ height:8, background:"rgba(255,255,255,0.08)", borderRadius:4, overflow:"hidden" }}>
        <div style={{ width:`${value}%`, height:"100%", background:color, borderRadius:4, transition:"width 0.4s ease" }} />
      </div>
    </div>
  );
}

export default function Pet({ token, showToast }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [data,       setData]       = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [renaming,   setRenaming]   = useState(false);
  const [newName,    setNewName]    = useState("");
  const [nameBusy,   setNameBusy]   = useState(false);

  const load = async () => {
    try {
      const res = await axios.get(`${API}/pet`, authHeaders);
      setData(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const feed = async () => {
    try {
      setBusy(true);
      const res = await axios.post(`${API}/pet/feed`, {}, authHeaders);
      setData(d => ({ ...d, pet: res.data.pet }));
      showToast(res.data.message, "success");
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(false); }
  };

  const saveName = async () => {
    if (!newName.trim()) return;
    try {
      setNameBusy(true);
      const res = await axios.patch(`${API}/pet/name`, { name: newName }, authHeaders);
      setData(d => ({ ...d, pet: { ...d.pet, name: res.data.name } }));
      setRenaming(false); setNewName("");
      showToast("Имя сохранено!", "success");
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setNameBusy(false); }
  };

  if (!data) return <p className="empty-state">Загрузка...</p>;

  if (!data.pet) {
    return (
      <section className="quest-section">
        <div className="section-eyebrow"><span>🐾</span> Питомец</div>
        <div style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:64, marginBottom:16 }}>🥚</div>
          <p style={{ color:"rgba(255,255,255,0.55)", fontSize:14 }}>
            Яйцо питомца появится после 7 дней стрика
          </p>
          <div style={{ marginTop:16, height:8, background:"rgba(255,255,255,0.08)", borderRadius:4, maxWidth:200, margin:"16px auto 0" }}>
            <div style={{ width:`${Math.min(100,(data.currentStreak||0)/7*100)}%`, height:"100%", background:"#fb923c", borderRadius:4, transition:"width 0.4s" }} />
          </div>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:8 }}>
            {data.currentStreak || 0} / 7 дней
          </p>
        </div>
      </section>
    );
  }

  const pet = data.pet;

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>🐾</span> Питомец</div>

      <div style={{ textAlign:"center", padding:"20px 0 12px" }}>
        <div style={{ fontSize:80, marginBottom:8, filter: pet.mood < 15 ? "grayscale(0.6)" : "none", transition:"filter 0.5s" }}>
          {STAGE_EMOJI[pet.stage] || "🥚"}
        </div>

        {renaming ? (
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:6 }}>
            <input className="input" style={{ maxWidth:160, textAlign:"center" }}
              value={newName} onChange={e => setNewName(e.target.value)} maxLength={20}
              placeholder="Новое имя" autoFocus onKeyDown={e => e.key === "Enter" && saveName()} />
            <button className="btn btn-primary btn-sm" disabled={nameBusy || !newName.trim()} onClick={saveName}>
              {nameBusy ? "..." : "✓"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setRenaming(false); setNewName(""); }}>✕</button>
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontSize:18, fontWeight:700, color:"#f1f5f9" }}>{pet.name}</span>
            <button className="btn btn-ghost btn-sm" style={{ padding:"4px 8px", fontSize:11 }}
              onClick={() => { setRenaming(true); setNewName(pet.name); }}>✏️</button>
          </div>
        )}

        <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.06)", borderRadius:6, padding:"2px 8px" }}>
          {STAGE_LABEL[pet.stage]}
        </span>
      </div>

      <div style={{ maxWidth:320, margin:"0 auto", padding:"0 8px" }}>
        <Bar value={pet.mood}          color="#4ade80" label={`Настроение · ${MOOD_LABEL(pet.mood)}`} />
        <Bar value={Math.max(0,100-pet.hunger)} color="#fb923c" label="Сытость" />
      </div>

      <div style={{ textAlign:"center", marginTop:16 }}>
        <button className="btn btn-primary" disabled={busy || !pet.canFeed} onClick={feed}
          style={{ minWidth:140 }}>
          {busy ? "..." : pet.canFeed ? "🍖 Покормить" : "Уже накормлен"}
        </button>
        {!pet.canFeed && (
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:6 }}>
            Следующее кормление через ~{Math.max(1, 60 - Math.round(((Date.now() - new Date(pet.lastFed).getTime()) / 60000)))} мин.
          </p>
        )}
      </div>

      <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.25)", marginTop:16 }}>
        Стадия растёт со стриком: Яйцо → 14 дней → Детёныш → 30 дней → Взрослый
      </p>
    </section>
  );
}
