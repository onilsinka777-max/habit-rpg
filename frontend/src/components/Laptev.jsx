import { useState, useRef, useEffect } from "react";
import axios from "axios";
import VoiceInput from "./VoiceInput";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SOCIALS = [
  { icon:"📸", label:"Instagram", url:"https://www.instagram.com/_lap_tev_",  color:"#E1306C" },
  { icon:"🎵", label:"TikTok",    url:"https://www.tiktok.com/@laptev_",       color:"#69C9D0" },
  { icon:"✈️", label:"Telegram", url:"https://t.me/antonchik_zavozit",        color:"#2AABEE" },
];

const MILESTONES = [
  { level:5,  text:"Пять уровней. Не все доходят сюда. Продолжай." },
  { level:10, text:"Десятый уровень. Система работает. Ты работаешь." },
  { level:20, text:"Двадцатый. Ты уже не тот кем был при входе." },
  { level:25, text:"Четверть пути. Мало кто здесь бывает." },
  { level:30, text:"Тридцатый. Теперь ты можешь вести других." },
  { level:40, text:"Легендарный путь открыт. Я знал что ты дойдёшь." },
  { level:50, text:"Половина пути. Большинство людей не достигают этого за всю жизнь." },
];

// ── Stars background ──────────────────────────────────────────────────────────
const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: (i * 137.5) % 100,
  y: (i * 97.3) % 100,
  size: (i % 3) + 1,
  delay: (i * 0.3) % 4,
  dur: 2 + (i % 3),
}));

// ── Avatar ────────────────────────────────────────────────────────────────────
function LaptevBigAvatar({ size = 100 }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ position:"relative", width:size+28, height:size+28, display:"flex", alignItems:"center", justifyContent:"center" }}>
      {/* Outer glow */}
      <div style={{
        position:"absolute", inset:0, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(124,58,237,0.35), transparent 70%)",
        animation:"lapPulse 2.5s ease-in-out infinite",
      }}/>
      {/* Spinning ring */}
      <div style={{
        position:"absolute", inset:4, borderRadius:"50%",
        border:"2px solid transparent",
        borderTopColor:"#7c3aed",
        borderRightColor:"#a78bfa",
        animation:"lapSpin 3s linear infinite",
        boxShadow:"0 0 16px rgba(124,58,237,0.5)",
      }}/>
      {/* Reverse ring */}
      <div style={{
        position:"absolute", inset:8, borderRadius:"50%",
        border:"1px solid transparent",
        borderBottomColor:"rgba(245,182,55,0.5)",
        borderLeftColor:"rgba(245,182,55,0.3)",
        animation:"lapSpin 5s linear infinite reverse",
      }}/>
      {err ? (
        <div style={{
          width:size, height:size, borderRadius:"50%",
          background:"linear-gradient(135deg,#7c3aed,#1e1b4b)",
          display:"flex", alignItems:"center", justifyContent:"center",
          border:"3px solid #7c3aed",
          fontSize:size*0.4, fontWeight:900, color:"#c4b5fd", flexShrink:0,
        }}>Л</div>
      ) : (
        <div style={{ position:"relative" }}>
          <img src="/images/laptev.jpg" alt="LAPTEV" onError={() => setErr(true)}
            style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover",
              border:"3px solid #7c3aed", display:"block",
              boxShadow:"0 0 24px rgba(124,58,237,0.6)",
            }}/>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%",
            background:"rgba(124,58,237,0.12)", pointerEvents:"none" }}/>
        </div>
      )}
      {/* Online dot */}
      <div style={{
        position:"absolute", bottom:14, right:14,
        width:14, height:14, borderRadius:"50%",
        background:"#22c55e", border:"2px solid #050510",
        boxShadow:"0 0 8px #22c55e",
        animation:"lapOnline 2s ease-in-out infinite",
      }}/>
    </div>
  );
}

