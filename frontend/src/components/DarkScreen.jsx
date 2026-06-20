import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function DarkScreen({ days, xpLost, token, onChallenge, onClose }) {
  const [busy, setBusy] = useState(false);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const handleRevival = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/me/revival`, {}, auth);
      onChallenge();
    } catch { onChallenge(); }
    finally { setBusy(false); }
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"rgba(3,4,8,0.98)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20,
    }}>
      <div style={{ maxWidth:440, width:"100%", textAlign:"center" }}>
        {/* Animated skull */}
        <div style={{ fontSize:72, marginBottom:24, filter:"grayscale(1)", opacity:0.6, animation:"pulse 2s ease infinite" }}>💀</div>

        <h1 style={{ fontSize:28, fontWeight:900, color:"#ef4444", marginBottom:12, lineHeight:1.3 }}>
          Ты пропустил {days} {days===1?"день":days<5?"дня":"дней"}
        </h1>
        <p style={{ fontSize:16, color:"rgba(239,68,68,0.7)", marginBottom:8 }}>
          Твой персонаж ослабевает без тренировок.
        </p>
        <p style={{ fontSize:14, color:"rgba(255,255,255,0.4)", marginBottom:32, lineHeight:1.6 }}>
          За время отсутствия упущено примерно<br/>
          <span style={{ fontSize:24, fontWeight:900, color:"#ef4444" }}>−{xpLost} XP</span><br/>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>(визуально, реально XP сохраняется)</span>
        </p>

        <div style={{ background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:14, padding:20, marginBottom:24, textAlign:"left" }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:8, color:"#ef4444" }}>⚡ Квест возрождения</div>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.6)", margin:0, lineHeight:1.6 }}>
            Прими вызов и получи особый квест «Возрождение Героя» с двойной наградой.
            Докажи что твой путь продолжается.
          </p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={handleRevival}
            style={{ background:"#ef4444", color:"#fff", fontSize:15, padding:"14px", border:"none" }}>
            {busy ? "Создаю квест..." : "⚔️ Принять вызов возрождения"}
          </button>
          <button onClick={onClose} style={{
            background:"none", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, padding:"10px", color:"rgba(255,255,255,0.4)",
            cursor:"pointer", fontSize:14,
          }}>
            Продолжить без вызова
          </button>
        </div>
      </div>
    </div>
  );
}
