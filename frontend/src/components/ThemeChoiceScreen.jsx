const THEMES = [
  {
    id: "dark-fantasy",
    label: "Тёмное фэнтези",
    desc: "Тёмное фэнтези — классика. Фиолетовые акценты, магическая атмосфера.",
    colors: ["#1e1b32", "#8d8cf8", "#f5b637"],
    icon: "🧙",
  },
  {
    id: "solo-leveling",
    label: "Соло Левелинг",
    desc: "Стиль охотника. Чёрный минимализм, синие неоновые вспышки.",
    colors: ["#03060f", "#3b82f6", "#60a5fa"],
    icon: "⚔️",
  },
  {
    id: "cosmic",
    label: "Космос",
    desc: "Вселенная внутри. Глубокий космос, пурпурные туманности.",
    colors: ["#050818", "#7c3aed", "#c4b5fd"],
    icon: "🌌",
  },
];

export default function ThemeChoiceScreen({ onChosen }) {
  if (localStorage.getItem("theme_chosen")) { onChosen(localStorage.getItem("theme") || "dark-fantasy"); return null; }

  const choose = (id) => {
    localStorage.setItem("theme_chosen", "1");
    localStorage.setItem("theme", id);
    document.documentElement.setAttribute("data-theme", id);
    onChosen(id);
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9000,
      background:"radial-gradient(ellipse at center, #12082a 0%, #060810 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"24px 16px",
    }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🎨</div>
      <h1 style={{ fontSize:26, fontWeight:900, color:"#f1f5f9", margin:"0 0 6px", textAlign:"center" }}>
        Выбери свою тему
      </h1>
      <p style={{ fontSize:14, color:"rgba(255,255,255,0.4)", margin:"0 0 32px", textAlign:"center" }}>
        Можно изменить позже в настройках
      </p>

      <div style={{ width:"100%", maxWidth:480, display:"flex", flexDirection:"column", gap:14 }}>
        {THEMES.map(t => (
          <button key={t.id} onClick={() => choose(t.id)} style={{
            background:`linear-gradient(135deg, ${t.colors[0]}ee, #0d0e1c)`,
            border:`1px solid ${t.colors[1]}55`,
            borderRadius:18, padding:"16px 20px",
            display:"flex", alignItems:"center", gap:16,
            cursor:"pointer", textAlign:"left", width:"100%",
            transition:"all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.border=`1px solid ${t.colors[1]}cc`; e.currentTarget.style.transform="translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.border=`1px solid ${t.colors[1]}55`; e.currentTarget.style.transform=""; }}>
            {/* Color swatches */}
            <div style={{ flexShrink:0, display:"flex", flexDirection:"column", gap:4 }}>
              {t.colors.map((c, i) => (
                <div key={i} style={{ width:10, height:10, borderRadius:3, background:c }} />
              ))}
            </div>
            <span style={{ fontSize:32, flexShrink:0 }}>{t.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#f1f5f9", marginBottom:3 }}>{t.label}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.4 }}>{t.desc}</div>
            </div>
            <div style={{
              width:36, height:36, borderRadius:"50%",
              background:`${t.colors[1]}22`, border:`2px solid ${t.colors[1]}66`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16, flexShrink:0,
            }}>→</div>
          </button>
        ))}
      </div>
    </div>
  );
}
