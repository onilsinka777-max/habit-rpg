import { useState, useRef } from "react";
import { startAmbient, isSoundEnabled, setSound } from "../sounds";

const ACCENT = "#7c3aed";

const VIEW_TO_TAB = {
  quests:"quests", chains:"quests", marathons:"quests", season:"quests", "legend-path":"quests",
  "creator-path":"quests", "hall-of-fame":"quests",
  worldmap:"world", mastery:"world", skills:"world", league:"world",
  friends:"social", clan:"social", feed:"social", npc:"social", gratitude:"social",
  chess:"social", discover:"social", player2:"social",
  raid:"raid",
  profile:"profile", achievements:"profile", stats:"profile", shop:"profile",
  library:"profile", journal:"profile", goals:"profile", pet:"profile",
  pomodoro:"profile", report:"profile", laptev:"profile", sages:"profile",
  bonuses:"profile", archive:"profile",
};

const MAIN_TABS = [
  { id:"quests",  icon:"⚔️",  label:"Квесты",   home:"quests"   },
  { id:"world",   icon:"🗺️",  label:"Мир",      home:"worldmap" },
  { id:"raid",    icon:"🏰",  label:"Рейды",    home:"raid"     },
  { id:"social",  icon:"👥",  label:"Социалка", home:"friends"  },
  { id:"profile", icon:"👤",  label:"Профиль",  home:"profile"  },
];

const SHEET_GROUPS = [
  {
    label: "ПРОГРЕСС",
    color: "#a78bfa",
    items: [
      { key:"chains",      icon:"🔗", label:"Цепочки"    },
      { key:"marathons",   icon:"🏃", label:"Марафоны"   },
      { key:"legend-path", icon:"👑", label:"Легенда"    },
      { key:"season",      icon:"🌸", label:"Сезон"      },
      { key:"mastery",     icon:"🧬", label:"Мастерство" },
      { key:"skills",      icon:"✨", label:"Навыки"     },
    ],
  },
  {
    label: "МИР",
    color: "#34d399",
    items: [
      { key:"worldmap",  icon:"🗺️", label:"Карта"       },
      { key:"league",    icon:"🏆", label:"Лига"        },
      { key:"report",    icon:"📊", label:"Отчёт"       },
      { key:"shop",      icon:"🛒", label:"Магазин"     },
      { key:"library",   icon:"📚", label:"Библиотека"  },
      { key:"sages",     icon:"🏛️", label:"Мудрецы"    },
    ],
  },
  {
    label: "ЛИЧНОЕ",
    color: "#60a5fa",
    items: [
      { key:"achievements", icon:"🎖️", label:"Достижения" },
      { key:"stats",        icon:"📈", label:"Статистика" },
      { key:"journal",      icon:"📓", label:"Журнал"     },
      { key:"goals",        icon:"🎯", label:"Цели"       },
      { key:"pet",          icon:"🐣", label:"Питомец"    },
      { key:"pomodoro",     icon:"⏱️", label:"Помодоро"   },
    ],
  },
  {
    label: "ДРУГОЕ",
    color: "#fb923c",
    items: [
      { key:"laptev",    icon:"👑", label:"Создатель"    },
      { key:"gratitude", icon:"🌿", label:"Благодарность"},
      { key:"npc",       icon:"🧙", label:"Наставники"  },
      { key:"feed",      icon:"📡", label:"Лента"        },
      { key:"chess",     icon:"♟️", label:"Шахматы"     },
      { key:"bonuses",   icon:"⚡", label:"Статус"       },
    ],
  },
];

