import { useState } from "react";

export default function Library({ library }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <section className="quest-section">
      <div className="section-eyebrow">
        <span>📚</span> Моя библиотека
      </div>

      {library.length === 0 ? (
        <p className="empty-state">Здесь появятся купленные чек-листы и программы.</p>
      ) : (
        library.map((item) => (
          <div className="library-item" key={item.id}>
            <div
              className="library-item-header"
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              <span className="quest-title" style={{ margin: 0 }}>
                {item.title}
              </span>
              <span style={{ color: "#64748b", fontSize: 13 }}>
                {expandedId === item.id ? "Свернуть" : "Открыть"}
              </span>
            </div>

            {expandedId === item.id && (
              <div className="library-content">{item.content}</div>
            )}
          </div>
        ))
      )}
    </section>
  );
}