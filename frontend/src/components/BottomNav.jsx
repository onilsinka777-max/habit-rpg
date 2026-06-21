import { useState, useRef, useEffect } from "react";

const ACCENT = "#8d8cf8";
const NAV_BG = "#0d0e1c";

// Submenus per tab
const SUBMENUS = {
  quests: {
    title: "Квесты",
    items: [
      { key:"quests",      label:"Все квесты",      icon:"⚔️" },
      { key:"chains",      label:"Цепочки",          icon:"⛓️" },
      { key:"marathons",   label:"Марафоны",         icon:"🏃" },
      { key:"season",      label:"Сезон",            icon:"🌅" },
      { key:"legend-path", label:"Легендарный путь", icon:"👑" },
    ],
  },
  world: {
    title: "Мир",
    items: [
      { key:"worldmap",  label:"Карта мира",     icon:"🗺️" },
      { key:"mastery",   label:"Мастерство",     icon:"🌟" },
      { key:"skills",    label:"Дерево навыков", icon:"⚡" },
      { key:"league",    label:"Лиги",           icon:"🏆" },
      { key:"report",    label:"Статистика",     icon:"📊" },
    ],
  },
  social: {
    title: "Социалка",
    items: [
      { key:"friends",   label:"Друзья",       icon:"🤝" },
      { key:"clan",      label:"Клан",         icon:"⚔️" },
      { key:"feed",      label:"Лента",        icon:"📡" },
      { key:"npc",       label:"Наставники",   icon:"🧙" },
      { key:"gratitude", label:"Благодарность",icon:"🌿" },
    ],
  },
  profile: {
    title: "Профиль",
    items: [
      { key:"profile",      label:"Мой профиль",  icon:"🪪" },
      { key:"achievements", label:"Достижения",   icon:"🏅" },
      { key:"stats",        label:"Статистика",   icon:"📊" },
      { key:"shop",         label:"Магазин",      icon:"🛒" },
      { key:"library",      label:"Библиотека",   icon:"📚" },
      { key:"journal",      label:"Дневник",      icon:"📔" },
      { key:"goals",        label:"Цели",         icon:"🎯" },
      { key:"pet",          label:"Питомец",      icon:"🐾" },
      { key:"pomodoro",     label:"Помодоро",     icon:"⏱️" },
      { key:"ai-coach",     label:"AI Коуч",      icon:"🤖" },
    ],
  },
};

// Which tab does each view belong to?
const VIEW_TO_TAB = {
  quests:"quests", chains:"quests", marathons:"quests", season:"quests", "legend-path":"quests",
  worldmap:"world", mastery:"world", skills:"world", league:"world", report:"world",
  friends:"social", clan:"social", feed:"social", npc:"social", gratitude:"social",
  profile:"profile", achievements:"profile", stats:"profile", shop:"profile",
  library:"profile", journal:"profile", goals:"profile", pet:"profile", pomodoro:"profile", "ai-coach":"profile",
};

// Primary page for each tab
const TAB_HOME = { quests:"quests", world:"worldmap", social:"friends", profile:"profile" };

const TABS = [
  { id:"quests",  icon:"⚔️", label:"Квесты"   },
  { id:"world",   icon:"🗺️", label:"Мир"      },
  { id:"social",  icon:"👥", label:"Социалка" },
  { id:"profile", icon:"👤", label:"Профиль"  },
];

