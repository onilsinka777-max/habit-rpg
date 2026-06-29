import { useState, useEffect, useRef } from "react";
import { startAmbient, isSoundEnabled, setSound } from "../sounds";

const ACCENT = "#7c3aed";

const VIEW_TO_TAB = {
  quests:"quests", chains:"quests", marathons:"quests", season:"quests", "legend-path":"quests",
  worldmap:"world", mastery:"world", skills:"world", league:"world", report:"world", raid:"world",
  friends:"social", clan:"social", feed:"social", npc:"social", gratitude:"social", chess:"social", discover:"social",
  profile:"profile", achievements:"profile", stats:"profile", shop:"profile",
  library:"profile", journal:"profile", goals:"profile", pet:"profile", pomodoro:"profile", laptev:"profile", sages:"profile",
};

const MAIN_TABS = [
  { id:"quests",  icon:"⚔️",  label:"Квесты",   home:"quests"   },
  { id:"world",   icon:"🗺️",  label:"Мир",      home:"worldmap" },
  { id:"social",  icon:"👥",  label:"Социалка", home:"friends"  },
  { id:"profile", icon:"👤",  label:"Профиль",  home:"profile"  },
];

const SHEET_ITEMS = [
  { group:"Квесты",   key:"quests",       icon:"📋", label:"Задания"       },
  { group:"Квесты",   key:"chains",       icon:"🔗", label:"Цепочки"       },
  { group:"Квесты",   key:"marathons",    icon:"🏃", label:"Марафоны"      },
  { group:"Квесты",   key:"season",       icon:"🌸", label:"Сезон"         },
  { group:"Квесты",   key:"legend-path",  icon:"👑", label:"Легенда"       },
  { group:"Мир",      key:"worldmap",     icon:"🗺️", label:"Карта"         },
  { group:"Мир",      key:"raid",         icon:"⚔️", label:"Рейд"          },
  { group:"Мир",      key:"mastery",      icon:"🧬", label:"Мастерство"    },
  { group:"Мир",      key:"skills",       icon:"✨", label:"Навыки"        },
  { group:"Мир",      key:"league",       icon:"🏆", label:"Лига"          },
  { group:"Мир",      key:"report",       icon:"📊", label:"Отчёт"         },
  { group:"Социалка", key:"friends",      icon:"🤝", label:"Друзья"        },
  { group:"Социалка", key:"clan",         icon:"⚔️", label:"Клан"          },
  { group:"Социалка", key:"chess",        icon:"♟️", label:"Шахматы"       },
  { group:"Социалка", key:"discover",     icon:"🌐", label:"Открытие"      },
  { group:"Социалка", key:"feed",         icon:"📡", label:"Лента"         },
  { group:"Социалка", key:"npc",          icon:"🧙", label:"Наставники"    },
  { group:"Социалка", key:"gratitude",    icon:"🌿", label:"Благодарность" },
  { group:"Профиль",  key:"profile",      icon:"👤", label:"Профиль"       },
  { group:"Профиль",  key:"achievements", icon:"🎖️", label:"Достижения"    },
  { group:"Профиль",  key:"stats",        icon:"📈", label:"Статистика"    },
  { group:"Профиль",  key:"shop",         icon:"🛒", label:"Магазин"       },
  { group:"Профиль",  key:"library",      icon:"📚", label:"Библиотека"    },
  { group:"Профиль",  key:"journal",      icon:"📓", label:"Журнал"        },
  { group:"Профиль",  key:"goals",        icon:"🎯", label:"Цели"          },
  { group:"Профиль",  key:"pet",          icon:"🐣", label:"Питомец"       },
  { group:"Профиль",  key:"pomodoro",     icon:"⏱️", label:"Помодоро"      },
  { group:"Профиль",  key:"laptev",       icon:"🤖", label:"Создатель"     },
  { group:"Профиль",  key:"sages",        icon:"🏛️", label:"Мудрецы"       },
];

const GROUPS = ["Квесты", "Мир", "Социалка", "Профиль"];

