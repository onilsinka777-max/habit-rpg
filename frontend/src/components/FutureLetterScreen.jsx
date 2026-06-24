import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TOMORROW_ISO = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 10);

const DATE_PRESETS = [
  { label: "Через 1 месяц",   months: 1 },
  { label: "Через 3 месяца",  months: 3 },
  { label: "Через 1 год",     months: 12 },
];

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export default function FutureLetterScreen({ token, onDone }) {
  const [content, setContent]   = useState("");
  const [preset, setPreset]     = useState(null);
  const [customDate, setCustomDate] = useState("");
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [sentDate, setSentDate] = useState(null);

  const getSendAt = () => {
    if (preset !== null) return addMonths(new Date(), DATE_PRESETS[preset].months);
    if (customDate) return new Date(customDate);
    return null;
  };

  const sendAt = getSendAt();
  const canSend = content.trim().length >= 50 && sendAt && sendAt > new Date();

  const handleSend = async () => {
    if (!canSend || sending) return;
    setSending(true);
    try {
      await fetch(`${API}/future-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: content.trim(), sendAt: sendAt.toISOString() }),
      });
      setSentDate(sendAt);
      setSent(true);
    } catch {
      alert("Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:9999,
        background:"linear-gradient(135deg,#0a0014,#0d0020)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:24,
      }}>
        <style>{`
          @keyframes flyUp { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-120vh) scale(0.5);opacity:0} }
          @keyframes fadeInUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
          .fly-up { animation: flyUp 1.5s ease-in forwards; }
          .fade-up { animation: fadeInUp 0.6s ease 1.6s both; }
        `}</style>

        <div className="fly-up" style={{ fontSize:72, marginBottom:24 }}>📮</div>

        <div className="fade-up" style={{ textAlign:"center" }}>
          <div style={{ fontSize:32, fontWeight:900, color:"#c4b5fd", marginBottom:12 }}>Письмо запечатано</div>
          <div style={{ fontSize:16, color:"rgba(255,255,255,0.65)", marginBottom:8 }}>
            Оно придёт тебе
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:"#a78bfa", marginBottom:32 }}>
            {sentDate?.toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric" })}
          </div>
          <button onClick={onDone} style={{
            padding:"14px 40px", background:"linear-gradient(135deg,#7c3aed,#4c1d95)",
            border:"none", borderRadius:14, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer",
          }}>Начать путь →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999, overflowY:"auto",
      background:"linear-gradient(135deg,#0a0014,#0d0020)",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"40px 20px 80px",
    }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fl-card { animation: fadeIn 0.5s ease both; }
      `}</style>

      {/* Header */}
      <div className="fl-card" style={{ textAlign:"center", marginBottom:32, maxWidth:420 }}>
        <div style={{ fontSize:48, marginBottom:12 }}>✉️</div>
        <h2 style={{ fontSize:24, fontWeight:900, color:"#c4b5fd", margin:"0 0 8px" }}>
          Напиши письмо себе в будущее
        </h2>
        <p style={{ fontSize:14, color:"rgba(255,255,255,0.5)", margin:0, lineHeight:1.6 }}>
          Оно придёт тебе когда ты выберешь.<br/>Каким ты хочешь стать?
        </p>
      </div>

      <div className="fl-card" style={{ width:"100%", maxWidth:480 }}>
        {/* Date picker */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:1, marginBottom:10 }}>
            КОГДА ОТПРАВИТЬ
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            {DATE_PRESETS.map((p, i) => (
              <button key={i} onClick={() => { setPreset(i); setCustomDate(""); }} style={{
                flex:1, padding:"10px 6px", borderRadius:10, border:"1px solid",
                borderColor: preset===i ? "#7c3aed" : "rgba(255,255,255,0.1)",
                background: preset===i ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
                color: preset===i ? "#c4b5fd" : "rgba(255,255,255,0.5)",
                cursor:"pointer", fontSize:11, fontWeight:700, transition:"all 0.15s",
              }}>{p.label}</button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>или</div>
            <input type="date" value={customDate}
              min={TOMORROW_ISO}
              onChange={e => { setCustomDate(e.target.value); setPreset(null); }}
              style={{
                flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
                borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:13,
                colorScheme:"dark",
              }}
            />
          </div>
          {sendAt && (
            <div style={{ fontSize:11, color:"#a78bfa", marginTop:6 }}>
              📅 {sendAt.toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric" })}
            </div>
          )}
        </div>

        {/* Textarea */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:1, marginBottom:10 }}>
            ПИСЬМО
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Привет, будущий я. Сегодня я начинаю свой путь..."
            rows={8}
            style={{
              width:"100%", boxSizing:"border-box",
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(124,58,237,0.25)",
              borderRadius:12, padding:"14px 16px", color:"#e2e8f0", fontSize:14,
              lineHeight:1.6, resize:"vertical", outline:"none",
              transition:"border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.6)"}
            onBlur={e => e.target.style.borderColor = "rgba(124,58,237,0.25)"}
          />
          <div style={{ fontSize:11, textAlign:"right", marginTop:4,
            color: content.length >= 50 ? "#34d399" : "rgba(255,255,255,0.3)" }}>
            {content.length} / 50 минимум
          </div>
        </div>

        {/* Button */}
        <button onClick={handleSend} disabled={!canSend || sending} style={{
          width:"100%", padding:"16px",
          background: canSend ? "linear-gradient(135deg,#7c3aed,#4c1d95)" : "rgba(255,255,255,0.06)",
          border: canSend ? "none" : "1px solid rgba(255,255,255,0.1)",
          borderRadius:14, color: canSend ? "#fff" : "rgba(255,255,255,0.3)",
          fontWeight:700, fontSize:16, cursor: canSend ? "pointer" : "default",
          transition:"all 0.2s",
        }}>
          {sending ? "Запечатываем..." : "Запечатать письмо 📮"}
        </button>

        <button onClick={onDone} style={{
          display:"block", width:"100%", marginTop:12, padding:"12px",
          background:"none", border:"none", color:"rgba(255,255,255,0.3)",
          fontSize:13, cursor:"pointer",
        }}>Пропустить</button>
      </div>
    </div>
  );
}