function SubSheet({ tab, open, onClose, currentView, onNavigate }) {
  const ref = useRef(null);
  const sub = SUBMENUS[tab];

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const t = setTimeout(() => document.addEventListener("pointerdown", handler), 50);
    return () => { clearTimeout(t); document.removeEventListener("pointerdown", handler); };
  }, [open, onClose]);

  if (!open || !sub) return null;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:998,
      background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"flex-end",
    }}>
      <div ref={ref} style={{
        width:"100%", maxWidth:520, margin:"0 auto",
        background:"linear-gradient(180deg,#14152e,#0f0f1e)",
        borderTop:`2px solid ${ACCENT}55`,
        borderRadius:"22px 22px 0 0",
        paddingBottom:"max(80px,env(safe-area-inset-bottom,0px))",
        animation:"sheetUp 0.26s cubic-bezier(0.34,1.5,0.64,1)",
        maxHeight:"72vh", overflowY:"auto",
      }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        {/* Handle + title */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"12px 20px 8px" }}>
          <div style={{ width:40, height:4, background:"rgba(255,255,255,0.15)", borderRadius:2, marginBottom:10 }} />
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", margin:0 }}>
            {sub.title}
          </p>
        </div>

        {/* Items list */}
        <div style={{ display:"flex", flexDirection:"column", gap:2, padding:"6px 16px" }}>
          {sub.items.map(item => {
            const active = currentView === item.key;
            return (
              <button key={item.key}
                onClick={() => { onNavigate(item.key); onClose(); }}
                style={{
                  display:"flex", alignItems:"center", gap:14,
                  background: active ? `${ACCENT}18` : "transparent",
                  border: `1px solid ${active ? ACCENT+"44" : "transparent"}`,
                  borderRadius:12, padding:"13px 16px",
                  cursor:"pointer", width:"100%", textAlign:"left",
                  color: active ? ACCENT : "rgba(255,255,255,0.8)",
                  fontSize:15, fontWeight:600,
                  transition:"background 0.15s",
                }}>
                <span style={{ fontSize:22, width:30, textAlign:"center", lineHeight:1 }}>{item.icon}</span>
                <span style={{ flex:1 }}>{item.label}</span>
                {active && <span style={{ fontSize:18, color:ACCENT }}>✓</span>}
                {!active && <span style={{ fontSize:14, color:"rgba(255,255,255,0.2)" }}>›</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function BottomNav({ currentView, onNavigate }) {
  const [openSheet, setOpenSheet] = useState(null);
  const activeTab = VIEW_TO_TAB[currentView] || "quests";

  const handleTabClick = (tabId) => {
    setOpenSheet(null);
    onNavigate(TAB_HOME[tabId]);
  };

  const handleMenu = (e, tabId) => {
    e.stopPropagation();
    setOpenSheet(v => v === tabId ? null : tabId);
  };

  return (
    <>
      <nav style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:900,
        height:65,
        background:NAV_BG,
        borderTop:"1px solid #1a1b30",
        display:"flex",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
        boxShadow:"0 -6px 30px rgba(0,0,0,0.5)",
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <div key={tab.id} style={{
              flex:1, display:"flex", position:"relative",
            }}>
              {/* Active top line */}
              {active && (
                <div style={{
                  position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
                  width:36, height:3, borderRadius:"0 0 3px 3px",
                  background:ACCENT, boxShadow:`0 0 10px ${ACCENT}`,
                }} />
              )}

              {/* Main tab area — navigate on click */}
              <button
                onClick={() => handleTabClick(tab.id)}
                style={{
                  flex:1, background:"none", border:"none", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  gap:3, padding:"6px 0 4px",
                  color: active ? ACCENT : "rgba(255,255,255,0.4)",
                  fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.4,
                  transition:"color 0.15s",
                }}>
                <span style={{
                  fontSize: active ? 25 : 21,
                  transform: active ? "scale(1.15) translateY(-1px)" : "none",
                  transition:"all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                  filter: active ? `drop-shadow(0 0 7px ${ACCENT}99)` : "none",
                  lineHeight:1,
                }}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>

              {/* ≡ Submenu trigger */}
              <button
                onClick={(e) => handleMenu(e, tab.id)}
                style={{
                  position:"absolute", top:6, right:4,
                  background: openSheet === tab.id ? `${ACCENT}22` : "none",
                  border: "none", cursor:"pointer",
                  width:22, height:22, borderRadius:6,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color: openSheet === tab.id ? ACCENT : "rgba(255,255,255,0.2)",
                  fontSize:13, lineHeight:1,
                  transition:"all 0.15s",
                }}>
                ≡
              </button>
            </div>
          );
        })}
      </nav>

      {TABS.map(tab => (
        <SubSheet
          key={tab.id}
          tab={tab.id}
          open={openSheet === tab.id}
          onClose={() => setOpenSheet(null)}
          currentView={currentView}
          onNavigate={onNavigate}
        />
      ))}
    </>
  );
}