function SmallAvatar() {
  const [err, setErr] = useState(false);
  return err ? (
    <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#1e1b4b)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:12, fontWeight:900, color:"#c4b5fd", border:"1px solid #7c3aed", flexShrink:0 }}>Л</div>
  ) : (
    <img src="/images/laptev.jpg" onError={() => setErr(true)} alt="L"
      style={{ width:28, height:28, borderRadius:"50%", border:"1px solid #7c3aed",
        objectFit:"cover", display:"block", flexShrink:0 }}/>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display:"flex", gap:4, alignItems:"center", padding:"4px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:6, height:6, borderRadius:"50%",
          background:"#7c3aed",
          animation:`lapDot 1.2s ease-in-out ${i*0.2}s infinite`,
        }}/>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Laptev({ token, user, showToast, onNavigate }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const [msgs, setMsgs] = useState([]);
  const [input, setInput]     = useState("");
  const [sending, setSending] = useState(false);
  const [msgsLeft, setMsgsLeft] = useState(5);
  const [tab, setTab]         = useState("chat");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const userMsgCount = msgs.filter(m => m.role === "user").length;
  const showChessBtn = userMsgCount >= 3 && tab !== "knowledge";
  const bottomRef   = useRef(null);

  // ── Knowledge Chat state ──────────────────────────────────────────────────
  const [kMsgs, setKMsgs]       = useState([]);
  const [kInput, setKInput]     = useState("");
  const [kSending, setKSending] = useState(false);
  const [kMsgsLeft, setKMsgsLeft] = useState(10);
  const kBottomRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/laptev/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.messages?.length > 0) {
          setMsgs(data.messages.map(m => ({ role: m.role, content: m.content })));
        } else {
          setMsgs([{ role:"assistant", content:"Привет. Я Антон. Создал эту систему для себя — она изменила мою жизнь. Теперь она твоя. О чём поговорим?" }]);
        }
        setMsgsLeft(data.messagesLeft ?? 5);
      })
      .catch(() => {
        setMsgs([{ role:"assistant", content:"Привет. Я Антон. Создал эту систему для себя — она изменила мою жизнь. Теперь она твоя. О чём поговорим?" }]);
      })
      .finally(() => setHistoryLoaded(true));
  }, [token]);

  useEffect(() => {
    if (!token || tab !== "knowledge") return;
    if (kMsgs.length > 0) return;
    fetch(`${API}/knowledge/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.messages?.length > 0) {
          setKMsgs(data.messages.map(m => ({ role: m.role, content: m.content })));
        } else {
          setKMsgs([{ role:"assistant", content:"Привет. Здесь я вижу всю твою историю — цели, задачи, журнал. Спроси о чём угодно." }]);
        }
        if (data.messagesLeft != null) setKMsgsLeft(data.messagesLeft);
      })
      .catch(() => {
        setKMsgs([{ role:"assistant", content:"Привет. Здесь я вижу всю твою историю — цели, задачи, журнал. Спроси о чём угодно." }]);
      });
  }, [token, tab]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);
  useEffect(() => { kBottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [kMsgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || msgsLeft <= 0) return;
    const newMsgs = [...msgs, { role:"user", content:text }];
    setMsgs(newMsgs);
    setInput("");
    setSending(true);
    try {
      const history = newMsgs.slice(-9).slice(0,-1).map(m => ({ role:m.role, content:m.content }));
      const res = await axios.post(`${API}/laptev/chat`, { message:text, history }, auth);
      setMsgs(prev => [...prev, { role:"assistant", content:res.data.reply }]);
      setMsgsLeft(res.data.messagesLeft ?? 4);
    } catch(e) {
      const msg = e.response?.data?.message || "Ошибка связи";
      setMsgs(prev => [...prev, { role:"assistant", content:msg }]);
      if (e.response?.data?.messagesLeft === 0) setMsgsLeft(0);
    } finally { setSending(false); }
  };

  const sendKnowledge = async () => {
    const text = kInput.trim();
    if (!text || kSending || kMsgsLeft <= 0) return;
    const newMsgs = [...kMsgs, { role:"user", content:text }];
    setKMsgs(newMsgs);
    setKInput("");
    setKSending(true);
    try {
      const history = newMsgs.slice(-9).slice(0,-1).map(m => ({ role:m.role, content:m.content }));
      const res = await axios.post(`${API}/knowledge/chat`, { message:text, history }, auth);
      setKMsgs(prev => [...prev, { role:"assistant", content:res.data.reply }]);
      setKMsgsLeft(res.data.messagesLeft ?? kMsgsLeft - 1);
    } catch(e) {
      const msg = e.response?.data?.message || "Ошибка связи";
      setKMsgs(prev => [...prev, { role:"assistant", content:msg }]);
      if (e.response?.status === 429) setKMsgsLeft(0);
    } finally { setKSending(false); }
  };

  return (
    <div style={{ position:"relative", minHeight:"100vh", background:"#050510", paddingBottom:80, overflow:"hidden" }}>
      <style>{`
        @keyframes lapSpin    { to { transform:rotate(360deg); } }
        @keyframes lapPulse   { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes lapOnline  { 0%,100%{box-shadow:0 0 8px #22c55e} 50%{box-shadow:0 0 16px #22c55e} }
        @keyframes lapShimmer { 0%{background-position:-200%} 100%{background-position:200%} }
        @keyframes lapCandle  { 0%,100%{opacity:0.9;transform:scaleY(1)} 50%{opacity:0.6;transform:scaleY(0.85)} }
        @keyframes lapTwinkle { 0%,100%{opacity:0.15} 50%{opacity:0.9} }
        @keyframes lapDot     { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(-4px);opacity:1} }
        @keyframes lapFadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Stars ── */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        {STARS.map((s, i) => (
          <div key={i} style={{
            position:"absolute",
            left:`${s.x}%`, top:`${s.y}%`,
            width:s.size, height:s.size,
            borderRadius:"50%", background:"#fff",
            animation:`lapTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}/>
        ))}
      </div>

      {/* ── Columns ── */}
      <div style={{ position:"fixed", left:0, top:0, bottom:0, width:18, zIndex:1, pointerEvents:"none",
        background:"linear-gradient(180deg,rgba(124,58,237,0.0),rgba(124,58,237,0.25),rgba(124,58,237,0.0))",
        boxShadow:"2px 0 20px rgba(124,58,237,0.3)" }}/>
      <div style={{ position:"fixed", right:0, top:0, bottom:0, width:18, zIndex:1, pointerEvents:"none",
        background:"linear-gradient(180deg,rgba(124,58,237,0.0),rgba(124,58,237,0.25),rgba(124,58,237,0.0))",
        boxShadow:"-2px 0 20px rgba(124,58,237,0.3)" }}/>

      {/* ── Candles top ── */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:60, zIndex:2, pointerEvents:"none",
        display:"flex", justifyContent:"space-around", alignItems:"flex-start", padding:"0 40px" }}>
        {[0,1,2,3,4,5,6].map(i => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            <div style={{ width:6, height:18, background:"linear-gradient(180deg,#fde68a,#f5b637)",
              animation:`lapCandle ${1.5+i*0.2}s ease-in-out ${i*0.15}s infinite`,
              borderRadius:"50% 50% 0 0", boxShadow:"0 0 8px rgba(245,182,55,0.8)", marginBottom:2 }}/>
            <div style={{ width:4, height:20, background:"rgba(255,255,255,0.15)", borderRadius:2 }}/>
          </div>
        ))}
      </div>

      {/* ── Background gradient ── */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        background:"radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)" }}/>

      {/* ── Content ── */}
      <div style={{ position:"relative", zIndex:10, maxWidth:600, margin:"0 auto", padding:"70px 16px 0" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, marginBottom:24 }}>
          <LaptevBigAvatar size={100} />

          {/* Status */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e",
              boxShadow:"0 0 6px #22c55e", animation:"lapOnline 2s ease-in-out infinite" }}/>
            <span style={{ fontSize:11, color:"#22c55e", fontWeight:800, letterSpacing:2 }}>В СИСТЕМЕ</span>
          </div>

          {/* Shimmer name */}
          <div style={{
            fontSize:36, fontWeight:900, letterSpacing:6,
            background:"linear-gradient(90deg,#7c3aed,#f5b637,#a78bfa,#7c3aed)",
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"lapShimmer 3s linear infinite",
          }}>LAPTEV</div>

          <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", textAlign:"center" }}>
            Создатель системы · Прошёл путь до Легенды
          </div>

          {/* Lore */}
          <div style={{
            background:"rgba(124,58,237,0.07)", borderLeft:"3px solid #7c3aed",
            borderRadius:"0 10px 10px 0", padding:"10px 14px",
            fontSize:13, lineHeight:1.65, color:"rgba(255,255,255,0.7)",
            fontStyle:"italic", maxWidth:380, textAlign:"center",
          }}>
            "Я создал LevelUp для себя. Когда понял что жизнь — это игра, всё изменилось. Теперь эта система твоя. Используй её."
          </div>

          {/* Socials */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
            {SOCIALS.map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
                borderRadius:20, background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.1)",
                textDecoration:"none", color:"rgba(255,255,255,0.6)", fontSize:13,
                transition:"all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.color = s.color; e.currentTarget.style.background = `${s.color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              >
                <span>{s.icon}</span><span style={{ fontWeight:600 }}>{s.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height:1, background:"linear-gradient(90deg,transparent,rgba(124,58,237,0.4),transparent)", marginBottom:20 }}/>

        {/* ── Tab switcher ── */}
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          {[["chat","💬 Чат"],["knowledge","🧠 База знаний"]].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key === tab ? tab : key)} data-active={tab === key} style={{
              flex:1, padding:"9px 0", borderRadius:12, fontSize:13, fontWeight:700,
              border:"1px solid rgba(124,58,237,0.3)", cursor:"pointer",
              background: tab === key ? "linear-gradient(135deg,#7c3aed,#4c1d95)" : "rgba(124,58,237,0.07)",
              color: tab === key ? "#fff" : "#c4b5fd",
              transition:"all 0.15s",
            }}>{label}</button>
          ))}
        </div>

        {/* ── Chat ── */}
        {tab === "chat" && <div style={{
          background:"linear-gradient(135deg,rgba(10,8,24,0.97),rgba(20,10,50,0.95))",
          border:"1px solid rgba(124,58,237,0.3)", borderRadius:20,
          padding:16, marginBottom:16,
          boxShadow:"0 4px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(124,58,237,0.1)",
        }}>
          {/* Chat header */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14,
            paddingBottom:12, borderBottom:"1px solid rgba(124,58,237,0.12)" }}>
            <SmallAvatar />
            <div>
              <div style={{ fontWeight:800, fontSize:13, color:"#c4b5fd" }}>LAPTEV</div>
              <div style={{ fontSize:10, color:"#22c55e" }}>● онлайн</div>
            </div>
            {msgsLeft <= 0 ? (
              <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(239,68,68,0.7)", fontWeight:600 }}>Лимит исчерпан</span>
            ) : (
              <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(255,255,255,0.25)" }}>{msgsLeft}/5 сообщений</span>
            )}
          </div>

          {/* Messages */}
          <div style={{ maxHeight:"45vh", overflowY:"auto", display:"flex", flexDirection:"column", gap:10, marginBottom:12,
            scrollbarWidth:"thin", scrollbarColor:"rgba(124,58,237,0.3) transparent" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                display:"flex", alignItems:"flex-end", gap:8,
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                animation:"lapFadeIn 0.25s ease",
              }}>
                {m.role === "assistant" && <SmallAvatar />}
                <div style={{
                  maxWidth:"78%",
                  background: m.role === "user"
                    ? "linear-gradient(135deg,#7c3aed,#4c1d95)"
                    : "#1a0a2e",
                  borderLeft: m.role === "assistant" ? "3px solid #7c3aed" : "none",
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding:"10px 14px",
                  fontSize:14, lineHeight:1.55, color:"#e2e8f0",
                  boxShadow: m.role === "user" ? "0 0 14px rgba(124,58,237,0.3)" : "0 2px 12px rgba(0,0,0,0.4)",
                }}>{m.content}</div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, animation:"lapFadeIn 0.25s ease" }}>
                <SmallAvatar />
                <div style={{ background:"#1a0a2e", borderLeft:"3px solid #7c3aed",
                  borderRadius:"18px 18px 18px 4px", padding:"10px 16px" }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <VoiceInput onResult={text => setInput(prev => prev + text)} size={14} />
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={msgsLeft > 0 ? "Написать LAPTEV..." : "На сегодня достаточно"}
              disabled={sending || msgsLeft <= 0}
              style={{
                flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(124,58,237,0.25)",
                borderRadius:24, padding:"10px 16px", color:"#e2e8f0", fontSize:14, outline:"none",
                transition:"border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(124,58,237,0.25)"}
            />
            <button onClick={send} disabled={sending || !input.trim() || msgsLeft <= 0}
              style={{
                background: sending || !input.trim() || msgsLeft <= 0
                  ? "rgba(124,58,237,0.2)"
                  : "linear-gradient(135deg,#7c3aed,#4c1d95)",
                border:"none", borderRadius:"50%", width:42, height:42,
                color:"#fff", cursor: sending || msgsLeft <= 0 ? "default" : "pointer",
                fontWeight:700, fontSize:18, flexShrink:0,
                boxShadow: sending || !input.trim() ? "none" : "0 0 12px rgba(124,58,237,0.4)",
                transition:"all 0.15s",
              }}>→</button>
          </div>
        </div>}

        {/* ── Knowledge Chat ── */}
        {tab === "knowledge" && <div style={{
          background:"linear-gradient(135deg,rgba(10,8,24,0.97),rgba(20,10,50,0.95))",
          border:"1px solid rgba(124,58,237,0.3)", borderRadius:20,
          padding:16, marginBottom:16,
          boxShadow:"0 4px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(124,58,237,0.1)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14,
            paddingBottom:12, borderBottom:"1px solid rgba(124,58,237,0.12)" }}>
            <SmallAvatar />
            <div>
              <div style={{ fontWeight:800, fontSize:13, color:"#c4b5fd" }}>LAPTEV · База знаний</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>Видит твои цели, задачи, журнал</div>
            </div>
            {kMsgsLeft <= 0 ? (
              <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(239,68,68,0.7)", fontWeight:600 }}>Лимит исчерпан</span>
            ) : (
              <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(255,255,255,0.25)" }}>{kMsgsLeft}/10 сообщений</span>
            )}
          </div>

          <div style={{ maxHeight:"45vh", overflowY:"auto", display:"flex", flexDirection:"column", gap:10, marginBottom:12,
            scrollbarWidth:"thin", scrollbarColor:"rgba(124,58,237,0.3) transparent" }}>
            {kMsgs.map((m, i) => (
              <div key={i} data-role={m.role} style={{
                display:"flex", alignItems:"flex-end", gap:8,
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                animation:"lapFadeIn 0.25s ease",
              }}>
                {m.role === "assistant" && <SmallAvatar />}
                <div style={{
                  maxWidth:"78%",
                  background: m.role === "user" ? "linear-gradient(135deg,#7c3aed,#4c1d95)" : "#1a0a2e",
                  borderLeft: m.role === "assistant" ? "3px solid #34d399" : "none",
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding:"10px 14px", fontSize:14, lineHeight:1.55, color:"#e2e8f0",
                  boxShadow: m.role === "user" ? "0 0 14px rgba(124,58,237,0.3)" : "0 2px 12px rgba(0,0,0,0.4)",
                }}>{m.content}</div>
              </div>
            ))}
            {kSending && (
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, animation:"lapFadeIn 0.25s ease" }}>
                <SmallAvatar />
                <div style={{ background:"#1a0a2e", borderLeft:"3px solid #34d399",
                  borderRadius:"18px 18px 18px 4px", padding:"10px 16px" }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={kBottomRef}/>
          </div>

          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input value={kInput} onChange={e => setKInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendKnowledge()}
              placeholder={kMsgsLeft > 0 ? "Спроси о своих целях, задачах, прогрессе..." : "На сегодня достаточно"}
              disabled={kSending || kMsgsLeft <= 0}
              maxLength={500}
              style={{
                flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(52,211,153,0.25)",
                borderRadius:24, padding:"10px 16px", color:"#e2e8f0", fontSize:14, outline:"none",
                transition:"border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(52,211,153,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(52,211,153,0.25)"}
            />
            <button onClick={sendKnowledge} disabled={kSending || !kInput.trim() || kMsgsLeft <= 0}
              style={{
                background: kSending || !kInput.trim() || kMsgsLeft <= 0
                  ? "rgba(52,211,153,0.15)"
                  : "linear-gradient(135deg,#059669,#065f46)",
                border:"none", borderRadius:"50%", width:42, height:42,
                color:"#fff", cursor: kSending || kMsgsLeft <= 0 ? "default" : "pointer",
                fontWeight:700, fontSize:18, flexShrink:0, transition:"all 0.15s",
              }}>→</button>
          </div>
        </div>}

        {/* ── Chess button (after 3 messages) ── */}
        {showChessBtn && (
          <button onClick={() => setTab(tab === "chess" ? "chat" : "chess")} style={{
            width:"100%", padding:"13px",
            background:"rgba(124,58,237,0.08)",
            border:"1px solid rgba(124,58,237,0.35)",
            borderRadius:14, cursor:"pointer", color:"#c4b5fd",
            fontSize:14, fontWeight:700, marginBottom:16,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            animation:"lapFadeIn 0.4s ease",
            boxShadow:"0 0 20px rgba(124,58,237,0.15)",
            transition:"all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.18)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.08)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)"; }}
          >
            <span style={{ fontSize:20 }}>♟</span>
            {tab === "chess" ? "Вернуться к чату" : "Сыграть с создателем"}
          </button>
        )}

        {/* ── Chess section ── */}
        {tab === "chess" && (
          <div style={{ animation:"lapFadeIn 0.3s ease" }}>
            <LaptevChessSection token={token} showToast={showToast} user={user} />
          </div>
        )}

      </div>
    </div>
  );
}

// ── CHESS VS BOT (inline) ─────────────────────────────────────────────────────
const INIT_BOARD = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R'],
];
const GLYPHS = {K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const isW = p => p && p === p.toUpperCase();
const isB = p => p && p !== p.toUpperCase();
const clr = p => p ? (isW(p) ? 'w' : 'b') : null;

function attacked(board, row, col, by) {
  const knight=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for(const[dr,dc]of knight){const r=row+dr,c=col+dc;if(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p&&p.toLowerCase()==='n'&&clr(p)===by)return true;}}
  const pr=by==='w'?row+1:row-1;
  for(const dc of[-1,1]){const c=col+dc;if(pr>=0&&pr<8&&c>=0&&c<8){const p=board[pr][c];if(p&&p.toLowerCase()==='p'&&clr(p)===by)return true;}}
  for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){let r=row+dr,c=col+dc;while(r>=0&&r<8&&c>=0&&c<8){if(board[r][c]){if((board[r][c].toLowerCase()==='r'||board[r][c].toLowerCase()==='q')&&clr(board[r][c])===by)return true;break;}r+=dr;c+=dc;}}
  for(const[dr,dc]of[[-1,-1],[-1,1],[1,-1],[1,1]]){let r=row+dr,c=col+dc;while(r>=0&&r<8&&c>=0&&c<8){if(board[r][c]){if((board[r][c].toLowerCase()==='b'||board[r][c].toLowerCase()==='q')&&clr(board[r][c])===by)return true;break;}r+=dr;c+=dc;}}
  for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){const r=row+dr,c=col+dc;if(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p&&p.toLowerCase()==='k'&&clr(p)===by)return true;}}
  return false;
}
function inCheck(board, color) {
  const k = color==='w'?'K':'k';
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]===k)return attacked(board,r,c,color==='w'?'b':'w');
  return false;
}
function legalMovesFor(board, color) {
  const moves=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=board[r][c];if(!p||clr(p)!==color)continue;
    const t=p.toLowerCase();const friendly=color==='w'?isW:isB;const pseudo=[];
    const add=(tr,tc)=>{if(tr<0||tr>7||tc<0||tc>7)return false;if(friendly(board[tr][tc]))return false;pseudo.push([tr,tc]);return!board[tr][tc];};
    const ray=(dr,dc)=>{let rr=r+dr,cc=c+dc;while(rr>=0&&rr<8&&cc>=0&&cc<8){if(!add(rr,cc))break;rr+=dr;cc+=dc;}};
    if(t==='p'){const dir=color==='w'?-1:1;const st=color==='w'?6:1;if(!board[r+dir]?.[c]){pseudo.push([r+dir,c]);if(r===st&&!board[r+dir*2]?.[c])pseudo.push([r+dir*2,c]);}for(const dc of[-1,1])if((color==='w'?isB:isW)(board[r+dir]?.[c+dc]))pseudo.push([r+dir,c+dc]);}
    else if(t==='r')[[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>ray(dr,dc));
    else if(t==='b')[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>ray(dr,dc));
    else if(t==='q')[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>ray(dr,dc));
    else if(t==='n')[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
    else if(t==='k')[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
    for(const[tr,tc]of pseudo){const nb=board.map(row=>[...row]);nb[tr][tc]=nb[r][c];nb[r][c]=null;if(!inCheck(nb,color))moves.push({fr:r,fc:c,tr,tc});}
  }
  return moves;
}
const PIECE_VAL = {p:1,n:3,b:3,r:5,q:9,k:0};
const BOT_MSGS_CAPTURE = ["Неплохо.","Хороший ход.","Уважаю."];
const BOT_MSGS_MOVE    = ["Классика.","Интересно.","Хм.","Посмотрим."];
const BOT_MSGS_CHECK   = ["Думай.","Осторожнее.","Смотри внимательнее."];
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const BOT_RATING = 1500;
function calcElo(my,opp,res){const K=32,ex=1/(1+Math.pow(10,(opp-my)/400)),s=res==='win'?1:res==='draw'?0.5:0;return Math.round(K*(s-ex));}

function LaptevChessSection({ token, showToast, user }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const boardRef = useRef(INIT_BOARD.map(r=>[...r]));
  const [tick, setTick]           = useState(0);
  const [sel, setSel]             = useState(null);
  const [lm, setLm]               = useState([]);
  const [status, setStatus]       = useState("playing");
  const [xpGained, setXpGained]   = useState(null);
  const [eggUnlocked, setEggUnlocked] = useState(null);
  const [botComment, setBotComment]   = useState(null);
  const [ratingChange, setRatingChange] = useState(null);
  const [botThinking, setBotThinking]   = useState(false);
  const workerRef = useRef(null);
  const myRating  = user?.chessRating || 1000;
  const board     = boardRef.current;

  const startWorker = () => {
    workerRef.current?.terminate();
    const w = new Worker('/chessWorker.js');
    w.onmessage = (e) => {
      const bm = e.data.move; setBotThinking(false);
      const nb = boardRef.current.map(r=>[...r]);
      if (!bm) { finishGame("draw", nb); return; }
      const cap = nb[bm.tr][bm.tc];
      nb[bm.tr][bm.tc] = nb[bm.fr][bm.fc]; nb[bm.fr][bm.fc] = null;
      if (nb[bm.tr][bm.tc]==='p'&&bm.tr===7) nb[bm.tr][bm.tc]='q';
      const comment = cap ? pick(BOT_MSGS_CAPTURE) : inCheck(nb,'w') ? pick(BOT_MSGS_CHECK) : pick(BOT_MSGS_MOVE);
      setBotComment(comment); setTimeout(()=>setBotComment(null),2500);
      const pm = legalMovesFor(nb,'w');
      if (!pm.length){boardRef.current=nb;setTick(t=>t+1);finishGame(inCheck(nb,'w')?"lose":"draw",nb);return;}
      boardRef.current=nb; setTick(t=>t+1);
    };
    workerRef.current = w;
  };

  useEffect(() => { startWorker(); return ()=>workerRef.current?.terminate(); }, []);

  const finishGame = async (result, finalBoard) => {
    if (finalBoard) boardRef.current = finalBoard;
    setStatus(result);
    const delta = calcElo(myRating, BOT_RATING, result==='player'?'win':result==='draw'?'draw':'loss');
    setRatingChange(delta);
    try {
      const res = await axios.post(`${API}/chess/vs-bot/result`, { result, ratingChange:delta }, auth);
      setXpGained(res.data.xp);
      if (res.data.easterEgg) setEggUnlocked(res.data.easterEgg);
    } catch {}
  };

  const handleClick = (r, c) => {
    if (status!=="playing"||botThinking) return;
    const p = board[r][c];
    if (sel) {
      if (lm.some(([lr,lc])=>lr===r&&lc===c)) {
        const nb = board.map(row=>[...row]);
        nb[r][c]=nb[sel[0]][sel[1]];nb[sel[0]][sel[1]]=null;
        if(nb[r][c]==='P'&&r===0)nb[r][c]='Q';
        setSel(null);setLm([]);
        const om = legalMovesFor(nb,'b');
        if(!om.length){boardRef.current=nb;setTick(t=>t+1);finishGame(inCheck(nb,'b')?"player":"draw",nb);return;}
        boardRef.current=nb;setTick(t=>t+1);
        setBotThinking(true); workerRef.current?.postMessage({board:nb});
      } else if(p&&clr(p)==='w'){
        setSel([r,c]);setLm(legalMovesFor(board,'w').filter(m=>m.fr===r&&m.fc===c).map(m=>[m.tr,m.tc]));
      } else {setSel(null);setLm([]);}
    } else {
      if(!p||clr(p)!=='w')return;
      setSel([r,c]);setLm(legalMovesFor(board,'w').filter(m=>m.fr===r&&m.fc===c).map(m=>[m.tr,m.tc]));
    }
  };

  const resign = ()=>{if(status==="playing")finishGame("lose",null);};
  const reset  = ()=>{
    startWorker();
    boardRef.current=INIT_BOARD.map(r=>[...r]);
    setSel(null);setLm([]);setStatus("playing");
    setXpGained(null);setEggUnlocked(null);setRatingChange(null);setBotThinking(false);setTick(t=>t+1);
  };

  const kingInCheck = inCheck(board,'w');
  let kingPos = null;
  if(kingInCheck){outer:for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]==='K'){kingPos=[r,c];break outer;}}

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {/* Ratings */}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 14px",
        background:"rgba(124,58,237,0.07)", borderRadius:12, border:"1px solid rgba(124,58,237,0.15)" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>Вы (белые)</div>
          <div style={{ fontWeight:800, fontSize:16, color:"#fff" }}>{myRating}</div>
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)", alignSelf:"center" }}>vs</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>LAPTEV (чёрные)</div>
          <div style={{ fontWeight:800, fontSize:16, color:"#c4b5fd" }}>{BOT_RATING}</div>
        </div>
      </div>

      {botComment && (
        <div style={{ background:"rgba(26,10,46,0.95)", border:"1px solid rgba(124,58,237,0.4)",
          borderRadius:10, padding:"8px 14px", fontSize:13, color:"rgba(255,255,255,0.8)", fontStyle:"italic", textAlign:"center" }}>
          LAPTEV: "{botComment}"
        </div>
      )}
      {botThinking && <div style={{ textAlign:"center", fontSize:12, color:"#a78bfa" }}>🤔 LAPTEV думает...</div>}

      {/* Result */}
      {status !== "playing" && (
        <div style={{ background:"rgba(26,10,46,0.97)", border:"1px solid #7c3aed",
          borderRadius:16, padding:20, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>
            {status==="player"?"🏆":status==="draw"?"🤝":"😤"}
          </div>
          <div style={{ fontWeight:900, fontSize:20, marginBottom:6,
            color:status==="player"?"#34d399":status==="draw"?"#fbbf24":"#ef4444" }}>
            {status==="player"?"Победа!":status==="draw"?"Ничья":"Поражение"}
          </div>
          {ratingChange!==null && (
            <div style={{ fontSize:15, fontWeight:700, marginBottom:6,
              color:ratingChange>=0?"#34d399":"#ef4444" }}>
              {ratingChange>=0?"+":""}{ratingChange} рейтинга
            </div>
          )}
          {xpGained && <div style={{ fontSize:13, color:"#a78bfa", marginBottom:8 }}>+{xpGained} XP</div>}
          {eggUnlocked && (
            <div style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.3)",
              borderRadius:10, padding:10, marginBottom:10 }}>
              <div style={{ fontSize:20 }}>{eggUnlocked.icon||"♟️"}</div>
              <div style={{ fontWeight:700, color:"#fbbf24", fontSize:13 }}>🥚 {eggUnlocked.title}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>+{eggUnlocked.rewardGold}💰 +{eggUnlocked.rewardXp}XP</div>
            </div>
          )}
          <button onClick={reset} style={{ padding:"10px 28px", background:"linear-gradient(135deg,#7c3aed,#4c1d95)",
            border:"none", borderRadius:10, cursor:"pointer", color:"#fff", fontWeight:700 }}>
            Сыграть снова
          </button>
        </div>
      )}

      {/* Board */}
      <div style={{ display:"flex", justifyContent:"center" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)",
          width:"min(360px,100%)", aspectRatio:"1",
          border:"3px solid #7c3aed", borderRadius:8, overflow:"hidden",
          boxShadow:"0 0 30px rgba(124,58,237,0.5)" }}>
          {board.map((row,r) => row.map((piece,c) => {
            const light = (r+c)%2===0;
            const isSel = sel?.[0]===r&&sel?.[1]===c;
            const isLegal = lm.some(([lr,lc])=>lr===r&&lc===c);
            const isKingCheck = kingPos&&kingPos[0]===r&&kingPos[1]===c;
            return (
              <div key={`${r}${c}`} onClick={()=>handleClick(r,c)} style={{
                background: isSel?"rgba(245,182,55,0.55)":isKingCheck?"rgba(239,68,68,0.45)":light?"#c8b8e8":"#4a3570",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:botThinking||status!=="playing"?"default":"pointer",
                aspectRatio:"1", position:"relative", transition:"filter 0.08s",
              }}>
                {isLegal&&!piece&&<div style={{ width:"32%",height:"32%",borderRadius:"50%",background:"rgba(52,211,153,0.65)" }}/>}
                {isLegal&&piece&&<div style={{ position:"absolute",inset:2,border:"3px solid rgba(52,211,153,0.7)",boxSizing:"border-box",pointerEvents:"none",borderRadius:4 }}/>}
                {piece&&<span style={{
                  fontSize:"clamp(18px,4.5vw,36px)", lineHeight:1, userSelect:"none",
                  color: isW(piece) ? "#ffffff" : "#1a0a2e",
                  textShadow: isW(piece)
                    ? "0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(255,255,255,0.3)"
                    : "0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(124,58,237,0.5)",
                }}>{GLYPHS[piece]}</span>}
              </div>
            );
          }))}
        </div>
      </div>

      {status==="playing" && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 4px" }}>
          <div style={{ fontSize:12, color:kingInCheck?"#ef4444":"rgba(255,255,255,0.4)" }}>
            {botThinking?"⏳ Ход LAPTEV...":kingInCheck?"⚠️ Шах!":"Ваш ход ♙"}
          </div>
          <button onClick={resign} disabled={botThinking} style={{
            background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)",
            borderRadius:8, padding:"5px 12px", color:"#ef4444",
            cursor:"pointer", fontSize:12, fontWeight:700,
          }}>🏳️ Сдаться</button>
        </div>
      )}
    </div>
  );
}
