import { useEffect, useState, useCallback, useRef } from "react";
import BottomNav from "./components/BottomNav";
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
import Pet from "./components/Pet";
import Achievements from "./components/Achievements";
import Stats from "./components/Stats";
import Pomodoro from "./components/Pomodoro";
import Avatar from "./components/Avatar";
// ThemePicker removed — Solo Leveling is the only theme
import AmbientMusic from "./components/AmbientMusic";
import NicknameModal from "./components/NicknameModal";
import NotificationBell from "./components/NotificationBell";
import Season from "./components/Season";
import QuestChains from "./components/QuestChains";
import WorldMap from "./components/WorldMap";
import Profile from "./components/Profile";
import Feed from "./components/Feed";
import WeeklyReport from "./components/WeeklyReport";
import OnboardingTest from "./components/OnboardingTest";
import DarkScreen from "./components/DarkScreen";
import Marathons from "./components/Marathons";
import Gratitude from "./components/Gratitude";
import League from "./components/League";
import NpcPage from "./components/NpcPage";
import SkillTree from "./components/SkillTree";
import SmartSearch from "./components/SmartSearch";
import OnePctWidget from "./components/OnePctWidget";
import LegendPath from "./components/LegendPath";
import LoadingScreen from "./components/LoadingScreen";
import WelcomeNPC from "./components/WelcomeNPC";
import FutureLetterScreen from "./components/FutureLetterScreen";
import DarkSideChoice from "./components/DarkSideChoice";
import Archive from "./components/Archive";
import ArchiveBadge from "./components/ArchiveBadge";
import ThemeChoiceScreen from "./components/ThemeChoiceScreen";
import SectionTabs from "./components/SectionTabs";
import Chess from "./components/Chess";
import Laptev from "./components/Laptev";
import LaptevAI from "./components/LaptevAI";
import CreatorPath from "./components/CreatorPath";
import HallOfFame from "./components/HallOfFame";
import Sages from "./components/Sages";
import VoiceInput from "./components/VoiceInput";
import UnlockNotification from "./components/UnlockNotification";
import { playQuestComplete, playLevelUp, playStreakComplete, setSound, isSoundEnabled } from "./sounds";
import StarField from "./components/StarField";
import RewardToastContainer, { showRewardToast } from "./components/ToastNotification";
import ToastContainer from "./components/Toast";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function LaptevMilestoneAvatar() {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{ width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#7c3aed,#1e1b4b)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:900,color:'#c4b5fd',border:'3px solid #7c3aed',margin:'0 auto' }}>Л</div>
  );
  return <img src="/images/laptev.jpg" alt="LAPTEV" onError={()=>setErr(true)} style={{ width:72,height:72,borderRadius:'50%',border:'3px solid #7c3aed',objectFit:'cover',margin:'0 auto',display:'block',boxShadow:'0 0 20px rgba(124,58,237,0.6)' }}/>;
}

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

const SHOP_THEME    = { accent:"#f5b637", glow:"rgba(245,182,55,0.35)"  };
const LIBRARY_THEME = { accent:"#22d3ee", glow:"rgba(34,211,238,0.35)"  };
const CLAN_THEME    = { accent:"#fb923c", glow:"rgba(251,146,60,0.35)"  };
const FRIENDS_THEME = { accent:"#f472b6", glow:"rgba(244,114,182,0.35)" };
const MASTERY_THEME = { accent:"#c084fc", glow:"rgba(192,132,252,0.35)" };
const JOURNAL_THEME = { accent:"#a78bfa", glow:"rgba(167,139,250,0.35)" };
const GOALS_THEME   = { accent:"#34d399", glow:"rgba(52,211,153,0.35)"  };
const QUESTS_NAV_THEME = { accent:"#8d8cf8", glow:"rgba(141,140,248,0.35)" };
const PET_THEME     = { accent:"#fb7878", glow:"rgba(251,120,120,0.35)" };
const ACH_THEME     = { accent:"#eab308", glow:"rgba(234,179,8,0.35)"   };
const STATS_THEME   = { accent:"#38bdf8", glow:"rgba(56,189,248,0.35)"  };
const POMO_THEME    = { accent:"#f87171", glow:"rgba(248,113,113,0.35)" };

const SEASON_THEME    = { accent:"#f5b637", glow:"rgba(245,182,55,0.35)"  };
const CHAINS_THEME    = { accent:"#c084fc", glow:"rgba(192,132,252,0.35)" };
const MAP_THEME       = { accent:"#34d399", glow:"rgba(52,211,153,0.35)"  };
const FEED_THEME      = { accent:"#f472b6", glow:"rgba(244,114,182,0.35)" };
const REPORT_THEME    = { accent:"#38bdf8", glow:"rgba(56,189,248,0.35)"  };
const PROFILE_THEME   = { accent:"#8d8cf8", glow:"rgba(141,140,248,0.35)" };
const MARATHON_THEME  = { accent:"#fb7878", glow:"rgba(251,120,120,0.35)" };
const LEAGUE_THEME    = { accent:"#f5b637", glow:"rgba(245,182,55,0.35)"  };
const GRATITUDE_THEME = { accent:"#34d399", glow:"rgba(52,211,153,0.35)"  };
const NPC_THEME       = { accent:"#c084fc", glow:"rgba(192,132,252,0.35)" };
const SKILLS_THEME    = { accent:"#eab308", glow:"rgba(234,179,8,0.35)"   };
const COACH_THEME     = { accent:"#6366f1", glow:"rgba(99,102,241,0.35)"  };