export default function BottomNav({ currentView, onNavigate, unreadMessages = 0 }) {
  const activeTab = VIEW_TO_TAB[currentView] || "quests";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(isSoundEnabled());
  const stopAmbientRef = useRef(null);

  const closeSheet = () => setSheetOpen(false);

  const goTo = (key) => { onNavigate(key); closeSheet(); };

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    setSound(next);
    if (next) { stopAmbientRef.current = startAmbient(); }
    else { stopAmbientRef.current?.(); stopAmbientRef.current = null; }
  };

  return (
    <>
      <style>{`
        @keyframes sheetUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes bdIn { from{opacity:0} to{opacity:1} }
        .sheet-card:active { transform:scale(0.93); }
      `}</style>

      {/* Backdrop */}
      {sheetOpen && (
        <div onClick={closeSheet} style={{
          position:"fixed", inset:0, zIndex:880,
          background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)",
          animation:"bdIn 0.18s ease",
        }} />
      )}

      {/* Bottom Sheet */}
      {sheetOpen && (
        <div style={{
          position:"fixed", bottom:64, left:0, right:0, zIndex:890,
          background:"linear-gradient(180deg,#0e0b1f 0%,#08080f 100%)",
          borderRadius:"24px 24px 0 0",
          borderTop:"1px solid rgba(124,58,237,0.5)",
          boxShadow:"0 -20px 60px rgba(0,0,0,0.9), 0 -1px 0 rgba(124,58,237,0.3)",
          padding:"0 14px 20px",
          maxHeight:"72vh", overflowY:"auto",
          animation:"sheetUp 0.24s cubic-bezier(0.34,1.2,0.64,1)",
          scrollbarWidth:"none",
        }}>
          {/* Handle */}
          <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}>
            <div style={{ width:44, height:4, borderRadius:2, background:"rgba(124,58,237,0.5)" }} />
          </div>

          {/* Music toggle inside sheet */}
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
            <button onClick={toggleMusic} style={{
              background: musicOn ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)",
              border:`1px solid ${musicOn ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.1)"}`,
              borderRadius:20, padding:"5px 12px",
              color: musicOn ? "#c4b5fd" : "rgba(255,255,255,0.4)",
              fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6,
            }}>
              {musicOn ? "🎵" : "🔇"}
              <span>{musicOn ? "Музыка вкл" : "Музыка выкл"}</span>
            </button>
          </div>

          {SHEET_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom:18 }}>
              <div style={{
                fontSize:10, fontWeight:900, color:group.color,
                letterSpacing:2, textTransform:"uppercase",
                marginBottom:8, paddingLeft:2, opacity:0.8,
              }}>{group.label}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                {group.items.map(item => {
                  const active = currentView === item.key;
                  return (
                    <button key={item.key} className="sheet-card"
                      onClick={() => goTo(item.key)}
                      style={{
                        background: active ? `rgba(124,58,237,0.3)` : "rgba(255,255,255,0.04)",
                        border:`1px solid ${active ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.07)"}`,
                        borderRadius:16, padding:"12px 6px 10px",
                        cursor:"pointer", display:"flex", flexDirection:"column",
                        alignItems:"center", gap:6,
                        color: active ? "#e9d5ff" : "rgba(255,255,255,0.6)",
                        transition:"transform 0.1s",
                        boxShadow: active ? "0 0 16px rgba(124,58,237,0.4)" : "none",
                      }}>
                      <span style={{ fontSize:22, lineHeight:1 }}>{item.icon}</span>
                      <span style={{
                        fontSize:9, fontWeight:800, textTransform:"uppercase",
                        letterSpacing:0.6, whiteSpace:"nowrap", lineHeight:1.2,
                        textAlign:"center",
                      }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nav bar */}
      <nav style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:900,
        height:64, background:"#080810",
        borderTop:"1px solid rgba(124,58,237,0.22)",
        display:"flex", alignItems:"stretch",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
        boxShadow:"0 -6px 32px rgba(0,0,0,0.7)",
      }}>
        {MAIN_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id}
              onClick={() => { closeSheet(); onNavigate(tab.home); }}
              style={{
                flex:1, background:"none", border:"none", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:3, padding:"6px 2px",
                color: active ? "#c4b5fd" : "rgba(255,255,255,0.3)",
                fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5,
                transition:"color 0.15s", position:"relative",
              }}>
              {active && (
                <div style={{
                  position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
                  width:32, height:3, borderRadius:"0 0 5px 5px",
                  background:ACCENT, boxShadow:`0 0 12px ${ACCENT}`,
                }} />
              )}
              <span style={{
                fontSize: active ? 23 : 19,
                transform: active ? "scale(1.12) translateY(-2px)" : "none",
                transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                filter: active ? `drop-shadow(0 0 8px ${ACCENT})` : "none",
                display:"block", lineHeight:1, position:"relative",
              }}>
                {tab.icon}
                {tab.id === "social" && unreadMessages > 0 && (
                  <span style={{
                    position:"absolute", top:-5, right:-8,
                    background:"#ef4444", color:"#fff",
                    borderRadius:"50%", width:16, height:16,
                    fontSize:10, fontWeight:800,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    lineHeight:1,
                  }}>{unreadMessages > 9 ? "9+" : unreadMessages}</span>
                )}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* Ещё */}
        <button
          onClick={() => setSheetOpen(prev => !prev)}
          style={{
            flex:1, background:"none", border:"none", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            gap:3, padding:"6px 2px",
            color: sheetOpen ? "#c4b5fd" : "rgba(255,255,255,0.3)",
            fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5,
            transition:"color 0.15s", position:"relative",
          }}>
          {sheetOpen && (
            <div style={{
              position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
              width:32, height:3, borderRadius:"0 0 5px 5px",
              background:ACCENT, boxShadow:`0 0 12px ${ACCENT}`,
            }} />
          )}
          <span style={{
            fontSize: sheetOpen ? 22 : 18,
            transform: sheetOpen ? "scale(1.12) translateY(-2px) rotate(90deg)" : "none",
            transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
            filter: sheetOpen ? `drop-shadow(0 0 8px ${ACCENT})` : "none",
            display:"block", lineHeight:1,
          }}>☰</span>
          <span>Ещё</span>
        </button>
      </nav>
    </>
  );
}
