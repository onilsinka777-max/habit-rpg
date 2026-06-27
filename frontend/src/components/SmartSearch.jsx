import { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BRANCH_COLORS = { discipline:"#8d8cf8", fitness:"#fb7878", self_development:"#34d399", knowledge:"#38bdf8" };

export default function SmartSearch({ token, onNavigate, onClose }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sel, setSel]         = useState(0);
  const [aiMode, setAiMode]   = useState(false);
  const [aiAnswer, setAiAnswer]   = useState(null);
  const [suggestedView, setSuggestedView] = useState(null);
  const inputRef  = useRef(null);
  const timerRef  = useRef(null);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const search = (q, useAi = aiMode) => {
    clearTimeout(timerRef.current);
    if (!q || q.length < 2) { setResults(null); setAiAnswer(null); setSuggestedView(null); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setAiAnswer(null);
      setSuggestedView(null);
      try {
        const aiParam = useAi ? "&ai=true" : "";
        const res = await axios.get(`${API}/search?q=${encodeURIComponent(q)}${aiParam}`, auth);
        setResults(res.data);
        setSel(0);
        if (res.data.ai_answer) setAiAnswer(res.data.ai_answer);
        if (res.data.suggested_view) setSuggestedView(res.data.suggested_view);
      } catch {}
      finally { setLoading(false); }
    }, 250);
  };

  const allItems = results ? [
    ...results.sections.map(s => ({ type:"section", ...s })),
    ...results.tasks.map(t    => ({ type:"task", ...t })),
    ...results.friends.map(f  => ({ type:"friend", ...f })),
    ...results.achievements.map(a => ({ type:"achievement", ...a })),
  ] : [];

  const handleKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s+1, allItems.length-1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSel(s => Math.max(s-1, 0)); }
    if (e.key === "Enter" && allItems[sel]) { handleClick(allItems[sel]); }
  };

  const handleClick = (item) => {
    if (item.type === "section") { onNavigate?.(item.key); onClose(); }
    else if (item.type === "task") { onNavigate?.("tasks"); onClose(); }
    else if (item.type === "friend") { onNavigate?.("friends"); onClose(); }
    else { onClose(); }
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:80 }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:520, margin:"0 16px" }}>
        {/* Search input */}
        <div style={{
          background:"#141925", border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:14, padding:"12px 16px",
          display:"flex", alignItems:"center", gap:12,
          boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
        }}>
          <span style={{ fontSize:20, color:"rgba(255,255,255,0.3)" }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); search(e.target.value); }}
            onKeyDown={handleKey}
            placeholder="Поиск по квестам, друзьям, разделам..."
            style={{ flex:1, background:"none", border:"none", outline:"none", color:"#f1f5f9", fontSize:16 }}
          />
          {loading && <span style={{ fontSize:14, color:"rgba(255,255,255,0.3)" }}>⏳</span>}
          {query.length >= 2 && (
            <button
              data-active={aiMode}
              onClick={() => { const next = !aiMode; setAiMode(next); search(query, next); }}
              style={{
                background: aiMode ? "linear-gradient(135deg,#7c3aed,#4c1d95)" : "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.4)", borderRadius:8,
                padding:"3px 9px", cursor:"pointer", color: aiMode ? "#fff" : "#c4b5fd",
                fontSize:11, fontWeight:700, whiteSpace:"nowrap", flexShrink:0,
              }}
            >✨ AI</button>
          )}
          <kbd style={{ fontSize:11, background:"rgba(255,255,255,0.07)", borderRadius:5, padding:"2px 7px", color:"rgba(255,255,255,0.3)" }}>ESC</kbd>
        </div>

        {/* Results */}
        {results && (
          <div style={{ background:"#141925", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, marginTop:6, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
            {/* AI answer card */}
            {aiAnswer && (
              <div data-testid="ai-answer" style={{
                borderBottom:"1px solid rgba(124,58,237,0.15)",
                padding:"12px 16px",
                background:"rgba(124,58,237,0.06)",
              }}>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(124,58,237,0.7)", letterSpacing:1, marginBottom:6 }}>✨ AI-ОТВЕТ</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", lineHeight:1.5, marginBottom:suggestedView?8:0 }}>
                  {aiAnswer}
                </div>
                {suggestedView && (
                  <button
                    data-testid="suggested-view"
                    onClick={() => { onNavigate?.(suggestedView); onClose(); }}
                    style={{
                      background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.3)",
                      borderRadius:8, padding:"5px 12px", cursor:"pointer",
                      color:"#c4b5fd", fontSize:12, fontWeight:600,
                    }}
                  >Перейти →</button>
                )}
              </div>
            )}
            {allItems.length === 0 && !aiAnswer ? (
              <div style={{ padding:"20px 16px", textAlign:"center", color:"rgba(255,255,255,0.35)", fontSize:14 }}>Ничего не найдено</div>
            ) : allItems.length === 0 ? null : allItems.map((item, i) => (
              <div key={`${item.type}-${item.id||item.key}`}
                onClick={() => handleClick(item)}
                style={{
                  display:"flex", alignItems:"center", gap:12, padding:"10px 16px",
                  background: i===sel ? "rgba(141,140,248,0.1)" : "transparent",
                  cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.04)",
                  transition:"background 0.1s",
                }}>
                <span style={{ fontSize:18, width:28, textAlign:"center" }}>
                  {item.type==="section" ? item.icon : item.type==="task" ? "⚔️" : item.type==="friend" ? "👤" : item.icon||"🏅"}
                </span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color: i===sel?"#f1f5f9":"rgba(255,255,255,0.8)" }}>
                    {item.title||item.name||item.label}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>
                    {item.type==="task" ? `+${item.xpReward} XP` : item.type==="section" ? "Перейти в раздел" : item.type==="friend" ? `Ур.${item.level}` : item.desc||""}
                  </div>
                </div>
                {item.type==="task" && item.branch && (
                  <div style={{ width:8, height:8, borderRadius:"50%", background:BRANCH_COLORS[item.branch]||"#8d8cf8" }} />
                )}
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.2)" }}>↵</span>
              </div>
            ))}
          </div>
        )}

        {!results && query.length < 2 && (
          <div style={{ background:"#141925", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, marginTop:6, padding:"12px 16px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:1, marginBottom:10 }}>БЫСТРАЯ НАВИГАЦИЯ</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {[["⚔️","tasks","Квесты"],["📊","stats","Статистика"],["🛒","shop","Магазин"],["🗺️","worldmap","Карта"],["🏃","marathons","Марафоны"],["⚡","skills","Навыки"]].map(([icon,key,label]) => (
                <button key={key} onClick={() => { onNavigate?.(key); onClose(); }} style={{
                  display:"flex", alignItems:"center", gap:6, padding:"6px 12px",
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:8, cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:13,
                }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