const NAV_ITEMS = [
  { key:"quests",       label:"Квесты",          icon:"🗺️", theme:QUESTS_NAV_THEME },
  { key:"chains",       label:"Цепочки",          icon:"⛓️", theme:CHAINS_THEME   },
  { key:"worldmap",     label:"Карта мира",       icon:"🗾", theme:MAP_THEME      },
  { key:"marathons",    label:"Марафоны",          icon:"🏃", theme:MARATHON_THEME },
  { key:"season",       label:"Сезон",            icon:"🌅", theme:SEASON_THEME   },
  { key:"league",       label:"Лиги",             icon:"🏆", theme:LEAGUE_THEME   },
  { key:"shop",         label:"Магазин",          icon:"🛒", theme:SHOP_THEME     },
  { key:"library",      label:"Библиотека",       icon:"📚", theme:LIBRARY_THEME  },
  { key:"skills",       label:"Навыки",           icon:"⚡", theme:SKILLS_THEME   },
  { key:"npc",          label:"Наставники",        icon:"👤", theme:NPC_THEME      },
  { key:"friends",      label:"Друзья",           icon:"🤝", theme:FRIENDS_THEME  },
  { key:"feed",         label:"Лента",            icon:"📡", theme:FEED_THEME     },
  { key:"gratitude",    label:"Благодарности",     icon:"🌿", theme:GRATITUDE_THEME},
  { key:"journal",      label:"Дневник",          icon:"📔", theme:JOURNAL_THEME  },
  { key:"goals",        label:"Цели",             icon:"🎯", theme:GOALS_THEME    },
  { key:"clan",         label:"Клан",             icon:"⚔️", theme:CLAN_THEME,
    lockLevel:CLAN_UNLOCK_LEVEL, lockMessage:"Кланы доступны с 10 уровня" },
  { key:"mastery",      label:"Мастерство",       icon:"🌟", theme:MASTERY_THEME,
    lockLevel:MASTERY_UNLOCK_LEVEL, lockMessage:"Ветка развития доступна с 25 уровня" },
  { key:"pet",          label:"Питомец",          icon:"🐾", theme:PET_THEME      },
  { key:"achievements", label:"Достижения",       icon:"🏅", theme:ACH_THEME      },
  { key:"stats",        label:"Статистика",       icon:"📊", theme:STATS_THEME    },
  { key:"pomodoro",     label:"Помодоро",         icon:"⏱️", theme:POMO_THEME     },
  { key:"report",       label:"Недельный отчёт",  icon:"📈", theme:REPORT_THEME   },
  { key:"profile",      label:"Мой профиль",      icon:"👤", theme:PROFILE_THEME  },
  { key:"laptev",       label:"Создатель",         icon:"👑", theme:{ accent:"#7c3aed", glow:"rgba(124,58,237,0.35)" } },
  { key:"sages",        label:"Мудрецы",           icon:"🏛️", theme:{ accent:"#fbbf24", glow:"rgba(251,191,36,0.35)" } },
  { key:"legend-path",  label:"Легендарный путь", icon:"🌟", theme:{ accent:"#f5b637", glow:"rgba(245,182,55,0.35)" }, lockLevel:50, lockMessage:"Легендарный путь открывается на 50 уровне" },
  { key:"creator-path", label:"Путь Создателя",  icon:"⚡", theme:{ accent:"#9333ea", glow:"rgba(147,51,234,0.45)" }, lockLevel:75, lockMessage:"Путь Создателя открывается на 75 уровне" },
  { key:"hall-of-fame", label:"Зал Славы",       icon:"🏆", theme:{ accent:"#f5b637", glow:"rgba(245,182,55,0.35)" } },
];

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

function getUnlockedFeatures(level) {
  return {
    quests: true, profile: true, worldmap: true, journal: true,
    goals: true, pomodoro: true, stats: true, achievements: true,
    library: true, feed: true, gratitude: true, chess: true,
    friends: true, laptev: true, sages: true, report: true,
    "hall-of-fame": true,
    shop: level >= 2,
    chains: level >= 3,
    marathons: level >= 4,
    npc: level >= 5,
    league: level >= 6,
    season: level >= 7,
    skills: level >= 8,
    pet: level >= 9,
    clan: level >= 10,
    mastery: level >= 15,
    "legend-path": level >= 50,
    "creator-path": level >= 75,
  };
}

const UNLOCK_AT = {
  2:'shop', 3:'chains', 4:'marathons', 5:'npc',
  6:'league', 7:'season', 8:'skills', 9:'pet',
  10:'clans', 15:'mastery', 50:'legendPath', 75:'creatorPath',
};

