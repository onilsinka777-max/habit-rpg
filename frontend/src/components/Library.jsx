import { useEffect } from "react";

const CATEGORY_LABELS = {
  boost:   "Бустер",
  content: "Контент",
  scroll:  "Свиток",
};

const CATEGORY_ICONS = {
  boost:   "⚡",
  content: "📖",
  scroll:  "📜",
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day:"numeric", month:"long", year:"numeric",
  });
}

export default function Library({ library, onViewed }) {
  useEffect(() => {
    if (onViewed) onViewed();
  }, []);

  if (!library || library.length === 0) {
    return (
      <section className="quest-section">
        <div className="section-eyebrow"><span>📚</span> Библиотека</div>
        <p className="empty-state">
          Здесь будут храниться купленные материалы — чек-листы, подкасты и другие предметы из магазина.
        </p>
      </section>
    );
  }

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>📚</span> Библиотека</div>
      <div className="quest-list">
        {library.map((item, i) => (
          <div key={item.id} className="quest-card">
            <div className="quest-main">
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:20 }}>
                  {CATEGORY_ICONS[item.category] || "📦"}
                </span>
                <h4 className="quest-title" style={{ margin:0 }}>{item.title}</h4>
                {i === 0 && (
                  <span style={{
                    fontSize:10, background:"#eab308", color:"#000",
                    borderRadius:6, padding:"2px 6px", fontWeight:700,
                    flexShrink:0,
                  }}>
                    НОВЫЙ
                  </span>
                )}
              </div>
              {item.description && (
                <p className="goal-desc" style={{ marginBottom:4 }}>{item.description}</p>
              )}
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{
                  fontSize:11, color:"rgba(255,255,255,0.35)",
                  background:"rgba(255,255,255,0.06)",
                  borderRadius:6, padding:"2px 8px",
                }}>
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
                {item.purchasedAt && (
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.25)" }}>
                    {formatDate(item.purchasedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}