const ACCENT = "#7c3aed";

const VIEW_TO_TAB = {
  quests:"quests", chains:"quests", marathons:"quests", season:"quests", "legend-path":"quests",
  worldmap:"world", mastery:"world", skills:"world", league:"world", report:"world",
  friends:"social", clan:"social", feed:"social", npc:"social", gratitude:"social", chess:"social",
  profile:"profile", achievements:"profile", stats:"profile", shop:"profile",
  library:"profile", journal:"profile", goals:"profile", pet:"profile", pomodoro:"profile", "ai-coach":"profile",
};

const TABS = [
  { id:"quests",  icon:"⚔️", label:"Квесты",   home:"quests"  },
  { id:"world",   icon:"🗺️", label:"Мир",      home:"worldmap"},
  { id:"social",  icon:"👥", label:"Социалка", home:"friends" },
  { id:"profile", icon:"👤", label:"Профиль",  home:"profile" },
];

export default function BottomNav({ currentView, onNavigate }) {
  const activeTab = VIEW_TO_TAB[currentView] || "quests";

  return (
    <nav style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:900,
      height:62,
      background:"#0a0a12",
      borderTop:"1px solid rgba(124,58,237,0.2)",
      display:"flex",
      paddingBottom:"env(safe-area-inset-bottom,0px)",
      boxShadow:"0 -4px 24px rgba(0,0,0,0.6)",
    }}>
      {TABS.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id}
            onClick={() => onNavigate(tab.home)}
            style={{
              flex:1, background:"none", border:"none", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:3, padding:"6px 0",
              color: active ? ACCENT : "rgba(255,255,255,0.35)",
              fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5,
              transition:"color 0.15s",
              position:"relative",
            }}>
            {active && (
              <div style={{
                position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
                width:32, height:3, borderRadius:"0 0 4px 4px",
                background:ACCENT, boxShadow:`0 0 10px ${ACCENT}`,
              }} />
            )}
            <span style={{
              fontSize: active ? 24 : 20,
              transform: active ? "scale(1.15) translateY(-1px)" : "none",
              transition:"all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
              filter: active ? `drop-shadow(0 0 8px ${ACCENT})` : "none",
              lineHeight:1,
            }}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
