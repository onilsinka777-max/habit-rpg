import { useEffect, useState } from "react";

const THEMES = [
  { id: "dark-fantasy",  label: "Dark Fantasy",  swatch: "#1e1b32", free: true,  chainKey: null },
  { id: "solo-leveling", label: "Solo Leveling",  swatch: "#03060f", free: false, chainKey: "solo-leveling", chainName: "Путь Воина",   hint: "Завершите цепочку «Путь Воина» чтобы разблокировать" },
  { id: "cosmic",        label: "Космос",         swatch: "#050818", free: false, chainKey: "cosmic",        chainName: "Путь Атлета",  hint: "Завершите цепочку «Путь Атлета» чтобы разблокировать" },
];

export default function ThemePicker({ currentTheme, onChange, token }) {
  const [open, setOpen] = useState(false);

  const isUnlocked = (theme) => {
    if (theme.free) return true;
    return !!localStorage.getItem(`chain_theme_${theme.chainKey}`);
  };

  const select = (theme) => {
    if (!isUnlocked(theme)) return;
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
            const unlocked = isUnlocked(t);
            return (
              <button key={t.id}
                className={`theme-option ${currentTheme === t.id ? "active" : ""}`}
                style={!unlocked ? { opacity:0.5, cursor:"not-allowed" } : undefined}
                onClick={() => unlocked ? select(t) : alert(t.hint)}
                title={!unlocked ? t.hint : t.label}>
                <span className="theme-swatch" style={{ background: t.swatch, border:"1px solid rgba(255,255,255,0.2)" }} />
                {t.label}
                {!unlocked && <span style={{ fontSize:10, marginLeft:4 }}>🔒</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
