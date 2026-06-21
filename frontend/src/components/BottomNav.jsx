import { useState, useEffect, useRef } from "react";

const NAV_BG = "#0f0f1a";
const NAV_BORDER = "#1e293b";
const ACCENT = "#8d8cf8";

const NAV_WORLD_ITEMS = [
  { key:"quests",     label:"Квесты",   icon:"⚔️"  },
  { key:"chains",     label:"Цепочки",  icon:"⛓️"  },
  { key:"worldmap",   label:"Карта",    icon:"🗺️"  },
  { key:"marathons",  label:"Марафоны", icon:"🏃"  },
  { key:"season",     label:"Сезон",    icon:"🌅"  },
  { key:"league",     label:"Лиги",     icon:"🏆"  },
];

const NAV_SOCIAL_ITEMS = [
  { key:"friends",    label:"Друзья",     icon:"🤝" },
  { key:"clan",       label:"Клан",       icon:"⚔️" },
  { key:"feed",       label:"Лента",      icon:"📡" },
  { key:"npc",        label:"Наставники", icon:"👤" },
  { key:"gratitude",  label:"Благодарн.", icon:"🌿" },
];

const NAV_PROFILE_ITEMS = [
  { key:"profile",      label:"Профиль",    icon:"👤" },
  { key:"shop",         label:"Магазин",    icon:"🛒" },
  { key:"library",      label:"Библиотека", icon:"📚" },
  { key:"skills",       label:"Навыки",     icon:"⚡" },
  { key:"achievements", label:"Ачивки",     icon:"🏅" },
  { key:"mastery",      label:"Мастерство", icon:"🌟" },
  { key:"journal",      label:"Дневник",    icon:"📔" },
  { key:"goals",        label:"Цели",       icon:"🎯" },
  { key:"pet",          label:"Питомец",    icon:"🐾" },
  { key:"stats",        label:"Статистика", icon:"📊" },
  { key:"pomodoro",     label:"Помодоро",   icon:"⏱️" },
  { key:"report",       label:"Отчёт",      icon:"📈" },
  { key:"ai-coach",     label:"AI Коуч",    icon:"🤖" },
  { key:"legend-path",  label:"Легенда",    icon:"🌟" },
];

function BottomSheet({ open, onClose, title, items, currentView, onNavigate }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 10);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end",
      animation: "fadeIn 0.15s ease",
    }}>
      <div ref={ref} style={{
        width: "100%", maxWidth: 480, margin: "0 auto",
        background: "#13142a",
        borderTop: `2px solid ${NAV_BORDER}`,
        borderRadius: "20px 20px 0 0",
        padding: "12px 16px 80px",
        animation: "slideUp 0.2s ease",
        maxHeight: "70vh", overflowY: "auto",
      }}>
        <div style={{ textAlign:"center", marginBottom:12 }}>
          <div style={{ width:40, height:4, background:"rgba(255,255,255,0.2)", borderRadius:2, margin:"0 auto 8px" }} />
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:2, margin:0 }}>{title}</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {items.map(item => (
            <button key={item.key}
              onClick={() => { onNavigate(item.key); onClose(); }}
              style={{
                background: currentView === item.key ? ACCENT : "rgba(255,255,255,0.05)",
                border: `1px solid ${currentView === item.key ? ACCENT : "rgba(255,255,255,0.08)"}`,
                borderRadius: 12,
                padding: "10px 6px",
                display: "flex", flexDirection:"column", alignItems:"center", gap:4,
                cursor:"pointer",
                color: currentView === item.key ? "#0b0e17" : "rgba(255,255,255,0.8)",
                fontSize: 11, fontWeight: 600,
              }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BottomNav({ currentView, onNavigate, userLevel = 1, showToast }) {
  const [openSheet, setOpenSheet] = useState(null);

  const isQuests = currentView === "quests";
  const isWorld  = NAV_WORLD_ITEMS.some(i => i.key === currentView);
  const isSocial = NAV_SOCIAL_ITEMS.some(i => i.key === currentView);
  const isProfile= NAV_PROFILE_ITEMS.some(i => i.key === currentView);

  const TAB_STYLE = (active) => ({
    flex: 1, background:"none", border:"none", cursor:"pointer",
    display:"flex", flexDirection:"column", alignItems:"center", gap:2,
    padding:"8px 0",
    color: active ? ACCENT : "rgba(255,255,255,0.4)",
    fontSize:9, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5,
    position:"relative",
    transition:"color 0.2s",
  });

  const ICON_STYLE = (active) => ({
    fontSize:22,
    filter: active ? `drop-shadow(0 0 6px ${ACCENT})` : "none",
    transform: active ? "translateY(-2px)" : "none",
    transition:"all 0.2s",
  });

  return (
    <>
      <style>{`
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
      `}</style>

      <nav style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:900,
        height:60, background:NAV_BG,
        borderTop:`1px solid ${NAV_BORDER}`,
        display:"flex", alignItems:"center",
        maxWidth:480, margin:"0 auto",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
      }}>
        {/* Home */}
        <button style={TAB_STYLE(isQuests)} onClick={() => { setOpenSheet(null); onNavigate("quests"); }}>
          <span style={ICON_STYLE(isQuests)}>🏠</span>
          Главная
          {isQuests && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:20, height:2, background:ACCENT, borderRadius:1 }} />}
        </button>

        {/* World */}
        <button style={TAB_STYLE(isWorld && !isQuests)} onClick={() => setOpenSheet(v => v === "world" ? null : "world")}>
          <span style={ICON_STYLE(isWorld && !isQuests)}>🗺️</span>
          Мир
          {(isWorld && !isQuests) && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:20, height:2, background:ACCENT, borderRadius:1 }} />}
        </button>

        {/* Social */}
        <button style={TAB_STYLE(isSocial)} onClick={() => setOpenSheet(v => v === "social" ? null : "social")}>
          <span style={ICON_STYLE(isSocial)}>👥</span>
          Социалка
          {isSocial && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:20, height:2, background:ACCENT, borderRadius:1 }} />}
        </button>

        {/* Profile */}
        <button style={TAB_STYLE(isProfile)} onClick={() => setOpenSheet(v => v === "profile" ? null : "profile")}>
          <span style={ICON_STYLE(isProfile)}>👤</span>
          Профиль
          {isProfile && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:20, height:2, background:ACCENT, borderRadius:1 }} />}
        </button>
      </nav>

      <BottomSheet
        open={openSheet === "world"}
        onClose={() => setOpenSheet(null)}
        title="Игровой мир"
        items={NAV_WORLD_ITEMS}
        currentView={currentView}
        onNavigate={onNavigate}
      />
      <BottomSheet
        open={openSheet === "social"}
        onClose={() => setOpenSheet(null)}
        title="Социальное"
        items={NAV_SOCIAL_ITEMS}
        currentView={currentView}
        onNavigate={onNavigate}
      />
      <BottomSheet
        open={openSheet === "profile"}
        onClose={() => setOpenSheet(null)}
        title="Профиль и развитие"
        items={NAV_PROFILE_ITEMS}
        currentView={currentView}
        onNavigate={onNavigate}
      />
    </>
  );
}