export default function BottomNav({ currentView, onNavigate, unreadMessages = 0 }) {
  const activeTab = VIEW_TO_TAB[currentView] || "quests";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(isSoundEnabled());
  const stopAmbientRef = useRef(null);

  useEffect(() => { setSheetOpen(false); }, [currentView]);

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    setSound(next);
    if (next) {
      stopAmbientRef.current = startAmbient();
    } else {
      stopAmbientRef.current?.();
      stopAmbientRef.current = null;
    }
  };

  return (
    <>
      <style>{`
        @keyframes sheetSlideUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes bdFadeIn {
          from { opacity:0; } to { opacity:1; }
        }
      `}</style>

      {/* Backdrop */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{
            position:"fixed", inset:0, zIndex:880,
            background:"rgba(0,0,0,0.65)",
            backdropFilter:"blur(3px)",
            animation:"bdFadeIn 0.2s ease",
          }}
        />
      )}

      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:900 }}>

        {/* ── Bottom sheet ── */}
        {sheetOpen && (
          <div style={{
            position:"absolute", bottom:"62px", left:0, right:0,
            background:"linear-gradient(180deg,#0f0c22 0%,#0a0a14 100%)",
            borderRadius:"22px 22px 0 0",
            borderTop:"1px solid rgba(124,58,237,0.4)",
            boxShadow:"0 -16px 60px rgba(0,0,0,0.85)",
            padding:"0 12px 16px",
            maxHeight:"64vh",
            overflowY:"auto",
            animation:"sheetSlideUp 0.22s cubic-bezier(0.34,1.2,0.64,1)",
            scrollbarWidth:"thin",
            scrollbarColor:"rgba(124,58,237,0.3) transparent",
          }}>
            {/* Handle bar */}
            <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 6px" }}>
              <div style={{ width:40, height:4, borderRadius:2, background:"rgba(124,58,237,0.45)" }} />
            </div>

            {GROUPS.map(group => {
              const items = SHEET_ITEMS.filter(i => i.group === group);
              return (
                <div key={group} style={{ marginBottom:14 }}>
                  <div style={{
                    fontSize:10, fontWeight:800, color:"rgba(124,58,237,0.55)",
                    letterSpacing:1.4, textTransform:"uppercase",
                    marginBottom:7, paddingLeft:2,
                  }}>{group}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7 }}>
                    {items.map(item => {
                      const active = currentView === item.key;
                      return (
                        <button key={item.key}
                          onClick={() => { onNavigate(item.key); setSheetOpen(false); }}
                          style={{
                            background: active ? "rgba(124,58,237,0.28)" : "rgba(255,255,255,0.04)",
                            border:`1px solid ${active ? "rgba(124,58,237,0.55)" : "rgba(255,255,255,0.07)"}`,
                            borderRadius:14, padding:"11px 6px 9px",
                            cursor:"pointer", display:"flex", flexDirection:"column",
                            alignItems:"center", gap:5,
                            color: active ? "#c4b5fd" : "rgba(255,255,255,0.58)",
                            transition:"all 0.12s",
                            boxShadow: active ? "0 0 14px rgba(124,58,237,0.35)" : "none",
                          }}>
                          <span style={{ fontSize:21, lineHeight:1 }}>{item.icon}</span>
                          <span style={{
                            fontSize:9, fontWeight:700, textTransform:"uppercase",
                            letterSpacing:0.5, whiteSpace:"nowrap",
                          }}>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Nav bar ── */}
        <nav style={{
          height:62,
          background:"#0a0a12",
          borderTop:"1px solid rgba(124,58,237,0.2)",
          display:"flex",
          paddingBottom:"env(safe-area-inset-bottom,0px)",
          boxShadow:"0 -4px 28px rgba(0,0,0,0.65)",
          position:"relative",
        }}>
          {/* Music toggle — floating pill above nav */}
          <button
            onClick={toggleMusic}
            style={{
              position:"absolute", top:-18, right:10,
              width:34, height:34, borderRadius:"50%",
              background: musicOn ? "rgba(124,58,237,0.35)" : "rgba(20,18,40,0.9)",
              border:`1px solid ${musicOn ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.12)"}`,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:15, zIndex:10,
              boxShadow: musicOn ? "0 0 16px rgba(124,58,237,0.55)" : "0 2px 8px rgba(0,0,0,0.5)",
              transition:"all 0.2s",
            }}
            title={musicOn ? "Выключить музыку" : "Включить музыку"}
          >
            {musicOn ? "🎵" : "🔇"}
          </button>

          {/* 4 main tabs */}
          {MAIN_TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id}
                onClick={() => { setSheetOpen(false); onNavigate(tab.home); }}
                style={{
                  flex:1, background:"none", border:"none", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  gap:3, padding:"6px 0",
                  color: active ? ACCENT : "rgba(255,255,255,0.33)",
                  fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5,
                  transition:"color 0.15s", position:"relative",
                }}>
                {active && (
                  <div style={{
                    position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
                    width:30, height:3, borderRadius:"0 0 4px 4px",
                    background:ACCENT, boxShadow:`0 0 10px ${ACCENT}`,
                  }} />
                )}
                <span style={{
                  fontSize: active ? 24 : 20,
                  transform: active ? "scale(1.15) translateY(-1px)" : "none",
                  transition:"all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                  filter: active ? `drop-shadow(0 0 8px ${ACCENT})` : "none",
                  display:"block", lineHeight:1, position:"relative",
                }}>
                  {tab.icon}
                  {tab.id === "social" && unreadMessages > 0 && (
                    <span style={{
                      position:"absolute", top:-4, right:-7,
                      background:"#ef4444", color:"#fff",
                      borderRadius:"50%", width:16, height:16,
                      fontSize:10, fontWeight:700,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      lineHeight:1, pointerEvents:"none",
                    }}>{unreadMessages > 9 ? "9+" : unreadMessages}</span>
                  )}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* Ещё button */}
          <button
            onClick={() => setSheetOpen(prev => !prev)}
            style={{
              flex:1, background:"none", border:"none", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:3, padding:"6px 0",
              color: sheetOpen ? ACCENT : "rgba(255,255,255,0.33)",
              fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5,
              transition:"color 0.15s", position:"relative",
            }}>
            {sheetOpen && (
              <div style={{
                position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
                width:30, height:3, borderRadius:"0 0 4px 4px",
                background:ACCENT, boxShadow:`0 0 10px ${ACCENT}`,
              }} />
            )}
            <span style={{
              fontSize: sheetOpen ? 24 : 20,
              transform: sheetOpen ? "scale(1.15) translateY(-1px)" : "none",
              transition:"all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
              filter: sheetOpen ? `drop-shadow(0 0 8px ${ACCENT})` : "none",
              display:"block", lineHeight:1,
            }}>☰</span>
            <span>Ещё</span>
          </button>
        </nav>
      </div>
    </>
  );
}
