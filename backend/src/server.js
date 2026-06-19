import { useEffect, useState } from "react";
import axios from "axios";
import PlayerCard from "./components/PlayerCard";
import Shop from "./components/Shop";
import Library from "./components/Library";
import Clan from "./components/Clan";
import Friends from "./components/Friends";
import Rules from "./components/Rules";
import Mastery from "./components/Mastery";
import Journal from "./components/Journal";
import Goals from "./components/Goals";
import NicknameModal from "./components/NicknameModal";
import ToastContainer from "./components/Toast";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BRANCHES = [
  { key:"discipline",       label:"Дисциплина",  icon:"🛡️", accent:"#8d8cf8", glow:"rgba(141,140,248,0.35)" },
  { key:"fitness",          label:"Фитнес",       icon:"💪", accent:"#fb7878", glow:"rgba(251,120,120,0.35)" },
  { key:"self_development", label:"Саморазвитие", icon:"🌱", accent:"#34d399", glow:"rgba(52,211,153,0.35)"  },
  { key:"knowledge",        label:"Знания",       icon:"📘", accent:"#38bdf8", glow:"rgba(56,189,248,0.35)"  },
];

const CUSTOM_BRANCH = { key:"custom", label:"Свои", icon:"✏️", accent:"#a78bfa", glow:"rgba(167,139,250,0.35)" };
const TAB_BRANCHES  = [...BRANCHES, CUSTOM_BRANCH];

const MASTERY_UNLOCK_LEVEL = 25;
const CLAN_UNLOCK_LEVEL    = 10;

const SHOP_THEME       = { accent:"#f5b637", glow:"rgba(245,182,55,0.35)"  };
const LIBRARY_THEME    = { accent:"#22d3ee", glow:"rgba(34,211,238,0.35)"  };
const CLAN_THEME       = { accent:"#fb923c", glow:"rgba(251,146,60,0.35)"  };
const FRIENDS_THEME    = { accent:"#f472b6", glow:"rgba(244,114,182,0.35)" };
const MASTERY_THEME    = { accent:"#c084fc", glow:"rgba(192,132,252,0.35)" };
const JOURNAL_THEME    = { accent:"#a78bfa", glow:"rgba(167,139,250,0.35)" };
const GOALS_THEME      = { accent:"#34d399", glow:"rgba(52,211,153,0.35)"  };
const QUESTS_NAV_THEME = { accent:"#8d8cf8", glow:"rgba(141,140,248,0.35)" };

const TYPE_META = {
  required:    { label:"Обязательные",    icon:"🔒" },
  recommended: { label:"Рекомендованные", icon:"⭐" },
};

const DIFFICULTIES = [
  { key:"easy",   label:"Простой", color:"#4ade80" },
  { key:"medium", label:"Средний", color:"#fbbf24" },
  { key:"hard",   label:"Сложный", color:"#f87171" },
];

function getDifficultyMeta(key) {
  return DIFFICULTIES.find(d => d.key === key) || DIFFICULTIES[0];
}

