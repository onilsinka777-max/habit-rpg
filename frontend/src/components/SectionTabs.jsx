const ACCENT = "#7c3aed";

export default function SectionTabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display:"flex", gap:6, overflowX:"auto", padding:"0 0 2px",
      scrollbarWidth:"none", WebkitOverflowScrolling:"touch",
      marginBottom:14,
    }}>
      <style>{`.section-tabs-wrap::-webkit-scrollbar{display:none}`}</style>
      {tabs.map(tab => {
        const isActive = active === tab.key;
        return (
          <button key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              flexShrink:0,
              background: isActive ? ACCENT : "rgba(255,255,255,0.05)",
              border: `1px solid ${isActive ? ACCENT : "rgba(255,255,255,0.08)"}`,
              borderRadius:20, padding:"6px 14px",
              fontSize:12, fontWeight:700,
              color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
              cursor:"pointer", whiteSpace:"nowrap",
              transition:"all 0.15s",
              boxShadow: isActive ? `0 0 12px ${ACCENT}55` : "none",
            }}>
            {tab.icon && <span style={{ marginRight:4 }}>{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
