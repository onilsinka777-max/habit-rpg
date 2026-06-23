import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function formatTime(date) {
  if (!date) return null;
  return new Date(date).toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
}

function LoadingDots() {
  const [f, setF] = useState(0);
  useEffect(() => { const t = setInterval(() => setF(v => (v+1)%4), 400); return () => clearInterval(t); }, []);
  return <span style={{ fontFamily:"monospace" }}>{"●".repeat(f)}{"○".repeat(3-f)}</span>;
}

function LaptevAvatarSmall({ size = 40 }) {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:"linear-gradient(135deg,#7c3aed,#1e1b4b)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.38, fontWeight:900, color:"#c4b5fd",
      border:"2px solid #7c3aed", flexShrink:0,
    }}>Л</div>
  );
  return (
    <img src="/images/laptev.jpg" alt="LAPTEV" onError={() => setErr(true)} style={{
      width:size, height:size, borderRadius:"50%", border:"2px solid #7c3aed",
      objectFit:"cover", flexShrink:0,
      boxShadow:"0 0 12px rgba(124,58,237,0.5)",
    }}/>
  );
}

export default function AiCoach({ token, showToast, compact = false, onNavigate }) {
  const [advice, setAdvice]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [isFree, setIsFree]       = useState(true);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const load = async (force = false) => {
    setLoading(true);
    try {
      const url = `${API}/ai-coach/advice${force ? "?force=true" : ""}`;
      const res = await axios.get(url, auth);
      setAdvice(res.data.advice);
      setUpdatedAt(res.data.updatedAt);
      setIsFree(res.data.isFreeToday !== false);
    } catch(e) {
      const msg = e.response?.data?.message;
      if (msg) showToast(msg, "error");
      setAdvice(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    await load(true);
    setBusy(false);
  };

  // ── Compact widget (on quests page) ──────────────────────────────────────
  if (compact) {
    return (
      <div style={{
        background:"linear-gradient(135deg,rgba(124,58,237,0.1),rgba(13,11,30,0.97))",
        border:"1px solid rgba(124,58,237,0.25)", borderRadius:16, padding:"14px 16px", marginBottom:12,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <LaptevAvatarSmall size={38} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#c4b5fd" }}>LAPTEV</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>Создатель системы</div>
          </div>
          {updatedAt && <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>{formatTime(updatedAt)}</span>}
        </div>
        {loading ? (
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Анализирую... <LoadingDots /></div>
        ) : advice ? (
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.6, margin:"0 0 10px",
            borderLeft:"2px solid #7c3aed", paddingLeft:10, fontStyle:"italic" }}>"{advice}"</p>
        ) : (
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.35)", margin:"0 0 10px" }}>
            Настрой ANTHROPIC_API_KEY для советов от LAPTEV
          </p>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={refresh} disabled={busy||loading} style={{
            background:"none", border:"none", cursor:"pointer",
            fontSize:11, color:"rgba(124,58,237,0.7)", padding:0, flex:1, textAlign:"left",
          }}>
            {busy ? "Генерирую..." : isFree ? "↻ Новый совет (бесплатно)" : "↻ Новый совет (−50 монет)"}
          </button>
          {onNavigate && (
            <button onClick={() => onNavigate("laptev")} style={{
              background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.3)",
              borderRadius:8, padding:"4px 10px", cursor:"pointer",
              color:"#c4b5fd", fontSize:11, fontWeight:700,
            }}>Открыть чат →</button>
          )}
        </div>
      </div>
    );
  }

  // ── Full page ─────────────────────────────────────────────────────────────
  return (
    <section className="quest-section">
      <style>{`
        @keyframes lapShimmer2 { 0%{background-position:-200%} 100%{background-position:200%} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(124,58,237,0.4)} 50%{box-shadow:0 0 40px rgba(124,58,237,0.8)} }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
        <div style={{ position:"relative" }}>
          <LaptevAvatarSmall size={56} />
          <div style={{ position:"absolute", inset:-4, borderRadius:"50%",
            border:"2px solid transparent", borderTopColor:"#7c3aed",
            animation:"lapSpin 3s linear infinite" }}/>
        </div>
        <div>
          <div style={{
            fontSize:22, fontWeight:900, letterSpacing:3,
            background:"linear-gradient(90deg,#7c3aed,#f5b637,#a78bfa,#7c3aed)",
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"lapShimmer2 3s linear infinite",
          }}>LAPTEV</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Создатель системы · Персональный коуч</div>
        </div>
      </div>

      <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)", margin:"0 0 20px" }}>
        Первый совет каждый день — бесплатно. Следующие — −50 монет.
      </p>

      {/* Advice card */}
      <div style={{
        background:"linear-gradient(135deg,rgba(10,8,24,0.98),rgba(26,10,50,0.95))",
        border:"1px solid rgba(124,58,237,0.3)", borderRadius:18, padding:22, marginBottom:20,
        position:"relative", overflow:"hidden",
        animation: loading ? "glowPulse 1.5s ease-in-out infinite" : "none",
        boxShadow:"0 4px 40px rgba(0,0,0,0.5)",
      }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120,
          background:"rgba(124,58,237,0.08)", borderRadius:"50%", filter:"blur(30px)" }}/>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <LaptevAvatarSmall size={48} />
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:"#c4b5fd" }}>LAPTEV</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Работает на Claude AI</div>
          </div>
          {updatedAt && (
            <div style={{ marginLeft:"auto", textAlign:"right" }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)" }}>Обновлено</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:600 }}>{formatTime(updatedAt)}</div>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ fontSize:16, color:"rgba(124,58,237,0.8)", marginBottom:10 }}><LoadingDots /></div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.35)" }}>Анализирую твою статистику...</div>
          </div>
        ) : advice ? (
          <div style={{
            background:"rgba(124,58,237,0.07)", borderLeft:"3px solid #7c3aed",
            borderRadius:"0 10px 10px 0", padding:"12px 16px", marginBottom:16,
          }}>
            <p style={{ fontSize:15, lineHeight:1.8, color:"rgba(255,255,255,0.85)", margin:0, fontStyle:"italic" }}>
              "{advice}"
            </p>
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"16px 0", marginBottom:16 }}>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.35)", lineHeight:1.6 }}>
              Добавьте ANTHROPIC_API_KEY в backend/.env<br/>для персональных советов от LAPTEV
            </div>
          </div>
        )}

        <button className="btn btn-primary" disabled={busy||loading} onClick={refresh} style={{ width:"100%" }}>
          {busy ? "LAPTEV думает..." : isFree ? "↻ Получить новый совет (бесплатно)" : "↻ Получить новый совет (−50 монет)"}
        </button>
      </div>

      {/* Open chat */}
      {onNavigate && (
        <button onClick={() => onNavigate("laptev")} style={{
          width:"100%", padding:"13px",
          background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.3)",
          borderRadius:14, cursor:"pointer", color:"#c4b5fd",
          fontSize:14, fontWeight:700, marginBottom:16,
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        }}>
          <span>💬</span> Открыть чат с LAPTEV
        </button>
      )}

      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)",
        borderRadius:12, padding:"12px 16px", fontSize:12, color:"rgba(255,255,255,0.35)", lineHeight:1.6 }}>
        💡 LAPTEV анализирует твой уровень, стрик, выполненные квесты и слабые ветки.
      </div>

      <style>{`@keyframes lapSpin { to { transform:rotate(360deg); } }`}</style>
    </section>
  );
}
