import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const THEMES = [
  { id: "dark-fantasy",  label: "Dark Fantasy",  swatch: "#1e1b32", free: true  },
  { id: "cosmic",        label: "Космос",         swatch: "#050818", free: false, effect: "theme_cosmic"  },
  { id: "solo-leveling", label: "Solo Leveling",  swatch: "#03060f", free: false, effect: "theme_solo"    },
  { id: "forest",        label: "Лес",            swatch: "#0d1a0f", free: false, effect: "theme_forest"  },
];

export default function ThemePicker({ currentTheme, onChange, token }) {
  const [open, setOpen]       = useState(false);
  const [owned, setOwned]     = useState(new Set());

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/shop/library`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const effects = new Set(r.data.map(i => i.effect).filter(Boolean));
        setOwned(effects);
      })
      .catch(() => {});
  }, [token]);

  const select = (theme) => {
    if (!theme.free && !owned.has(theme.effect)) return;
    onChange(theme.id);
    document.documentElement.setAttribute("data-theme", theme.id);
    localStorage.setItem("theme", theme.id);
    setOpen(false);
  };

  return (
    <div style={{ position:"relative" }}>
      <button className="theme-btn" onClick={() => setOpen(v => !v)} title="Тема интерфейса">
        🎨 Тема
      </button>
      {open && (
        <div className="theme-panel">
          {THEMES.map(t => {
            const unlocked = t.free || owned.has(t.effect);
            return (
              <button key={t.id}
                className={`theme-option ${currentTheme === t.id ? "active" : ""}`}
                style={!unlocked ? { opacity:0.5, cursor:"not-allowed" } : undefined}
                onClick={() => unlocked ? select(t) : alert("Купи в магазине за 1000 монет")}
                title={!unlocked ? "Купи в магазине за 1000 монет" : t.label}>
                <span className="theme-swatch" style={{ background: t.swatch, border: "1px solid rgba(255,255,255,0.2)" }} />
                {t.label}
                {!unlocked && <span style={{ fontSize:10, marginLeft:4, opacity:0.7 }}>🔒</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
