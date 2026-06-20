import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function formatTime(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function LoadingDots() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);
  return <span style={{ fontFamily:"monospace", fontSize:16 }}>{"●".repeat(frame)}{"○".repeat(3 - frame)}</span>;
}

export default function AiCoach({ token, showToast, compact = false }) {
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
    } catch (e) {
      const msg = e.response?.data?.message;
      if (msg) showToast(msg, "error");
      setAdvice(null);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    await load(true);
    setBusy(false);
  };

  if (compact) {
    return (
      <div style={{
        background:"linear-gradient(135deg, rgba(141,140,248,0.08), rgba(96,165,250,0.05))",
        border:"1px solid rgba(141,140,248,0.2)", borderRadius:14, padding:"14px 16px", marginBottom:12,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <span style={{ fontSize:24 }}>🤖</span>
          <div style={{ fontWeight:700, fontSize:13 }}>AI Коуч</div>
          {updatedAt && <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginLeft:"auto" }}>{formatTime(updatedAt)}</span>}
        </div>
        {loading ? (
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>Анализирую... <LoadingDots /></div>
        ) : advice ? (
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.6, margin:"0 0 10px" }}>{advice}</p>
        ) : (
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", margin:0 }}>Настрой ANTHROPIC_API_KEY для AI советов</p>
        )}
        <button onClick={refresh} disabled={busy || loading} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"rgba(141,140,248,0.7)", padding:0 }}>
          {busy ? "Генерирую..." : isFree ? "↻ Новый совет (бесплатно)" : "↻ Новый совет (−50 монет)"}
        </button>
      </div>
    );
  }

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>🤖</span> AI Коуч</div>
      <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", margin:"0 0 20px" }}>
        Персональный совет на основе твоей статистики · Первый запрос бесплатно, далее −50 монет
      </p>

      <div style={{
        background:"linear-gradient(135deg, rgba(141,140,248,0.1), rgba(96,165,250,0.06))",
        border:"1px solid rgba(141,140,248,0.25)", borderRadius:16, padding:24, marginBottom:20,
        position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, background:"rgba(141,140,248,0.1)", borderRadius:"50%", filter:"blur(30px)" }} />

        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
          <div style={{
            width:56, height:56, borderRadius:"50%",
            background:"linear-gradient(135deg, #6366f1, #8b5cf6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:28, boxShadow:"0 0 20px rgba(99,102,241,0.4)",
            animation: loading ? "pulse 1.5s ease-in-out infinite" : "none",
          }}>🤖</div>
          <div>
            <div style={{ fontWeight:800, fontSize:18 }}>Твой AI Коуч</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Работает на Claude Sonnet</div>
          </div>
          {updatedAt && (
            <div style={{ marginLeft:"auto", textAlign:"right" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>Последнее обновление</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600 }}>{formatTime(updatedAt)}</div>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ fontSize:18, color:"rgba(141,140,248,0.8)", marginBottom:12 }}><LoadingDots /></div>
            <div style={{ fontSize:14, color:"rgba(255,255,255,0.4)" }}>Анализирую твою статистику...</div>
          </div>
        ) : advice ? (
          <div style={{
            background:"rgba(255,255,255,0.05)", borderRadius:12,
            padding:"14px 16px", marginBottom:16,
            borderLeft:"3px solid #8d8cf8",
          }}>
            <p style={{ fontSize:15, lineHeight:1.8, color:"rgba(255,255,255,0.85)", margin:0, fontStyle:"italic" }}>
              «{advice}»
            </p>
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"16px 0", marginBottom:16 }}>
            <div style={{ fontSize:14, color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
              Добавьте ANTHROPIC_API_KEY в backend/.env<br/>для получения персональных AI советов
            </div>
          </div>
        )}

        <button
          className="btn btn-primary"
          disabled={busy || loading}
          onClick={refresh}
          style={{ width:"100%" }}>
          {busy ? "Генерирую совет..." : isFree ? "↻ Получить новый совет (бесплатно)" : "↻ Получить новый совет (−50 монет)"}
        </button>
      </div>

      <div style={{
        background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)",
        borderRadius:12, padding:"12px 16px", fontSize:12, color:"rgba(255,255,255,0.4)", lineHeight:1.6,
      }}>
        💡 AI коуч анализирует твой уровень, стрик, выполненные квесты, сильные и слабые ветки.
        Первый совет каждый день — бесплатно. Следующие — по 50 монет.
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.4); }
          50% { box-shadow: 0 0 35px rgba(99,102,241,0.8); }
        }
      `}</style>
    </section>
  );
}