export default function App() {
  const [token,    setToken]    = useState(localStorage.getItem("token") || "");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  const [user,  setUser]  = useState(null);
  const [tasks, setTasks] = useState([]);
  const [customQuestsCreatedToday, setCustomQuestsCreatedToday] = useState(0);
  const [customQuestsMax,          setCustomQuestsMax]          = useState(8);

  const [view,         setView]         = useState("quests");
  const [navOpen,      setNavOpen]      = useState(false);
  const [rulesOpen,    setRulesOpen]    = useState(false);
  const [activeBranch, setActiveBranch] = useState("discipline");

  const [newTaskTitle,      setNewTaskTitle]      = useState("");
  const [newTaskDifficulty, setNewTaskDifficulty] = useState("easy");
  const [newTaskBranch,     setNewTaskBranch]     = useState("discipline");

  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [shopItems,     setShopItems]     = useState([]);
  const [library,       setLibrary]       = useState([]);
  const [shopLoadingId, setShopLoadingId] = useState(null);
  const [newLibCount,   setNewLibCount]   = useState(0);

  const [toasts,            setToasts]            = useState([]);
  const [confirmDialog,     setConfirmDialog]      = useState(null);
  const [levelUpInfo,       setLevelUpInfo]        = useState(null);
  const [streakModal,       setStreakModal]         = useState(null);
  const [chestModal,        setChestModal]          = useState(null);
  const [showNicknameModal, setShowNicknameModal]  = useState(false);
  const [showScrollModal,   setShowScrollModal]    = useState(false);
  const [scrollName,        setScrollName]         = useState("");
  const [scrollError,       setScrollError]        = useState("");
  const [scrollBusy,        setScrollBusy]         = useState(false);

  const NAV_ITEMS = [
    { key:"quests",  label:"Квесты",     icon:"🗺️", theme:QUESTS_NAV_THEME },
    { key:"shop",    label:"Магазин",    icon:"🛒", theme:SHOP_THEME   },
    { key:"library", label:"Библиотека", icon:"📚", theme:LIBRARY_THEME, badge:newLibCount },
    { key:"friends", label:"Друзья",     icon:"🤝", theme:FRIENDS_THEME },
    { key:"journal", label:"Дневник",    icon:"📔", theme:JOURNAL_THEME },
    { key:"goals",   label:"Цели",       icon:"🎯", theme:GOALS_THEME   },
    { key:"clan",    label:"Клан",       icon:"⚔️", theme:CLAN_THEME,
      lockLevel:CLAN_UNLOCK_LEVEL, lockMessage:"Кланы доступны с 10 уровня" },
    { key:"mastery", label:"Мастерство", icon:"🌟", theme:MASTERY_THEME,
      lockLevel:MASTERY_UNLOCK_LEVEL, lockMessage:"Ветка развития доступна с 25 уровня" },
  ];

  const currentNavItem = NAV_ITEMS.find(n => n.key === view);
  const branchTheme    = TAB_BRANCHES.find(b => b.key === activeBranch) || BRANCHES[0];
  const effectiveTheme = view === "quests" ? branchTheme : (currentNavItem?.theme || QUESTS_NAV_THEME);
  const authHeaders    = { headers: { Authorization: `Bearer ${token}` } };

  const showToast = (message, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  const dismissToast = (id) => setToasts(t => t.filter(x => x.id !== id));

  const askConfirm = ({ title, text, confirmLabel = "Подтвердить", onConfirm }) => {
    setConfirmDialog({ title, text, confirmLabel, onConfirm });
  };

  const loadProfile = async () => {
    try {
      const res = await axios.get(`${API}/me`, authHeaders);
      setUser(res.data);
      if (!res.data.nameSet) setShowNicknameModal(true);
      if (res.data.dailyBonusJustClaimed) {
        showToast(`С возвращением! +${res.data.dailyBonusGold} золота, +${res.data.dailyBonusXp} опыта`, "success");
      }
    } catch (e) { console.error(e); }
  };

  const loadTasks = async () => {
    try {
      const res = await axios.get(`${API}/tasks`, authHeaders);
      if (res.data.tasks) {
        setTasks(res.data.tasks);
        setCustomQuestsCreatedToday(res.data.customQuestsCreatedToday || 0);
        setCustomQuestsMax(res.data.customQuestsMax || 8);
      } else {
        setTasks(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e) { console.error(e); }
  };

  const loadShop = async () => {
    try {
      const res = await axios.get(`${API}/shop`, authHeaders);
      setShopItems(res.data);
    } catch (e) { console.error(e); }
  };

  const loadLibrary = async () => {
    try {
      const res = await axios.get(`${API}/shop/library`, authHeaders);
      setLibrary(res.data);
    } catch (e) { console.error(e); }
  };

  const register = async () => {
    try {
      await axios.post(`${API}/auth/register`, { email, password });
      showToast("Аккаунт создан, теперь войди", "success");
    } catch (e) { showToast(e.response?.data?.message || "Ошибка регистрации", "error"); }
  };

  const login = async () => {
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
    } catch (e) { showToast(e.response?.data?.message || "Ошибка входа", "error"); }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(""); setUser(null); setTasks([]);
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await axios.post(`${API}/tasks`,
        { title: newTaskTitle, branch: newTaskBranch, difficulty: newTaskDifficulty },
        authHeaders
      );
      setNewTaskTitle(""); setNewTaskDifficulty("easy");
      if (res.data.customQuestsCreatedToday !== undefined) {
        setCustomQuestsCreatedToday(res.data.customQuestsCreatedToday);
      }
      await loadTasks();
    } catch (e) { showToast(e.response?.data?.message || "Не удалось создать квест", "error"); }
  };

  const confirmComplete = (task) => {
    if (loadingTaskId === task.id) return;
    askConfirm({
      title: "Выполнить квест?",
      text: `«${task.title}» — +${task.xpReward} XP · +${task.goldReward} золота`,
      confirmLabel: "Выполнить",
      onConfirm: () => completeTask(task.id),
    });
  };

  const completeTask = async (id) => {
    try {
      setLoadingTaskId(id);
      const prevLevel = user?.level || 1;
      const completeRes = await axios.patch(`${API}/tasks/${id}/complete`, {}, authHeaders);
      await loadTasks();

      if (completeRes.data.freezeConsumed) {
        showToast("Заморозка стрика сработала — серия не сброшена!", "success");
      }
      if (completeRes.data.streakJustCompleted) {
        setStreakModal({ streak: completeRes.data.newStreak });
      }
      if (completeRes.data.chestReward) {
        setChestModal(completeRes.data.chestReward);
      }

      const res = await axios.get(`${API}/me`, authHeaders);
      setUser(res.data);

      if (res.data.level > prevLevel) {
        const newLevel = res.data.level;
        let unlock = null;
        if (newLevel >= CLAN_UNLOCK_LEVEL    && prevLevel < CLAN_UNLOCK_LEVEL)    unlock = "⚔️ Кланы разблокированы!";
        if (newLevel >= MASTERY_UNLOCK_LEVEL && prevLevel < MASTERY_UNLOCK_LEVEL) unlock = "🌟 Ветка Мастерства разблокирована!";
        setLevelUpInfo({ level: newLevel, unlock });
      }
    } catch (e) {
      showToast(e.response?.data?.message || "Ошибка выполнения", "error");
    } finally { setLoadingTaskId(null); }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`${API}/tasks/${id}`, authHeaders);
      await loadTasks();
    } catch (e) { showToast(e.response?.data?.message || "Не удалось удалить", "error"); }
  };

  const purchaseItem = async (item) => {
    try {
      setShopLoadingId(item.id);
      await axios.post(`${API}/shop/${item.id}/purchase`, {}, authHeaders);
      await loadShop();
      await loadLibrary();
      await loadProfile();
      setNewLibCount(n => n + 1);
      showToast(`«${item.title}» добавлено в библиотеку 📚`, "success");
    } catch (e) { showToast(e.response?.data?.message || "Не удалось купить", "error"); }
    finally { setShopLoadingId(null); }
  };

  useEffect(() => {
    if (token) { loadProfile(); loadTasks(); }
  }, [token]);

  useEffect(() => {
    if (token && (view === "shop" || view === "library")) { loadShop(); loadLibrary(); }
  }, [token, view]);

  const branchTasks    = tasks.filter(t => t.branch === activeBranch && (t.type === "required" || t.type === "recommended"));
  const legendaryTasks = tasks.filter(t => t.type === "legendary" && !t.completed);
  const customTasks    = tasks.filter(t => t.type === "custom");
  const tasksByType    = {
    required:    branchTasks.filter(t => t.type === "required"),
    recommended: branchTasks.filter(t => t.type === "recommended"),
  };
  const customSlotsLeft = Math.max(0, customQuestsMax - customQuestsCreatedToday);
  const rootStyle = { "--accent": effectiveTheme.accent, "--accent-glow": effectiveTheme.glow };

  if (!token) {
    return (
      <div className="auth-screen" style={{ "--accent": QUESTS_NAV_THEME.accent, "--accent-glow": QUESTS_NAV_THEME.glow }}>
        <div className="auth-card">
          <p className="auth-eyebrow">Геймификация жизни</p>
          <h1 className="brand-title">Habit RPG</h1>
          <p className="auth-sub">Твой путь начинается здесь</p>
          <label className="field-label">Почта</label>
          <input className="input" placeholder="you@mail.com" value={email} onChange={e => setEmail(e.target.value)} />
          <label className="field-label">Пароль</label>
          <input className="input" placeholder="••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <div className="auth-actions">
            <button className="btn btn-ghost" onClick={register}>Создать аккаунт</button>
            <button className="btn btn-primary" onClick={login}>Войти</button>
          </div>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="app-shell" style={rootStyle}>
      <div className="app-container">

        <header className="topbar">
          <div className="nav-dropdown-wrapper">
            <button className="nav-toggle-btn" onClick={() => setNavOpen(v => !v)}
              style={{ background: effectiveTheme.accent, boxShadow: `0 8px 20px ${effectiveTheme.glow}` }}>
              {navOpen ? "✕" : "☰"}
            </button>

            {navOpen && (
              <div className="nav-dropdown-menu">
                {NAV_ITEMS.map(item => {
                  const myLevel = user?.level || 1;
                  const locked  = item.lockLevel && myLevel < item.lockLevel;
                  const isActive = view === item.key;
                  return (
                    <button key={item.key}
                      className={`nav-dropdown-item ${isActive && !locked ? "active" : ""} ${locked ? "locked" : ""}`}
                      style={isActive && !locked ? { background: item.theme.accent } : undefined}
                      onClick={() => {
                        if (locked) { showToast(item.lockMessage, "error"); return; }
                        setView(item.key);
                        setNavOpen(false);
                        if (item.key === "library") setNewLibCount(0);
                      }}>
                      <span style={{ position:"relative" }}>
                        {locked ? "🔒" : item.icon}
                        {item.badge > 0 && (
                          <span style={{ position:"absolute", top:-4, right:-6, background:"#eab308", borderRadius:"50%", width:14, height:14, fontSize:9, display:"inline-flex", alignItems:"center", justifyContent:"center", color:"#000", fontWeight:"bold" }}>
                            {item.badge}
                          </span>
                        )}
                      </span>
                      {" "}{item.label}
                      {item.badge > 0 && (
                        <span style={{ marginLeft:"auto", background:"#eab308", color:"#000", borderRadius:8, padding:"1px 6px", fontSize:11, fontWeight:700 }}>
                          {item.badge} новых
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="topbar-eyebrow">Геймификация жизни</p>
            <h1 className="brand-title">Habit RPG</h1>
          </div>

          <button className="rules-btn" onClick={() => setRulesOpen(true)}>?</button>
        </header>

        {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}

        {user && (
          <PlayerCard
            user={user}
            onLogout={logout}
            onOpenScroll={() => setShowScrollModal(true)}
            onGoToShop={() => { setView("shop"); }}
          />
        )}

        {view === "shop"    && <Shop items={shopItems} gold={user?.gold || 0} loadingId={shopLoadingId} onPurchase={purchaseItem} streakFreezeCount={user?.streakFreezeCount || 0} />}
        {view === "library" && <Library library={library} onViewed={() => setNewLibCount(0)} />}
        {view === "clan"    && <Clan token={token} showToast={showToast} askConfirm={askConfirm} currentUserId={user?.id} myLevel={user?.level || 1} />}
        {view === "friends" && <Friends token={token} showToast={showToast} askConfirm={askConfirm} />}
        {view === "mastery" && <Mastery token={token} showToast={showToast} askConfirm={askConfirm} myLevel={user?.level || 1} onFinished={loadProfile} />}
        {view === "journal" && <Journal token={token} showToast={showToast} />}
        {view === "goals"   && <Goals   token={token} showToast={showToast} askConfirm={askConfirm} />}

        {view === "quests" && (
          <>
            {legendaryTasks.length > 0 && (
              <section className="legendary-section">
                <div className="section-eyebrow"><span>🏆</span> Легендарный квест недели</div>
                {legendaryTasks.map(t => (
                  <QuestCard key={t.id} task={t} loading={loadingTaskId === t.id}
                    onComplete={() => confirmComplete(t)} onDelete={() => {}} showDelete={false} />
                ))}
              </section>
            )}

            <nav className="branch-tabs">
              {TAB_BRANCHES.map(b => (
                <button key={b.key}
                  className={`branch-tab ${activeBranch === b.key ? "active" : ""}`}
                  style={activeBranch === b.key ? { background: b.accent, boxShadow: `0 8px 20px ${b.glow}` } : undefined}
                  onClick={() => setActiveBranch(b.key)}>
                  <span className="branch-icon">{b.icon}</span>{b.label}
                </button>
              ))}
            </nav>

            <div className="branch-content" key={activeBranch}>
              {activeBranch === "custom" ? (
                <section className="quest-section">
                  <div className="section-eyebrow"><span>✏️</span> Свои квесты</div>
                  <p className="quest-limit-note">
                    {customSlotsLeft > 0
                      ? `Осталось ${customSlotsLeft} из ${customQuestsMax} квестов на сегодня`
                      : "Лимит на сегодня исчерпан — новые слоты появятся завтра"}
                  </p>
                  <div className="new-quest-form" style={{ flexWrap:"wrap" }}>
                    <select className="select" value={newTaskBranch} onChange={e => setNewTaskBranch(e.target.value)} disabled={customSlotsLeft === 0}>
                      {BRANCHES.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
                    </select>
                    <input className="input" placeholder="Название квеста"
                      value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                      disabled={customSlotsLeft === 0} />
                    <select className="select" value={newTaskDifficulty} onChange={e => setNewTaskDifficulty(e.target.value)} disabled={customSlotsLeft === 0}>
                      {DIFFICULTIES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={createTask} disabled={customSlotsLeft === 0}>
                      Добавить
                    </button>
                  </div>
                  {customTasks.length === 0 ? (
                    <p className="empty-state">Нет своих квестов — добавь первый выше.</p>
                  ) : (
                    <div className="quest-list">
                      {customTasks.map(t => (
                        <QuestCard key={t.id} task={t} loading={loadingTaskId === t.id}
                          onComplete={() => confirmComplete(t)}
                          onDelete={() => askConfirm({
                            title:"Удалить квест?", text:"Слот не вернётся.",
                            confirmLabel:"Удалить", onConfirm:() => deleteTask(t.id),
                          })}
                          showDelete={!t.completed} />
                      ))}
                    </div>
                  )}
                </section>
              ) : (
                <>
                  {["required","recommended"].map(type => (
                    <section className="quest-section" key={type}>
                      <div className="section-eyebrow">
                        <span>{TYPE_META[type].icon}</span>{TYPE_META[type].label}
                      </div>
                      {tasksByType[type].length === 0 ? (
                        <p className="empty-state">Квесты обновятся в начале нового дня.</p>
                      ) : (
                        <div className="quest-list">
                          {tasksByType[type].map(t => (
                            <QuestCard key={t.id} task={t} loading={loadingTaskId === t.id}
                              onComplete={() => confirmComplete(t)}
                              onDelete={() => deleteTask(t.id)} showDelete={false} />
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}

      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <p className="modal-eyebrow">Подтверждение</p>
            <h3 className="modal-title">{confirmDialog.title}</h3>
            <p className="modal-text">{confirmDialog.text}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDialog(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={() => {
                const fn = confirmDialog.onConfirm;
                setConfirmDialog(null);
                fn();
              }}>{confirmDialog.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      {levelUpInfo && (
        <div className="modal-overlay" onClick={() => setLevelUpInfo(null)}>
          <div className="modal-card level-up-card" onClick={e => e.stopPropagation()}>
            <div className="level-up-badge">{levelUpInfo.level}</div>
            <p className="modal-eyebrow">Новый уровень</p>
            <h3 className="modal-title">Уровень повышен!</h3>
            <p className="modal-text">Ты прокачался до {levelUpInfo.level} уровня. Продолжай в том же духе.</p>
            {levelUpInfo.unlock && <div className="level-up-unlock">{levelUpInfo.unlock}</div>}
            <button className="btn btn-primary" onClick={() => setLevelUpInfo(null)}>Отлично</button>
          </div>
        </div>
      )}

      {streakModal && (
        <div className="modal-overlay" onClick={() => setStreakModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:42, textAlign:"center", marginBottom:8 }}>🔥</div>
            <p className="modal-eyebrow">Серия</p>
            <h3 className="modal-title">Все обязательные квесты выполнены!</h3>
            <p className="modal-text">
              Серия: {streakModal.streak} {streakModal.streak === 1 ? "день" : streakModal.streak < 5 ? "дня" : "дней"} подряд. Так держать!
            </p>
            <button className="btn btn-primary" onClick={() => setStreakModal(null)}>Огонь 🔥</button>
          </div>
        </div>
      )}

      {chestModal && (
        <div className="modal-overlay" onClick={() => setChestModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:56, textAlign:"center", marginBottom:8 }}>{chestModal.icon}</div>
            <p className="modal-eyebrow">Награда за серию</p>
            <h3 className="modal-title">{chestModal.name}!</h3>
            <p className="modal-text">
              Серия {chestModal.threshold} дней подряд — ты заслужил это!
            </p>
            <div style={{ display:"flex", gap:16, justifyContent:"center", margin:"12px 0" }}>
              {chestModal.gold > 0 && (
                <span style={{ fontSize:18, fontWeight:700, color:"#fcd34d" }}>💰 +{chestModal.gold}</span>
              )}
              {chestModal.xp > 0 && (
                <span style={{ fontSize:18, fontWeight:700, color:"#818cf8" }}>⚡ +{chestModal.xp} XP</span>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => setChestModal(null)}>Забрать 🎉</button>
          </div>
        </div>
      )}

      {showNicknameModal && (
        <NicknameModal
          token={token}
          onDone={(name) => {
            setShowNicknameModal(false);
            setUser(u => ({ ...u, name, nameSet: true }));
          }}
        />
      )}

      {showScrollModal && (
        <div className="modal-overlay" onClick={() => { setShowScrollModal(false); setScrollName(""); setScrollError(""); }}>
          <div className="modal-card" style={{ maxWidth:360 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:36, textAlign:"center", marginBottom:8 }}>📜</div>
            <p className="modal-eyebrow">Свиток прошлого</p>
            <h3 className="modal-title">Смена имени</h3>
            <p className="modal-text">Свиток будет использован и исчезнет навсегда. Введи новый ник.</p>
            <input
              className="input"
              placeholder="Новый ник"
              value={scrollName}
              onChange={e => setScrollName(e.target.value)}
              maxLength={30}
              autoFocus
            />
            {scrollError && <p style={{ color:"#f87171", fontSize:13, margin:"6px 0 0" }}>{scrollError}</p>}
            <div className="modal-actions" style={{ marginTop:16 }}>
              <button className="btn btn-ghost" onClick={() => {
                setShowScrollModal(false); setScrollName(""); setScrollError("");
              }}>Отмена</button>
              <button className="btn btn-primary" disabled={scrollBusy || !scrollName.trim()}
                onClick={async () => {
                  try {
                    setScrollBusy(true); setScrollError("");
                    await axios.post(`${API}/me/use-scroll`, { name: scrollName }, authHeaders);
                    setUser(u => ({ ...u, name: scrollName.trim() }));
                    setShowScrollModal(false); setScrollName("");
                    showToast("Имя изменено!", "success");
                  } catch (e) {
                    setScrollError(e.response?.data?.message || "Ошибка");
                  } finally { setScrollBusy(false); }
                }}>
                {scrollBusy ? "..." : "Применить свиток"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rulesOpen && (
        <div className="modal-overlay" onClick={() => setRulesOpen(false)}>
          <div className="modal-card rules-card" onClick={e => e.stopPropagation()}>
            <Rules />
            <button className="btn btn-primary" onClick={() => setRulesOpen(false)}>Понятно</button>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function QuestCard({ task, loading, onComplete, onDelete, showDelete }) {
  const difficulty = getDifficultyMeta(task.difficulty);
  return (
    <div className={`quest-card ${task.completed ? "completed" : ""}`} style={{ opacity: loading ? 0.55 : 1 }}>
      <div className="quest-main">
        <h4 className="quest-title">{task.title}</h4>
        <div className="quest-meta">
          <span className="difficulty-pill">
            <span className="difficulty-dot" style={{ background: difficulty.color }} />
            {difficulty.label}
          </span>
          <span className="quest-reward">+{task.xpReward} XP · +{task.goldReward} золота</span>
        </div>
      </div>
      <div className="quest-actions">
        {!task.completed ? (
          <button className="btn btn-primary btn-sm" disabled={loading} onClick={onComplete}>
            {loading ? "..." : "Выполнить"}
          </button>
        ) : (
          <span className="completed-label">Выполнено</span>
        )}
        {showDelete && <button className="btn btn-danger btn-sm" onClick={onDelete}>Удалить</button>}
      </div>
    </div>
  );
}