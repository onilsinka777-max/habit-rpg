import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const CATEGORY_LABELS = { boost:"Буст", content:"Контент", cosmetic:"Косметика", xp_card:"Карта XP", craft:"Крафт", workout:"Тренировка", nutrition:"Питание", podcast:"Подкаст", knowledge:"Знания" };
const CATEGORY_ICONS  = { boost:"⚡", content:"📖", cosmetic:"✨", xp_card:"🃏", craft:"⚗️", workout:"💪", nutrition:"🥗", podcast:"🎧", knowledge:"📘" };

const VIEWED_KEY = "library_viewed";
function getViewed() { try { return new Set(JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]")); } catch { return new Set(); } }
function markViewed(id) {
  const s = getViewed(); s.add(String(id));
  localStorage.setItem(VIEWED_KEY, JSON.stringify([...s]));
}

const USABLE_EFFECTS = ["xp_boost_24h","gold_boost_24h","streak_freeze","xp_boost_permanent","gold_boost_permanent","xp_card_small","xp_card_medium","xp_card_large","name_change_scroll"];
const COSMETIC_EFFECTS = { frame_bronze:"avatarFrame", frame_silver:"avatarFrame", frame_gold:"avatarFrame", frame_legendary:"avatarFrame", nick_glow:"nicknameEffect", nick_rainbow:"nicknameEffect", nick_fire:"nicknameEffect" };

function ItemModal({ item, token, onClose, showToast, onApplied }) {
  const [busy, setBusy] = useState(false);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const applyItem = async () => {
    setBusy(true);
    try {
      if (item.effect === "xp_card_small" || item.effect === "xp_card_medium" || item.effect === "xp_card_large") {
        const res = await axios.post(`${API}/shop/use-card/${item.id}`, {}, auth);
        showToast(`+${res.data.xpGained} XP!${res.data.leveledUp ? " Новый уровень!" : ""}`, "success");
      } else if (item.effect && item.effect.startsWith("frame_")) {
        const frameVal = item.effect.replace("frame_", "");
        await axios.patch(`${API}/me/cosmetic`, { avatarFrame: frameVal }, auth);
        showToast("Рамка применена!", "success");
      } else if (item.effect && item.effect.startsWith("nick_")) {
        const effectVal = item.effect.replace("nick_", "");
        await axios.patch(`${API}/me/cosmetic`, { nicknameEffect: effectVal }, auth);
        showToast("Эффект никнейма применён!", "success");
      } else if (item.effect === "xp_boost_24h") {
        await axios.post(`${API}/shop/${item.id}/purchase`, {}, auth).catch(() => {});
        showToast("Буст XP активирован на 24 часа!", "success");
      } else if (item.effect === "streak_freeze") {
        showToast("Заморозка стрика уже на счету — активируется автоматически", "info");
      } else {
        showToast("Предмет уже применён при покупке", "info");
      }
      onApplied?.();
      onClose();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(false); }
  };

  const isCosmetic = item.effect && (item.effect.startsWith("frame_") || item.effect.startsWith("nick_"));
  const canApply = item.effect && (USABLE_EFFECTS.includes(item.effect) || isCosmetic);
  const isContent = !item.effect || ["workout","nutrition","podcast","knowledge"].includes(item.category);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth:440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
          <span style={{ fontSize:36 }}>{CATEGORY_ICONS[item.category] || "📦"}</span>
          <div>
            <p className="modal-eyebrow">{CATEGORY_LABELS[item.category] || item.category}</p>
            <h3 className="modal-title" style={{ margin:0 }}>{item.title}</h3>
          </div>
        </div>

        {item.description && <p className="modal-text">{item.description}</p>}

        {item.content && (
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"12px 14px", marginBottom:14, fontSize:13, color:"rgba(255,255,255,0.75)", whiteSpace:"pre-wrap", lineHeight:1.7, maxHeight:220, overflowY:"auto" }}>
            {item.content}
          </div>
        )}

        {item.effect && (
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:12 }}>
            Эффект: <span style={{ color:"var(--accent,#8d8cf8)" }}>{item.effect}</span>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Закрыть</button>
          {item.contentUrl && (
            <a href={item.contentUrl} target="_blank" rel="noopener noreferrer"
              className="btn btn-primary" style={{ textDecoration:"none" }}>
              📥 Скачать PDF
            </a>
          )}
          {canApply && !isContent && !item.contentUrl && (
            <button className="btn btn-primary" disabled={busy} onClick={applyItem}>
              {busy ? "..." : "Применить"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Library({ library, token, showToast, onProfileRefresh }) {
  const [selected, setSelected] = useState(null);
  const [viewed, setViewed]     = useState(getViewed);

  const open = (item) => {
    markViewed(item.id);
    setViewed(getViewed());
    setSelected(item);
  };

  if (!library || library.length === 0) {
    return (
      <section className="quest-section">
        <div className="section-eyebrow"><span>📚</span> Библиотека</div>
        <p className="empty-state">Здесь будут храниться купленные предметы из магазина.</p>
      </section>
    );
  }

  const byCategory = library.reduce((acc, item) => {
    const k = item.category || "other";
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>📚</span> Библиотека</div>
      <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", margin:"0 0 14px" }}>
        Нажми на предмет чтобы открыть и применить его
      </p>

      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>
            {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat] || cat}
          </div>
          <div className="quest-list">
            {items.map(item => {
              const isNew = !viewed.has(String(item.id));
              return (
                <div key={item.id} className="quest-card" style={{ cursor:"pointer" }} onClick={() => open(item)}>
                  <div className="quest-main">
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:22, flexShrink:0 }}>{CATEGORY_ICONS[item.category] || "📦"}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <h4 className="quest-title" style={{ margin:0 }}>{item.title}</h4>
                          {isNew && (
                            <span style={{ fontSize:10, background:"#eab308", color:"#000", borderRadius:5, padding:"1px 6px", fontWeight:800, flexShrink:0, animation:"gold-pop 0.4s ease" }}>
                              НОВЫЙ
                            </span>
                          )}
                        </div>
                        {item.description && <p style={{ margin:"2px 0 0", fontSize:12, color:"rgba(255,255,255,0.45)" }}>{item.description}</p>}
                      </div>
                      <span style={{ fontSize:18, color:"rgba(255,255,255,0.25)" }}>›</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {selected && (
        <ItemModal
          item={selected}
          token={token}
          onClose={() => setSelected(null)}
          showToast={showToast}
          onApplied={onProfileRefresh}
        />
      )}
    </section>
  );
}