export default function App() {
  const [loadingDone,   setLoadingDone]   = useState(false);
  const [themeChosen,   setThemeChosen]   = useState(() => !!localStorage.getItem("theme_chosen"));
  const [npcDone,       setNpcDone]       = useState(() => !!localStorage.getItem("welcome_npc_done"));
  const [futureLetterDone, setFutureLetterDone] = useState(() => !!localStorage.getItem("future_letter_done"));
  const [showDarkSideChoice, setShowDarkSideChoice] = useState(false);
  const [showArchivePopup,  setShowArchivePopup]  = useState(false);
  const [showWelcomeRules, setShowWelcomeRules] = useState(false);
  const [welcomeSlide, setWelcomeSlide]   = useState(0);
  const [token,    setToken]    = useState(localStorage.getItem("token") || "");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  // Solo Leveling is the only theme — applied permanently
  const [theme,    setTheme]    = useState(() => {
    document.documentElement.setAttribute("data-theme", "solo-leveling");
    return "solo-leveling";
  });
  const [soundOn,  setSoundOn]  = useState(isSoundEnabled);

  const [user,  setUser]  = useState(null);
  const [tasks, setTasks] = useState([]);
  const [npcQuests, setNpcQuests] = useState([]);
  const [customQuestsCreatedToday, setCustomQuestsCreatedToday] = useState(0);
  const [customQuestsMax,          setCustomQuestsMax]          = useState(8);

  const [view,         setView]         = useState("quests");
  const [viewProfileId, setViewProfileId] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [chessGameId, setChessGameId] = useState(null);
  const [laptevMilestone, setLaptevMilestone] = useState(null);
  const [rulesOpen,    setRulesOpen]    = useState(false);
  const [activeBranch, setActiveBranch] = useState("discipline");

  const [newTaskTitle,      setNewTaskTitle]      = useState("");
  const [newTaskDifficulty, setNewTaskDifficulty] = useState("easy");
  const [newTaskBranch,     setNewTaskBranch]     = useState("discipline");

  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [shopItems,     setShopItems]     = useState([]);
  const [library,       setLibrary]       = useState([]);
  const [shopLoadingId, setShopLoadingId] = useState(null);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [showOnboarding,setShowOnboarding]= useState(false);
  const [darkScreen,    setDarkScreen]    = useState(null);

  const [toasts,             setToasts]             = useState([]);
  const [confirmDialog,      setConfirmDialog]      = useState(null);
  const [levelUpInfo,        setLevelUpInfo]        = useState(null);
  const [streakModal,        setStreakModal]         = useState(null);
  const [showNicknameModal,  setShowNicknameModal]  = useState(false);
  const [showScrollModal,    setShowScrollModal]    = useState(false);
  const [scrollName,         setScrollName]         = useState("");
  const [scrollError,        setScrollError]        = useState("");
  const [scrollBusy,         setScrollBusy]         = useState(false);
  const [onlineCount,        setOnlineCount]        = useState(null);
  const [unlockFeature,      setUnlockFeature]      = useState(null);
  const [easterEggPopup,     setEasterEggPopup]     = useState(null);

  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

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
      if (!res.data.onboardingDone && !localStorage.getItem("onboarding_dismissed")) {
        setShowOnboarding(true);
      } else if (res.data.lastActiveQuestDate) {
        try {
          const inact = await axios.get(`${API}/me/inactivity`, authHeaders);
          if (inact.data.inactive) setDarkScreen(inact.data);
        } catch {}
      }
    } catch (e) { console.error(e); }
  };

  const loadTasks = async () => {
    try {
      const res = await axios.get(`${API}/tasks`, authHeaders);
      if (res.data.tasks) {
        setTasks(res.data.tasks);
        setNpcQuests(res.data.npcQuests || []);
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
    if (!email.trim() || !password.trim()) { showToast("Введи почту и пароль", "error"); return; }
    try {
      console.log("[register] POST", `${API}/auth/register`, { email });
      await axios.post(`${API}/auth/register`, { email, password });
      showToast("Аккаунт создан! Теперь войди", "success");
      localStorage.removeItem("rules_shown");
      localStorage.removeItem("welcome_shown");
      setWelcomeSlide(0);
      setShowWelcomeRules(true);
    } catch (e) { showToast(e.response?.data?.message || "Ошибка регистрации", "error"); }
  };

  const login = async () => {
    if (!email.trim() || !password.trim()) { showToast("Введи почту и пароль", "error"); return; }
    try {
      console.log("[login] POST", `${API}/auth/login`, { email });
      const res = await axios.post(`${API}/auth/login`, { email, password });
      console.log("[login] success, token:", res.data.token?.slice(0, 20) + "...");
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
    } catch (e) {
      console.error("[login] error:", e.response?.status, e.response?.data);
      const msg = e.response?.data?.message || e.message || "Ошибка входа";
      showToast(msg === "Invalid credentials" ? "Неверная почта или пароль" : msg, "error");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(""); setUser(null); setTasks([]);
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await axios.post(`${API}/tasks`, { title: newTaskTitle }, authHeaders);
      setNewTaskTitle("");
      if (res.data.customQuestsCreatedToday !== undefined) setCustomQuestsCreatedToday(res.data.customQuestsCreatedToday);
      await loadTasks();
    } catch (e) { showToast(e.response?.data?.message || "Не удалось создать квест", "error"); }
  };

  const confirmComplete = (task) => {
    if (loadingTaskId === task.id) return;
    askConfirm({
      title: "Выполнить квест?",
      text: `«${task.title}» — +${task.xpReward} XP · +${task.goldReward} золота`,
      confirmLabel: "Выполнить",
      onConfirm: () => completeTask(task.id, task),
    });
  };

  const completeTask = async (id, taskObj) => {
    try {
      setLoadingTaskId(id);
      const prevLevel = user?.level || 1;
      const completeRes = await axios.patch(`${API}/tasks/${id}/complete`, {}, authHeaders);
      await loadTasks();
      playQuestComplete();
      const d = completeRes.data;
      const xpLabel = d.comboBonus > 0 ? `✨ +${d.xpGained} XP (+25% комбо)` : `✨ +${d.xpGained} XP`;
      if (d.xpGained)   showRewardToast(xpLabel, 'xp');
      if (d.goldGained) showRewardToast(`💰 +${d.goldGained} золота`, 'gold');
      if (taskObj?.isNpcQuest && taskObj?.npcName) showRewardToast(`⚡ Задание ${taskObj.npcName} выполнено!`, 'level');
      if (d.streakJustCompleted) { setStreakModal({ streak: d.newStreak }); playStreakComplete(); }
      // Тёмная сторона: показываем особые сообщения
      if (d.darkSide) {
        showRewardToast(`💰 +${d.goldGained} золота`, 'gold');
        if (d.xpLost) showRewardToast(`💔 -${d.xpLost} XP`, 'xp');
        showToast(d.message, "error");
      }
      const res = await axios.get(`${API}/me`, authHeaders);
      setUser(res.data);
      // Проверяем уведомление о выборе тёмной стороны
      if (res.data.darkSideActive) {
        try {
          const notifs = await axios.get(`${API}/notifications`, authHeaders).catch(() => ({ data: [] }));
          const hasChoice = (notifs.data || []).some(n => n.type === "dark_side_choice" && !n.read);
          if (hasChoice) setShowDarkSideChoice(true);
        } catch {}
      }
      if (res.data.level > prevLevel) {
        playLevelUp();
        const newLevel = res.data.level;
        showRewardToast(`⬆️ Уровень ${newLevel}!`, 'level');
        let unlock = null;
        if (newLevel >= CLAN_UNLOCK_LEVEL    && prevLevel < CLAN_UNLOCK_LEVEL)    unlock = "⚔️ Кланы разблокированы!";
        if (newLevel >= MASTERY_UNLOCK_LEVEL && prevLevel < MASTERY_UNLOCK_LEVEL) unlock = "🌟 Ветка Мастерства разблокирована!";
        setLevelUpInfo({ level: newLevel, unlock });
        // LAPTEV milestone popup
        const LAPTEV_MILESTONES = {
          5:  "Пять уровней. Не все доходят сюда. Продолжай.",
          10: "Десятый уровень. Система работает. Ты работаешь.",
          20: "Двадцатый. Ты уже не тот кем был при входе.",
          25: "Четверть пути. Мало кто здесь бывает.",
          30: "Тридцатый. Теперь ты можешь вести других.",
          40: "Легендарный путь открыт. Я знал что ты дойдёшь.",
          50: "Половина пути. Большинство людей не достигают этого за всю жизнь.",
        };
        // Archive popup at level 40
        if (newLevel >= 40 && prevLevel < 40 && !localStorage.getItem("archive_popup_shown")) {
          setTimeout(() => setShowArchivePopup(true), 1800);
        }
        if (LAPTEV_MILESTONES[newLevel]) {
          const key = `laptev_milestone_${newLevel}`;
          if (!localStorage.getItem(key)) {
            setTimeout(() => setLaptevMilestone({ level: newLevel, text: LAPTEV_MILESTONES[newLevel] }), 1200);
          }
        }
      }
    } catch (e) { showToast(e.response?.data?.message || "Ошибка выполнения", "error"); }
    finally { setLoadingTaskId(null); }
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
      await loadShop(); await loadLibrary(); await loadProfile();
      showToast(`«${item.title}» куплено!`, "success");
    } catch (e) { showToast(e.response?.data?.message || "Не удалось купить", "error"); }
    finally { setShopLoadingId(null); }
  };

  useEffect(() => { if (token) { loadProfile(); loadTasks(); axios.get(`${API}/online-count`,authHeaders).then(r=>setOnlineCount(r.data.count)).catch(()=>{}); } }, [token]);
  useEffect(() => {
    if (!token) return;
    const pollUnread = () => axios.get(`${API}/messages/unread-count`, authHeaders).then(r => setUnreadMessages(r.data.count || 0)).catch(() => {});
    pollUnread();
    const t = setInterval(pollUnread, 10000);
    return () => clearInterval(t);
  }, [token]);
  useEffect(() => { if (token && (view === "shop" || view === "library")) { loadShop(); loadLibrary(); } }, [token, view]);

  useEffect(() => {
    if (!user?.level) return;
    const shown = JSON.parse(localStorage.getItem('unlock_shown') || '{}');
    const feature = UNLOCK_AT[user.level];
    if (feature && !shown[user.level]) {
      const t = setTimeout(() => {
        setUnlockFeature(feature);
        shown[user.level] = true;
        localStorage.setItem('unlock_shown', JSON.stringify(shown));
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [user?.level]);

  useEffect(() => {
    const handler = (e) => {
      if (!token) return;
      if (e.ctrlKey && e.key === "k") { e.preventDefault(); setSearchOpen(v => !v); return; }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [token]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const handleLogoClick = () => {
    clickCountRef.current++;
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 3000);
    if (clickCountRef.current >= 7) {
      clickCountRef.current = 0;
      const found = localStorage.getItem('easter_logo');
      if (!found) {
        localStorage.setItem('easter_logo', 'true');
        fetch(`${API}/easter/logo`, { method:'POST', headers:{ Authorization:`Bearer ${token}` } })
          .then(r => r.json()).then(d => { if (d.gold) loadProfile(); }).catch(() => {});
        setEasterEggPopup({ icon:'🎯', title:'Ты нашёл секрет', text:'Большинство даже не догадывались что это можно нажать. +500 золота.' });
      }
    }
  };

  const branchTasks    = tasks.filter(t => t.branch === activeBranch && (t.type === "required" || t.type === "recommended"));
  const legendaryTasks = tasks.filter(t => t.type === "legendary" && !t.completed && (!t.expiresAt || new Date(t.expiresAt) > new Date()));
  const customTasks    = tasks.filter(t => t.type === "custom" && !t.completed);
  const tasksByType    = {
    required:    branchTasks.filter(t => t.type === "required"),
    recommended: branchTasks.filter(t => t.type === "recommended"),
  };
  const customSlotsLeft = Math.max(0, customQuestsMax - customQuestsCreatedToday);
  const rootStyle = { "--accent": effectiveTheme.accent, "--accent-glow": effectiveTheme.glow };

  if (!loadingDone) return <LoadingScreen onDone={() => setLoadingDone(true)} />;
  if (!themeChosen) return <ThemeChoiceScreen onChosen={(id) => { setTheme(id); setThemeChosen(true); }} />;

  if (!token) {
    return (
      <div className="auth-screen" style={{ "--accent": QUESTS_NAV_THEME.accent, "--accent-glow": QUESTS_NAV_THEME.glow }}>
        <div className="auth-card">
          <h1 className="brand-title">LevelUp</h1>
          <p className="auth-eyebrow">ГЕЙМИФИКАЦИЯ ЖИЗНИ</p>
          <p className="auth-sub">ПУТЬ ИГРОКА НАЧИНАЕТСЯ ЗДЕСЬ</p>
          <label className="field-label">Почта</label>
          <input className="input" placeholder="you@mail.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
          <label className="field-label">Пароль</label>
          <input className="input" placeholder="••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
          <div className="auth-actions">
            <button className="btn btn-ghost" type="button" onClick={register}>Создать аккаунт</button>
            <button className="btn btn-primary" type="button" onClick={login}>Войти</button>
          </div>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="app-shell" style={rootStyle}>
      {/* ── SIDE PANELS (desktop only) ── */}
      <div className="side-panel side-panel-left">
        <StarField side="left" />
      </div>
      <div className="side-panel side-panel-right">
        <StarField side="right" />
      </div>

      <div className="app-container">

        <header className="topbar">
          <div>
            <p className="topbar-eyebrow">ГЕЙМИФИКАЦИЯ ЖИЗНИ</p>
            <h1 className="brand-title levelup-title" onClick={handleLogoClick} style={{ cursor:'default', userSelect:'none' }}>LevelUp</h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
            {onlineCount !== null && (
              <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"rgba(255,255,255,0.4)" }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:"#34d399",display:"inline-block" }}/>
                {onlineCount}
              </div>
            )}
            <button className="rules-btn" title={soundOn ? "Звук вкл" : "Звук выкл"}
              onClick={() => { const next = !soundOn; setSoundOn(next); setSound(next); }}
              style={{ fontSize:16 }}>
              {soundOn ? "🔊" : "🔇"}
            </button>
            <button className="rules-btn" title="Поиск (Ctrl+K)" onClick={() => setSearchOpen(true)} style={{ fontSize:16 }}>🔍</button>
            {token && <NotificationBell token={token} onNavigate={setView} />}
            <button className="rules-btn" onClick={() => setRulesOpen(true)}>?</button>
          </div>
        </header>

        {user && view === "quests" && (() => {
          const daysSince = user.createdAt
            ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 1;
          return (
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)", padding:"4px 0 8px", lineHeight:1.4 }}>
              День <span style={{ color:"#a78bfa", fontWeight:700 }}>{daysSince}</span> твоего пути.
            </div>
          );
        })()}

        {user && (
          <PlayerCard
            user={user}
            onLogout={logout}
            onOpenScroll={() => setShowScrollModal(true)}
            onGoToShop={() => setView("shop")}
            onGoToProfile={() => setView("profile")}
            onAvatarChange={(av) => setUser(prev => ({ ...prev, avatar: av }))}
          />
        )}


        {/* ── МИР ──────────────────────────────────────────────────────── */}
        {["worldmap","mastery","skills","league","chains","marathons","season","legend-path","creator-path","hall-of-fame"].includes(view) && (
          <>
            <SectionTabs tabs={[
              {key:"worldmap",     label:"Карта",      icon:"🗺️"},
              {key:"chains",       label:"Цепочки",    icon:"⛓️"},
              {key:"marathons",    label:"Марафоны",   icon:"🏃"},
              {key:"mastery",      label:"Мастерство", icon:"🌟"},
              {key:"skills",       label:"Навыки",     icon:"⚡"},
              {key:"league",       label:"Лиги",       icon:"🏆"},
              {key:"season",       label:"Сезон",      icon:"🌅"},
              {key:"legend-path",  label:"Легенда",    icon:"👑"},
              {key:"creator-path", label:"Создатель",  icon:"⚡"},
              {key:"hall-of-fame", label:"Зал Славы",  icon:"🏆"},
            ]} active={view} onChange={setView} />
            {view === "worldmap"     && <WorldMap    token={token} userLevel={user?.level||1} showToast={showToast} />}
            {view === "chains"       && <QuestChains token={token} showToast={showToast} askConfirm={askConfirm} userLevel={user?.level||1} />}
            {view === "marathons"    && <Marathons   token={token} showToast={showToast} userLevel={user?.level||1} />}
            {view === "mastery"      && <Mastery     token={token} showToast={showToast} askConfirm={askConfirm} myLevel={user?.level||1} onFinished={loadProfile} />}
            {view === "skills"       && <SkillTree   token={token} showToast={showToast} userLevel={user?.level||1} />}
            {view === "league"       && <League      token={token} showToast={showToast} userLevel={user?.level||1} />}
            {view === "season"       && <Season      token={token} showToast={showToast} userLevel={user?.level||1} />}
            {view === "legend-path"  && <LegendPath  token={token} showToast={showToast} userLevel={user?.level||1} />}
            {view === "creator-path" && <CreatorPath token={token} showToast={showToast} userLevel={user?.level||1} />}
            {view === "hall-of-fame" && <HallOfFame  token={token} />}
          </>
        )}

        {/* ── СОЦИАЛКА ─────────────────────────────────────────────────── */}
        {["friends","clan","feed","npc","gratitude","chess"].includes(view) && (
          <>
            <SectionTabs tabs={[
              {key:"friends",   label:"Друзья",        icon:"🤝"},
              {key:"clan",      label:"Клан",          icon:"⚔️"},
              {key:"chess",     label:"Шахматы",       icon:"♟️"},
              {key:"feed",      label:"Лента",         icon:"📡"},
              {key:"npc",       label:"Наставники",    icon:"🧙"},
              {key:"gratitude", label:"Благодарность", icon:"🌿"},
            ]} active={view} onChange={setView} />
            {view === "friends"   && <Friends  token={token} showToast={showToast} askConfirm={askConfirm} myStreak={user?.streak||0} myGold={user?.gold||0} onChessInvite={(gid) => { setChessGameId(gid || null); setView("chess"); }} onViewProfile={(id) => { setViewProfileId(id); setView("profile"); }} />}
            {view === "clan"      && <Clan     token={token} showToast={showToast} askConfirm={askConfirm} currentUserId={user?.id} myLevel={user?.level||1} />}
            {view === "chess"     && <Chess    token={token} showToast={showToast} gameId={chessGameId} />}
            {view === "feed"      && <Feed     token={token} showToast={showToast} />}
            {view === "npc"       && <NpcPage  token={token} showToast={showToast} userLevel={user?.level||1} />}
            {view === "gratitude" && <Gratitude token={token} showToast={showToast} />}
          </>
        )}

        {/* ── ПРОФИЛЬ ──────────────────────────────────────────────────── */}
        {["profile","achievements","stats","shop","library","journal","goals","pet","pomodoro","report","laptev","sages","archive"].includes(view) && (
          <>
            <SectionTabs tabs={[
              {key:"profile",      label:"Обзор",      icon:"🪪"},
              {key:"achievements", label:"Достижения", icon:"🏅"},
              {key:"stats",        label:"Статистика", icon:"📊"},
              {key:"shop",         label:"Магазин",    icon:"🛒"},
              {key:"library",      label:"Библиотека", icon:"📚"},
              {key:"journal",      label:"Дневник",    icon:"📔"},
              {key:"goals",        label:"Цели",       icon:"🎯"},
              {key:"pet",          label:"Питомец",    icon:"🐾"},
              {key:"pomodoro",     label:"Помодоро",   icon:"⏱️"},
              {key:"laptev",       label:"Создатель",  icon:"👑"},
              {key:"sages",        label:"Мудрецы",    icon:"🏛️"},
              ...((user?.level||1) >= 40 ? [{key:"archive", label:"Архив", icon:"◈"}] : []),
            ]} active={view} onChange={setView} />
            {view === "profile"      && <Profile     token={token} showToast={showToast} userId={viewProfileId} currentUserId={user?.id} onBack={viewProfileId ? () => { setViewProfileId(null); setView("friends"); } : null} />}
            {view === "achievements" && <Achievements token={token} showToast={showToast} />}
            {view === "stats"        && <Stats        token={token} />}
            {view === "shop"         && <Shop items={shopItems} gold={user?.gold||0} loadingId={shopLoadingId} onPurchase={purchaseItem} streakFreezeCount={user?.streakFreezeCount||0} token={token} showToast={showToast} onProfileRefresh={loadProfile} userLevel={user?.level||1} />}
            {view === "library"      && <Library      library={library} token={token} showToast={showToast} onProfileRefresh={loadProfile} />}
            {view === "journal"      && <Journal      token={token} showToast={showToast} />}
            {view === "goals"        && <Goals        token={token} showToast={showToast} askConfirm={askConfirm} />}
            {view === "pet"          && <Pet          token={token} showToast={showToast} userStreak={user?.streak||0} userLevel={user?.level||1} />}
            {view === "pomodoro"     && <Pomodoro     token={token} showToast={showToast} onXpGained={loadProfile} />}
            {view === "report"       && <WeeklyReport token={token} showToast={showToast} />}
            {view === "laptev"       && <Laptev       token={token} user={user} showToast={showToast} onNavigate={setView} />}
            {view === "sages"        && <Sages        token={token} showToast={showToast} />}
            {view === "archive"      && <Archive      userLevel={user?.level||1} archiveSolved={user?.archiveSolved||false} archiveFitnessDays={user?.archiveFitnessDays||0} />}
          </>
        )}

        {searchOpen && (
          <SmartSearch
            token={token}
            onNavigate={(key) => setView(key)}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {showOnboarding && (
          <OnboardingTest
            token={token}
            onComplete={() => { setShowOnboarding(false); loadProfile(); }}
          />
        )}

        {darkScreen && !showOnboarding && (
          <DarkScreen
            days={darkScreen.days}
            xpLost={darkScreen.xpLost}
            token={token}
            onChallenge={() => { setDarkScreen(null); loadTasks(); showToast("Квест возрождения добавлен!", "success"); }}
            onClose={() => setDarkScreen(null)}
          />
        )}


        {view === "quests" && (
          <>
            {npcQuests.length > 0 && (
              <section style={{ marginBottom:16 }}>
                <style>{`
                  @keyframes npcGlow {
                    0%,100% { box-shadow: 0 0 10px rgba(59,130,246,0.3); }
                    50% { box-shadow: 0 0 25px rgba(59,130,246,0.7), 0 0 50px rgba(59,130,246,0.3); }
                  }
                `}</style>
                <div className="section-eyebrow" style={{ color:"#60a5fa" }}><span>⚡</span> ЗАДАНИЯ НАСТАВНИКОВ</div>
                {npcQuests.map(t => (
                  <div key={t.id} style={{
                    background:'linear-gradient(135deg, #0f172a, #1e3a5f)',
                    border:'1px solid #3b82f6',
                    borderRadius:12,
                    marginBottom:10,
                    animation:'npcGlow 2s ease-in-out infinite',
                    overflow:'hidden',
                    display:'flex',
                    alignItems:'stretch',
                  }}>
                    <div style={{ width:4, background:'#3b82f6', flexShrink:0 }} />
                    <div style={{ padding:'12px 14px', flex:1 }}>
                      <div style={{ fontSize:11, color:'#93c5fd', fontWeight:700, marginBottom:4 }}>
                        ⚡ {t.npcName}
                      </div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0', marginBottom:8 }}>{t.title}</div>
                      {t.description && (
                        <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:8, lineHeight:1.4 }}>{t.description}</div>
                      )}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:11, color:'#60a5fa' }}>+{t.xpReward} XP · +{t.goldReward} золота</span>
                        <button
                          onClick={() => confirmComplete(t)}
                          disabled={loadingTaskId === t.id}
                          style={{
                            background:'#3b82f6', color:'#fff', border:'none',
                            borderRadius:8, padding:'5px 14px', fontSize:12,
                            fontWeight:700, cursor:'pointer',
                          }}>
                          {loadingTaskId === t.id ? '...' : 'Выполнить'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )}

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
                  <div className="new-quest-form" style={{ flexWrap:"wrap" }}>
                    <input className="input" placeholder="Название квеста" value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && createTask()}
                      disabled={customSlotsLeft === 0}
                      style={{ flex:1 }} />
                    <VoiceInput onResult={text => setNewTaskTitle(prev => prev + text)} />
                    <button className="btn btn-primary" onClick={createTask} disabled={customSlotsLeft === 0 || !newTaskTitle.trim()}>Добавить</button>
                  </div>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", margin:"4px 0 8px" }}>
                    Ветка назначается автоматически · После выполнения квест исчезает
                  </p>
                  {customTasks.length === 0 ? (
                    <p className="empty-state">Нет своих квестов — добавь первый выше.</p>
                  ) : (
                    <div className="quest-list">
                      {customTasks.map(t => (
                        <QuestCard key={t.id} task={t} loading={loadingTaskId === t.id}
                          onComplete={() => confirmComplete(t)}
                          onDelete={() => askConfirm({ title:"Удалить квест?", text:"Слот не вернётся.", confirmLabel:"Удалить", onConfirm:() => deleteTask(t.id) })}
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
                              onComplete={() => confirmComplete(t)} onDelete={() => deleteTask(t.id)} showDelete={false} />
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
        <div style={{ height:70 }} />
      </div>

      <BottomNav
        currentView={view}
        onNavigate={(key) => { const item = NAV_ITEMS.find(n => n.key === key); if (item?.lockLevel && (user?.level||1) < item.lockLevel) { showToast(item.lockMessage,"error"); return; } setView(key); }}
        userLevel={user?.level || 1}
        showToast={showToast}
        unreadMessages={unreadMessages}
      />

      {/* ── Modals ── */}

      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <p className="modal-eyebrow">Подтверждение</p>
            <h3 className="modal-title">{confirmDialog.title}</h3>
            <p className="modal-text">{confirmDialog.text}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDialog(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={() => { const fn = confirmDialog.onConfirm; setConfirmDialog(null); fn(); }}>{confirmDialog.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      {levelUpInfo && (
        <div style={{
          position:'fixed', inset:0, zIndex:10000,
          background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center',
          animation:'fadeIn 0.3s ease',
        }} onClick={() => setLevelUpInfo(null)}>
          <div style={{
            background:'linear-gradient(135deg,#1a0a3e,#0d0820)',
            border:'2px solid #7c3aed',
            borderRadius:24,
            padding:'40px 32px',
            textAlign:'center',
            maxWidth:320,
            boxShadow:'0 0 60px rgba(124,58,237,0.5), 0 0 120px rgba(124,58,237,0.2)',
            animation:'levelUpPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:64, marginBottom:8, filter:'drop-shadow(0 0 20px #a78bfa)' }}>⚡</div>
            <div style={{
              fontSize:72, fontWeight:900, lineHeight:1,
              background:'linear-gradient(135deg,#c4b5fd,#7c3aed,#a78bfa)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              marginBottom:8, textShadow:'none',
            }}>{levelUpInfo.level}</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#a78bfa', letterSpacing:3, textTransform:'uppercase', marginBottom:12 }}>Новый уровень</div>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.7)', lineHeight:1.6, margin:'0 0 20px' }}>
              Ты прокачался до <strong style={{ color:'#c4b5fd' }}>{levelUpInfo.level}</strong> уровня. Продолжай в том же духе.
            </p>
            {levelUpInfo.unlock && (
              <div style={{
                background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.4)',
                borderRadius:10, padding:'10px 16px', marginBottom:20,
                fontSize:13, color:'#c4b5fd', fontWeight:600,
              }}>{levelUpInfo.unlock}</div>
            )}
            <button className="btn btn-primary" style={{ width:'100%', fontSize:16 }}
              onClick={() => {
                setLevelUpInfo(null);
                document.querySelector('.player-card')?.scrollIntoView({ behavior:'smooth' });
              }}>Отлично!</button>
          </div>
        </div>
      )}

      {/* ── Welcome Rules Slides ── */}
      {showWelcomeRules && (() => {
        const SLIDES = [
          { emoji:"🎮", title:"Добро пожаловать в LevelUp!", text:"Геймификация твоей жизни. Прокачивай себя как персонажа в RPG — каждый день." },
          { emoji:"⚔️", title:"Выполняй квесты каждый день", text:"За каждый квест — XP и золото. Копи опыт, повышай уровень, разблокируй новые возможности." },
          { emoji:"🔥", title:"Не прерывай стрик", text:"Пропустил день — получи штраф золотом. Чем длиннее стрик, тем больше награды на финише." },
          { emoji:"🚀", title:"Готов начать?", text:"Твой путь начинается здесь. Первый квест уже ждёт тебя.", isLast:true },
        ];
        const slide = SLIDES[welcomeSlide];
        const close = () => { localStorage.setItem("rules_shown","true"); setShowWelcomeRules(false); };
        return (
          <div style={{ position:'fixed', inset:0, zIndex:10002, background:'rgba(0,0,0,0.92)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'linear-gradient(135deg,#0b0e1a,#1a0a2e)',
              border:'1px solid rgba(124,58,237,0.4)', borderRadius:24,
              padding:'40px 28px', maxWidth:340, width:'90%', textAlign:'center',
              boxShadow:'0 0 60px rgba(124,58,237,0.3)' }}>
              <div style={{ fontSize:54, marginBottom:16 }}>{slide.emoji}</div>
              <h2 style={{ fontSize:20, fontWeight:900, color:'#c4b5fd', marginBottom:12, lineHeight:1.3 }}>{slide.title}</h2>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.7, marginBottom:28 }}>{slide.text}</p>
              {/* Dots */}
              <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:24 }}>
                {SLIDES.map((_,i) => (
                  <div key={i} style={{ width:8, height:8, borderRadius:'50%',
                    background: i===welcomeSlide ? '#7c3aed' : 'rgba(255,255,255,0.15)',
                    transition:'background 0.2s' }}/>
                ))}
              </div>
              {slide.isLast ? (
                <button className="btn btn-primary" style={{ width:'100%', fontSize:16, padding:'14px', fontWeight:900, letterSpacing:1 }} onClick={close}>
                  НАЧАТЬ ПУТЬ ⚡
                </button>
              ) : (
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-ghost" style={{ flex:1 }} onClick={close}>Пропустить</button>
                  <button className="btn btn-primary" style={{ flex:2 }} onClick={() => setWelcomeSlide(s => s+1)}>Далее →</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Unlock Notification ── */}
      {unlockFeature && <UnlockNotification feature={unlockFeature} onClose={() => setUnlockFeature(null)} />}

      {/* ── Easter Egg Popup ── */}
      {easterEggPopup && (
        <div style={{ position:'fixed', inset:0, zIndex:10003, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setEasterEggPopup(null)}>
          <div style={{ background:'linear-gradient(135deg,#0b0e1a,#1a0a2e)', border:'2px solid #f5b637', borderRadius:24, padding:'40px 28px', maxWidth:320, textAlign:'center', boxShadow:'0 0 60px rgba(245,182,55,0.4)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:52, marginBottom:12 }}>{easterEggPopup.icon}</div>
            <h2 style={{ fontSize:20, fontWeight:900, color:'#fcd34d', marginBottom:10 }}>{easterEggPopup.title}</h2>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.7, marginBottom:24 }}>{easterEggPopup.text}</p>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => setEasterEggPopup(null)}>Принять!</button>
          </div>
        </div>
      )}

      {/* ── LAPTEV Milestone Popup ── */}
      {laptevMilestone && (
        <div style={{
          position:'fixed', inset:0, zIndex:10001,
          background:'rgba(0,0,0,0.9)',
          display:'flex', alignItems:'center', justifyContent:'center',
          animation:'fadeIn 0.3s ease',
        }} onClick={() => { localStorage.setItem(`laptev_milestone_${laptevMilestone.level}`,'1'); setLaptevMilestone(null); }}>
          <div style={{
            background:'linear-gradient(135deg,#050510,#1a0a2e)',
            border:'2px solid #7c3aed',
            borderRadius:24, padding:'36px 28px', textAlign:'center', maxWidth:320,
            boxShadow:'0 0 60px rgba(124,58,237,0.6), 0 0 120px rgba(124,58,237,0.2)',
            animation:'levelUpPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }} onClick={e => e.stopPropagation()}>
            <LaptevMilestoneAvatar />
            <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:2, margin:'12px 0 4px' }}>УРОВЕНЬ {laptevMilestone.level}</div>
            <div style={{
              fontSize:20, fontWeight:900, letterSpacing:3,
              background:'linear-gradient(90deg,#7c3aed,#f5b637,#a78bfa)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              marginBottom:14,
            }}>LAPTEV</div>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.8)', lineHeight:1.7, margin:'0 0 22px', fontStyle:'italic' }}>
              "{laptevMilestone.text}"
            </p>
            <button className="btn btn-primary" style={{ width:'100%', fontSize:15 }}
              onClick={() => { localStorage.setItem(`laptev_milestone_${laptevMilestone.level}`,'1'); setLaptevMilestone(null); }}>
              Принято
            </button>
          </div>
        </div>
      )}

      {streakModal && (
        <div className="modal-overlay" onClick={() => setStreakModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:42, textAlign:"center", marginBottom:8 }}>🔥</div>
            <p className="modal-eyebrow">Серия</p>
            <h3 className="modal-title">Все обязательные квесты выполнены!</h3>
            <p className="modal-text">Серия: {streakModal.streak} {streakModal.streak === 1 ? "день" : streakModal.streak < 5 ? "дня" : "дней"} подряд. Так держать!</p>
            <button className="btn btn-primary" onClick={() => setStreakModal(null)}>Огонь 🔥</button>
          </div>
        </div>
      )}

      {showNicknameModal && (
        <NicknameModal
          token={token}
          onDone={(name) => { setShowNicknameModal(false); setUser(u => ({ ...u, name, nameSet: true })); }}
        />
      )}

      {showScrollModal && (
        <div className="modal-overlay" onClick={() => { setShowScrollModal(false); setScrollName(""); setScrollError(""); }}>
          <div className="modal-card" style={{ maxWidth:360 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:36, textAlign:"center", marginBottom:8 }}>📜</div>
            <p className="modal-eyebrow">Свиток прошлого</p>
            <h3 className="modal-title">Смена имени</h3>
            <p className="modal-text">Свиток будет использован и исчезнет навсегда. Введи новый ник.</p>
            <input className="input" placeholder="Новый ник" value={scrollName} onChange={e => setScrollName(e.target.value)} maxLength={30} autoFocus />
            {scrollError && <p style={{ color:"#f87171", fontSize:13, margin:"6px 0 0" }}>{scrollError}</p>}
            <div className="modal-actions" style={{ marginTop:16 }}>
              <button className="btn btn-ghost" onClick={() => { setShowScrollModal(false); setScrollName(""); setScrollError(""); }}>Отмена</button>
              <button className="btn btn-primary" disabled={scrollBusy || !scrollName.trim()}
                onClick={async () => {
                  try {
                    setScrollBusy(true); setScrollError("");
                    await axios.post(`${API}/me/use-scroll`, { name: scrollName }, authHeaders);
                    setUser(u => ({ ...u, name: scrollName.trim() }));
                    setShowScrollModal(false); setScrollName("");
                    showToast("Имя изменено!", "success");
                  } catch (e) { setScrollError(e.response?.data?.message || "Ошибка"); }
                  finally { setScrollBusy(false); }
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
      <RewardToastContainer />
      <AmbientMusic />

      {!npcDone && !showOnboarding && (
        <WelcomeNPC onDone={() => setNpcDone(true)} />
      )}
      {npcDone && !futureLetterDone && !showOnboarding && token && (
        <FutureLetterScreen
          token={token}
          onDone={() => {
            localStorage.setItem("future_letter_done", "1");
            setFutureLetterDone(true);
          }}
        />
      )}
      {showArchivePopup && (
        <div style={{
          position:"fixed", inset:0, zIndex:10000,
          background:"rgba(0,0,0,0.95)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <style>{`
            @keyframes archiveGlow {
              0%   { text-shadow: 0 0 8px #7c3aed,0 0 16px #7c3aed; color:#a78bfa; }
              25%  { text-shadow: 0 0 8px #2563eb,0 0 16px #2563eb; color:#93c5fd; }
              50%  { text-shadow: 0 0 8px #059669,0 0 16px #059669; color:#6ee7b7; }
              75%  { text-shadow: 0 0 8px #d97706,0 0 16px #d97706; color:#fcd34d; }
              100% { text-shadow: 0 0 8px #7c3aed,0 0 16px #7c3aed; color:#a78bfa; }
            }
          `}</style>
          <div style={{ textAlign:"center", maxWidth:320, padding:32 }}>
            <div style={{ fontSize:48, marginBottom:24, animation:"archiveGlow 4s ease-in-out infinite", display:"inline-block" }}>◈</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", letterSpacing:3, marginBottom:16, textTransform:"uppercase" }}>Обнаружено</div>
            <div style={{ fontSize:24, fontWeight:900, color:"#e2e8f0", marginBottom:8 }}>АРХИВ</div>
            <div style={{ fontSize:14, color:"rgba(255,255,255,0.4)", lineHeight:1.8 }}>Что-то ждало тебя здесь всё это время.</div>
            <button onClick={() => { localStorage.setItem("archive_popup_shown","1"); setShowArchivePopup(false); }} style={{
              marginTop:32, background:"none", border:"1px solid rgba(255,255,255,0.1)",
              color:"rgba(255,255,255,0.3)", borderRadius:8, padding:"8px 24px",
              cursor:"pointer", fontSize:13,
            }}>Закрыть</button>
          </div>
        </div>
      )}

      {showDarkSideChoice && token && (
        <DarkSideChoice
          token={token}
          user={user}
          onChoose={async (choice) => {
            setShowDarkSideChoice(false);
            await loadProfile();
            if (choice === "light") showToast("⚡ Добро пожаловать обратно! Путь Антагониста открыт.", "success");
            else showToast("🌑 LAPTEV вернёт тебя через 3 дня.", "error");
          }}
        />
      )}
    </div>
  );
}

function QuestCard({ task, loading, onComplete, onDelete, showDelete }) {
  const isLegendary = task.type === "legendary";
  const isRequired  = task.type === "required";
  const isSeasonal  = task.isSeasonal;
  const difficulty  = getDifficultyMeta(task.difficulty);
  const [showPenaltyTip, setShowPenaltyTip] = useState(false);
  const tipTimer = useRef(null);

  const legendaryStyle = isLegendary ? {
    boxShadow : "0 0 20px rgba(245,182,55,0.55), 0 0 40px rgba(245,182,55,0.2)",
    border     : "2px solid #f5b637",
    background : "linear-gradient(135deg,rgba(245,182,55,0.12) 0%,rgba(30,27,50,0.95) 100%)",
  } : {};
  const seasonalStyle = isSeasonal ? { border:"1px solid rgba(56,189,248,0.5)", background:"linear-gradient(135deg,rgba(56,189,248,0.05),rgba(30,27,50,0.95))" } : {};

  const handleMouseEnter = () => {
    if (isRequired && !task.completed) {
      tipTimer.current = setTimeout(() => setShowPenaltyTip(true), 300);
    }
  };
  const handleMouseLeave = () => {
    clearTimeout(tipTimer.current);
    setShowPenaltyTip(false);
  };

  return (
    <div className={`quest-card ${task.completed ? "completed" : ""} ${isLegendary ? "legendary-card" : ""}`}
      style={{ opacity: loading ? 0.55 : 1, position:"relative", ...legendaryStyle, ...seasonalStyle, transition:"transform 0.15s,box-shadow 0.15s" }}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>

      {showPenaltyTip && (
        <div style={{
          position:"absolute", top:-38, left:"50%", transform:"translateX(-50%)",
          background:"rgba(15,5,30,0.97)", border:"1px solid rgba(239,68,68,0.6)",
          borderRadius:8, padding:"5px 10px", zIndex:100, whiteSpace:"nowrap",
          fontSize:11, color:"#fca5a5", pointerEvents:"none",
          boxShadow:"0 0 10px rgba(239,68,68,0.3)",
        }}>⚠️ Не выполнишь — штраф золота</div>
      )}

      <div className="quest-main">
        {isLegendary && (
          <div style={{ fontSize:11, fontWeight:800, color:"#f5b637", marginBottom:5, letterSpacing:1.5, display:"flex", alignItems:"center", gap:5 }}>
            <span>⚔️</span> ЛЕГЕНДАРНЫЙ
          </div>
        )}
        {isSeasonal && (
          <div style={{ fontSize:10, fontWeight:800, color:"#38bdf8", marginBottom:4, letterSpacing:1, display:"flex", alignItems:"center", gap:4 }}>
            🌟 СЕЗОННЫЙ
          </div>
        )}
        <h4 className="quest-title" style={isLegendary ? { color:"#fde68a" } : {}}>{task.title}</h4>
        {task.description && (
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.45)", margin:"3px 0 0", lineHeight:1.4 }}>{task.description}</p>
        )}
        <div className="quest-meta">
          {!isLegendary && (
            <span className="difficulty-pill">
              <span className="difficulty-dot" style={{ background: difficulty.color }} />
              {difficulty.label}
            </span>
          )}
          {isRequired && !task.completed && (
            <span style={{ fontSize:10, color:"#fca5a5", fontWeight:600 }}>🔒 Обязательный</span>
          )}
          <span className="quest-reward" style={isLegendary ? { color:"#f5b637", fontWeight:700, fontSize:13 } : {}}>
            +{task.xpReward} XP · +{task.goldReward} золота
          </span>
          {isLegendary && <span style={{ fontSize:10, color:"rgba(245,182,55,0.7)", fontStyle:"italic" }}>x3 награда</span>}
        </div>
      </div>
      <div className="quest-actions">
        {!task.completed ? (
          <button className="btn btn-sm" disabled={loading} onClick={onComplete}
            style={isLegendary ? { background:"#f5b637", color:"#1e1b32", fontWeight:700 } : { background:"var(--accent)" }}>
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