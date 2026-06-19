const CATEGORY_LABELS = {
  workout: "Тренировки",
  nutrition: "Питание",
  podcast: "Подкасты",
  knowledge: "Знания",
  boost: "Бусты",
};

export default function Shop({ items, gold, loadingId, onPurchase, streakFreezeCount }) {
  if (!items || items.length === 0) {
    return <p className="empty-state">Товары скоро появятся.</p>;
  }

  const grouped = items.reduce((acc, item) => {
    const key = item.category || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <section className="quest-section">
      <div className="section-eyebrow">
        <span>🛒</span> Магазин · у тебя {gold} золота
      </div>

      {Object.entries(grouped).map(([category, categoryItems]) => (
        <div className="category-block" key={category}>
          <p className="category-label">{CATEGORY_LABELS[category] || category}</p>

          <div className="shop-grid">
            {categoryItems.map((item) => {
              const isConsumable = !!item.effect;
              const isLocked = item.locked;

              return (
                <div className={`shop-card ${isLocked ? "shop-card-locked" : ""}`} key={item.id}>
                  <h4 className="shop-card-title">{item.title}</h4>
                  <p className="shop-card-desc">{item.description || ""}</p>

                  <div className="shop-card-footer">
                    {isLocked ? (
                      <span className="shop-locked-badge">🔒 после Мастерства</span>
                    ) : (
                      <>
                        <span className="shop-price">💰 {item.price}</span>

                        {isConsumable && item.repeatable ? (
                          <div className="shop-consumable-controls">
                            {item.effect === "streak_freeze" && (
                              <span className="shop-owned-badge">У тебя: {streakFreezeCount}</span>
                            )}
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={loadingId === item.id || gold < item.price}
                              onClick={() => onPurchase(item)}
                            >
                              {loadingId === item.id ? "..." : "Купить"}
                            </button>
                          </div>
                        ) : item.purchased ? (
                          <span className="shop-owned-badge">Куплено</span>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={loadingId === item.id || gold < item.price}
                            onClick={() => onPurchase(item)}
                          >
                            {loadingId === item.id ? "..." : "Купить"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}