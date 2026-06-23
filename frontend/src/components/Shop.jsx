import { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Season "Рассвет" ends 2026-07-31
const SEASON_END = new Date("2026-07-31T23:59:59");

function SeasonalCountdown() {
  const [timeLeft, setTimeLeft] = useState("");
  const rafRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const diff = SEASON_END - Date.now();
      if (diff <= 0) { setTimeLeft("Сезон завершён"); return; }
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${days}д ${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`);
      rafRef.current = setTimeout(tick, 1000);
    };
    tick();
    return () => clearTimeout(rafRef.current);
  }, []);

  return (
    <div style={{
      background:"linear-gradient(135deg,rgba(217,119,6,0.15),rgba(245,182,55,0.08))",
      border:"1px solid rgba(245,182,55,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:16,
      display:"flex", alignItems:"center", justifyContent:"space-between",
    }}>
      <div>
        <div style={{ fontWeight:700, fontSize:13, color:"#f5b637" }}>🌅 Сезон «Рассвет»</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginTop:2 }}>
          Эксклюзивные предметы исчезнут после окончания сезона
        </div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>Осталось</div>
        <div style={{ fontWeight:800, fontSize:15, color:"#f5b637", fontFamily:"monospace" }}>{timeLeft}</div>
      </div>
    </div>
  );
}

const TABS = [
  { key:"boost",    label:"Бусты",      icon:"⚡" },
  { key:"cosmetic", label:"Косметика",  icon:"✨" },
  { key:"xp_card",  label:"Карты XP",   icon:"🃏" },
  { key:"weekly",   label:"Сезонные",   icon:"🌟" },
  { key:"content",  label:"Контент",    icon:"📚" },
];

const CONTENT_CATS = ["workout", "nutrition", "podcast", "knowledge"];

const RARITY_COLORS = { common:"#9ca3af", uncommon:"#34d399", rare:"#38bdf8", epic:"#c084fc", legendary:"#f5b637" };
const RARITY_LABELS = { common:"Обычный", uncommon:"Необычный", rare:"Редкий", epic:"Эпический", legendary:"Легендарный" };
const SLOT_LABELS   = { weapon:"Оружие", armor:"Броня", ring:"Кольцо", amulet:"Амулет" };

function ShopCard({ item, gold, loadingId, onPurchase, streakFreezeCount, onUseCard, onEquip, onUnequip, isArtifact }) {
  const canAfford = gold >= item.price;
  const isLocked  = item.locked;
  const rarity    = item.rarity;

  return (
    <div className="shop-card" style={{
      border: rarity ? `1px solid ${RARITY_COLORS[rarity] || "#fff"}33` : undefined,
      background: rarity === "legendary" ? "linear-gradient(135deg,rgba(245,182,55,0.08),rgba(30,27,50,0.95))" : undefined,
    }}>
      {rarity && (
        <div style={{ fontSize:10, fontWeight:700, color:RARITY_COLORS[rarity], marginBottom:4, letterSpacing:1 }}>
          {item.icon || ""} {RARITY_LABELS[rarity] || rarity}
        </div>
      )}
      <h4 className="shop-card-title">{item.name || item.itemName || item.title}</h4>
      <p className="shop-card-desc">{item.description || ""}</p>
      {item.effect && !isArtifact && <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:3 }}>Эффект: {item.effect}</div>}
      {isArtifact && item.value && <div style={{ fontSize:11, color:"#34d399", marginTop:3 }}>+{Math.round(item.value * 100)}% бонус</div>}

      <div className="shop-card-footer">
        {isLocked ? (
          <span className="shop-locked-badge">🔒 после Мастерства</span>
        ) : (
          <>
            <span className="shop-price">💰 {item.price}</span>
            <div style={{ display:"flex", gap:6 }}>
              {/* Artifact actions */}
              {isArtifact && item.owned && (
                item.equippedSlot ? (
                  <button className="btn btn-sm btn-ghost" onClick={() => onUnequip(item.id)}>Снять</button>
                ) : (
                  <select className="input" style={{ padding:"2px 6px", fontSize:12 }}
                    onChange={e => { if (e.target.value) onEquip(item.id, e.target.value); e.target.value = ""; }}>
                    <option value="">Надеть в слот</option>
                    {Object.entries(SLOT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                )
              )}
              {isArtifact && !item.owned && (
                <button className="btn btn-primary btn-sm" disabled={loadingId === item.id || !canAfford} onClick={() => onPurchase(item)}>
                  {loadingId === item.id ? "..." : !canAfford ? "Мало золота" : "Купить"}
                </button>
              )}
              {!isArtifact && item.effect === "xp_card_small" || item.effect === "xp_card_medium" || item.effect === "xp_card_large" ? (
                item.purchased ? (
                  <button className="btn btn-primary btn-sm" onClick={() => onUseCard(item.id)}>Использовать</button>
                ) : (
                  <button className="btn btn-primary btn-sm" disabled={loadingId === item.id || !canAfford} onClick={() => onPurchase(item)}>
                    {loadingId === item.id ? "..." : !canAfford ? "Мало золота" : "Купить"}
                  </button>
                )
              ) : !isArtifact && (
                item.purchased && !item.repeatable ? (
                  item.effect === "streak_freeze" ? (
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:"#34d399", fontWeight:700 }}>✅ Защита стрика активна</span>
                      <button className="btn btn-sm" disabled style={{ opacity:0.5 }}>Куплено</button>
                    </div>
                  ) : item.effect?.startsWith("pdf_") ? (
                    <div style={{ display:"flex", gap:6 }}>
                      <span className="shop-owned-badge">Куплено</span>
                      <a
                        href={item.contentUrl || "#"}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ textDecoration:"none" }}>
                        📥 Скачать
                      </a>
                    </div>
                  ) : <span className="shop-owned-badge">Куплено</span>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <button className="btn btn-primary btn-sm" disabled={loadingId === item.id || !canAfford} onClick={() => onPurchase(item)}>
                      {loadingId === item.id ? "..." : !canAfford ? "Мало золота" : "Купить"}
                    </button>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
      {isArtifact && item.equippedSlot && (
        <div style={{ fontSize:10, color:"#34d399", marginTop:4 }}>✓ Надето: {SLOT_LABELS[item.equippedSlot]}</div>
      )}
    </div>
  );
}

function CraftTab({ token, showToast, onDone }) {
  const [recipes, setRecipes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(null);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get(`${API}/craft/recipes`, auth)
      .then(r => setRecipes(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const craft = async (id, name) => {
    setBusy(id);
    try {
      const res = await axios.post(`${API}/craft/${id}`, {}, auth);
      showToast(res.data.message, "success");
      onDone();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка крафта", "error"); }
    finally { setBusy(null); }
  };

  if (loading) return <p style={{ opacity:0.5, padding:16 }}>Загрузка рецептов...</p>;

  return (
    <div>
      {recipes.map(r => (
        <div key={r.id} className="craft-recipe" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:14, marginBottom:10 }}>
          <div style={{ fontWeight:700, marginBottom:6 }}>{r.name}</div>
          <div className="craft-ingredients" style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            {r.ingredients.map((ing, i) => (
              <span key={i} style={{ fontSize:12, background:"rgba(255,255,255,0.06)", borderRadius:6, padding:"2px 8px" }}>
                {ing.quantity}x {ing.effect}
              </span>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div className="craft-result" style={{ fontSize:12, color:"#34d399" }}>→ {r.resultName}</div>
            <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => craft(r.id, r.name)}>
              {busy === r.id ? "..." : "Скрафтовать"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeeklyTab({ token, gold, onPurchase, loadingId }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get(`${API}/shop/weekly`, auth)
      .then(r => setItem(r.data.item))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const timeLeft = item ? Math.max(0, Math.ceil((new Date(item.availableTo) - Date.now()) / 86400000)) : 0;

  if (loading) return <p style={{ opacity:0.5, padding:16 }}>Загрузка...</p>;
  if (!item) return <p style={{ opacity:0.5, padding:24, textAlign:"center" }}>Нет сезонных товаров</p>;

  return (
    <div className="weekly-item-card" style={{ background:"linear-gradient(135deg,rgba(245,182,55,0.1),rgba(30,27,50,0.9))", border:"1px solid rgba(245,182,55,0.25)", borderRadius:14, padding:20, textAlign:"center" }}>
      <div style={{ fontSize:48, marginBottom:8 }}>{item.icon}</div>
      <div style={{ fontWeight:800, fontSize:20, color:"#f5b637", marginBottom:4 }}>{item.itemName}</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginBottom:12 }}>{item.description}</div>
      <div className="weekly-countdown" style={{ display:"inline-block", background:"rgba(245,182,55,0.12)", borderRadius:8, padding:"4px 12px", fontSize:12, color:"#f5b637", marginBottom:16 }}>
        ⏳ Осталось {timeLeft} дней
      </div>
      <div style={{ marginBottom:16 }}>
        <span style={{ fontSize:13, fontWeight:700, color:RARITY_COLORS[item.rarity] || "#9ca3af" }}>
          {RARITY_LABELS[item.rarity] || item.rarity}
        </span>
      </div>
      <div style={{ display:"flex", justifyContent:"center", gap:12, alignItems:"center" }}>
        <span className="shop-price">💰 {item.price}</span>
        <button className="btn btn-primary" disabled={gold < item.price || !!loadingId}
          onClick={() => onPurchase({ ...item, id: item.id, title: item.itemName })}>
          {loadingId ? "..." : gold < item.price ? "Мало золота" : "Купить"}
        </button>
      </div>
    </div>
  );
}

export default function Shop({ items, gold, loadingId, onPurchase, streakFreezeCount, token, showToast, onProfileRefresh }) {
  const [tab, setTab]           = useState("boost");
  const [cardBusy, setCardBusy] = useState(null);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const useXpCard = async (itemId) => {
    setCardBusy(itemId);
    try {
      const res = await axios.post(`${API}/shop/use-card/${itemId}`, {}, auth);
      showToast(`+${res.data.xpGained} XP!${res.data.leveledUp ? " Новый уровень!" : ""}`, "success");
      onProfileRefresh?.();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setCardBusy(null); }
  };

  const contentItems = items.filter(i => CONTENT_CATS.includes(i.category));
  const seasonalItems = items.filter(i => i.category === "seasonal");
  const tabItems = tab === "content" ? contentItems
    : tab === "boost"   ? items.filter(i => i.category === "boost")
    : tab === "cosmetic"? items.filter(i => i.category === "cosmetic")
    : tab === "xp_card" ? items.filter(i => i.category === "xp_card")
    : [];

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>🛒</span> Магазин · {gold} золота</div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`btn btn-sm ${tab === t.key ? "btn-primary" : "btn-ghost"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "weekly" && (
        <>
          <SeasonalCountdown />
          {seasonalItems.length > 0 && (
            <>
              <div style={{ fontWeight:700, fontSize:13, color:"rgba(255,255,255,0.6)", marginBottom:10 }}>🌅 Сезонные эксклюзивы</div>
              <div className="shop-grid" style={{ marginBottom:20 }}>
                {seasonalItems.map(item => (
                  <ShopCard key={item.id} item={item} gold={gold}
                    loadingId={cardBusy || loadingId}
                    onPurchase={onPurchase}
                    streakFreezeCount={streakFreezeCount}
                    onUseCard={useXpCard}
                    isArtifact={false} />
                ))}
              </div>
            </>
          )}
          <WeeklyTab token={token} gold={gold} onPurchase={onPurchase} loadingId={loadingId} />
        </>
      )}

      {["boost", "cosmetic", "xp_card", "content"].includes(tab) && (
        <div>
          {tabItems.length === 0 && <p className="empty-state">Нет товаров в этой категории</p>}
          <div className="shop-grid">
            {tabItems.map(item => (
              <ShopCard key={item.id} item={item} gold={gold}
                loadingId={cardBusy || loadingId}
                onPurchase={onPurchase}
                streakFreezeCount={streakFreezeCount}
                onUseCard={useXpCard}
                isArtifact={false} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
