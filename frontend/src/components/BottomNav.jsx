import { useState, useEffect, useRef } from "react";

const ACCENT = "#7c3aed";

const VIEW_TO_TAB = {
  quests:"quests", chains:"quests", marathons:"quests", season:"quests", "legend-path":"quests",
  worldmap:"world", mastery:"world", skills:"world", league:"world", report:"world",
  friends:"social", clan:"social", feed:"social", npc:"social", gratitude:"social", chess:"social",
  profile:"profile", achievements:"profile", stats:"profile", shop:"profile",
  library:"profile", journal:"profile", goals:"profile", pet:"profile", pomodoro:"profile", laptev:"profile", sages:"profile",
};

const TABS = [
  {
    id:"quests", icon:"⚔️", label:"Квесты", home:"quests",
    items:[
      { key:"quests",      icon:"📋", label:"Задания"    },
      { key:"chains",      icon:"🔗", label:"Цепочки"   },
      { key:"marathons",   icon:"🏃", label:"Марафоны"  },
      { key:"season",      icon:"🌸", label:"Сезон"     },
      { key:"legend-path", icon:"👑", label:"Легенда"   },
    ],
  },
  {
    id:"world", icon:"🗺️", label:"Мир", home:"worldmap",
    items:[
      { key:"worldmap", icon:"🗺️", label:"Карта мира"  },
      { key:"mastery",  icon:"🧬", label:"Мастерство"  },
      { key:"skills",   icon:"✨", label:"Навыки"      },
      { key:"league",   icon:"🏆", label:"Лига"        },
      { key:"report",   icon:"📊", label:"Отчёт"       },
    ],
  },
  {
    id:"social", icon:"👥", label:"Социалка", home:"friends",
    items:[
      { key:"friends",   icon:"🤝", label:"Друзья"       },
      { key:"clan",      icon:"⚔️", label:"Клан"         },
      { key:"chess",     icon:"♟️", label:"Шахматы"      },
      { key:"feed",      icon:"📡", label:"Лента"        },
      { key:"npc",       icon:"🧙", label:"Наставники"   },
      { key:"gratitude", icon:"🌿", label:"Благодарность"},
    ],
  },
  {
    id:"profile", icon:"👤", label:"Профиль", home:"profile",
    items:[
      { key:"profile",      icon:"👤", label:"Профиль"     },
      { key:"achievements", icon:"🎖️", label:"Достижения"  },
      { key:"stats",        icon:"📈", label:"Статистика"  },
      { key:"shop",         icon:"🛒", label:"Магазин"     },
      { key:"library",      icon:"📚", label:"Библиотека"  },
      { key:"journal",      icon:"📓", label:"Журнал"      },
      { key:"goals",        icon:"🎯", label:"Цели"        },
      { key:"pet",          icon:"🐣", label:"Питомец"     },
      { key:"pomodoro",     icon:"⏱️", label:"Помодоро"    },
      { key:"laptev",       icon:"👑", label:"Создатель"    },
      { key:"sages",        icon:"🏛️", label:"Мудрецы"     },
    ],
  },
];

export default function BottomNav({ currentView, onNavigate, unreadMessages = 0 }) {
  const activeTab = VIEW_TO_TAB[currentView] || "quests";
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null);
    };
    if (openMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  // Close on view change
  useEffect(() => { setOpenMenu(null); }, [currentView]);

  const handleTabClick = (tab) => {
    if (openMenu === tab.id) {
      setOpenMenu(null);
    } else {
      setOpenMenu(tab.id);
      if (activeTab !== tab.id) onNavigate(tab.home);
    }
  };

  const handleItemClick = (key) => {
    onNavigate(key);
    setOpenMenu(null);
  };

  const openTabData = TABS.find(t => t.id === openMenu);

  return (
    <div ref={menuRef} style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:900 }}>
      {/* Dropdown sheet */}
      {openTabData && (
        <div style={{
          position:"absolute", bottom:"62px", left:0, right:0,
          background:"#0d0b1e",
          borderTop:"1px solid rgba(124,58,237,0.3)",
          boxShadow:"0 -8px 40px rgba(0,0,0,0.7)",
          padding:"10px 12px 8px",
          animation:"slideUp 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <style>{`
            @keyframes slideUp {
              from { opacity:0; transform:translateY(16px); }
              to   { opacity:1; transform:translateY(0); }
            }
          `}</style>
          <div style={{
            display:"grid",
            gridTemplateColumns: openTabData.items.length > 5 ? "repeat(5,1fr)" : `repeat(${openTabData.items.length},1fr)`,
            gap:6,
          }}>
            {openTabData.items.map(item => {
              const isCurrent = currentView === item.key;
              return (
                <button key={item.key} onClick={() => handleItemClick(item.key)} style={{
                  background: isCurrent ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isCurrent ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius:12,
                  padding:"10px 6px 8px",
                  cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:5,
                  color: isCurrent ? "#c4b5fd" : "rgba(255,255,255,0.55)",
                  transition:"all 0.12s",
                  boxShadow: isCurrent ? "0 0 10px rgba(124,58,237,0.3)" : "none",
                }}>
                  <span style={{ fontSize:20, lineHeight:1 }}>{item.icon}</span>
                  <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:0.4, whiteSpace:"nowrap" }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav style={{
        height:62,
        background:"#0a0a12",
        borderTop:"1px solid rgba(124,58,237,0.2)",
        display:"flex",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
        boxShadow:"0 -4px 24px rgba(0,0,0,0.6)",
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const menuOpen = openMenu === tab.id;
          return (
            <button key={tab.id}
              onClick={() => handleTabClick(tab)}
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
              <span style={{ position:"relative", display:"inline-block", lineHeight:1 }}>
                <span style={{
                  fontSize: active ? 24 : 20,
                  transform: active ? "scale(1.15) translateY(-1px)" : "none",
                  transition:"all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                  filter: active ? `drop-shadow(0 0 8px ${ACCENT})` : "none",
                  display:"block",
                }}>
                  {tab.icon}
                </span>
                {tab.id === "social" && unreadMessages > 0 && (
                  <span style={{
                    position:"absolute", top:-4, right:-6,
                    background:"#ef4444", color:"#fff",
                    borderRadius:"50%", width:16, height:16,
                    fontSize:10, fontWeight:700,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    lineHeight:1, pointerEvents:"none",
                  }}>{unreadMessages > 9 ? "9+" : unreadMessages}</span>
                )}
              </span>
              <span style={{ display:"flex", alignItems:"center", gap:2 }}>
                {tab.label}
                <span style={{
                  fontSize:8, opacity: menuOpen ? 1 : 0.5,
                  transform: menuOpen ? "rotate(180deg)" : "none",
                  transition:"transform 0.15s",
                  marginTop:1,
                }}>▲</span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
