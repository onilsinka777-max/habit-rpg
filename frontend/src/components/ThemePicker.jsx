import { useState } from "react";

const THEMES = [
  { id: "dark-fantasy",  label: "Dark Fantasy",  swatch: "#1e1b32", icon: "🧙" },
  { id: "solo-leveling", label: "Solo Leveling",  swatch: "#03060f", icon: "⚔️" },
  { id: "cosmic",        label: "Космос",         swatch: "#050818", icon: "🌌" },
];

export default function ThemePicker({ currentTheme, onChange }) {
  const [open, setOpen] = useState(false);

  const select = (id) => {
    onChange(id);
    document.documentElement.setAttribute("data-theme", id);
    localStorage.setItem("theme", id);
    setOpen(false);
  };

  return (
    <div style={{ position:"relative" }}>
      <button className="theme-btn" onClick={() => setOpen(v => !v)} title="Тема интерфейса">
        🎨
      </button>
      {open && (
        <div className="theme-panel">
          {THEMES.map(t => (
            <button key={t.id}
              className={`theme-option ${currentTheme === t.id ? "active" : ""}`}
              onClick={() => select(t.id)}
              title={t.label}>
              <span className="theme-swatch" style={{ background: t.swatch, border:"1px solid rgba(255,255,255,0.2)" }} />
              <span style={{ fontSize:11 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
