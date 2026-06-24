import { useEffect, useRef, useState } from "react";
import axios from "axios";
import VoiceInput from "./VoiceInput";
import LockedFeature from "./LockedFeature";
import WeeklyBoss from "./WeeklyBoss";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BANNER_ICONS = ["🏋️", "📚", "💡", "⏰", "🎯", "🔥", "🧠", "📈", "⏱️", "🥇"];
const BANNER_COLORS = ["#fb923c", "#8d8cf8", "#fb7878", "#34d399", "#38bdf8", "#f5b637", "#f472b6", "#22d3ee"];

const ROLE_META = {
  leader: { label: "Лидер", icon: "👑" },
  co_leader: { label: "Соруководитель", icon: "⭐" },
  member: { label: "Участник", icon: "" },
};

function formatLastActive(isOnline, lastActiveAt) {
  if (isOnline) return "в сети";
  if (!lastActiveAt) return "давно не заходил(а)";

  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `был(а) ${minutes} мин назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `был(а) ${hours} ч назад`;

  const days = Math.floor(hours / 24);
  return `был(а) ${days} дн назад`;
}

export default function Clan({ token, showToast, askConfirm, currentUserId, myLevel, onViewProfile }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [clanInfo, setClanInfo] = useState(null);
  const [clanList, setClanList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [newClanName, setNewClanName] = useState("");
  const [newClanDesc, setNewClanDesc] = useState("");
  const [bannerIcon, setBannerIcon] = useState(BANNER_ICONS[0]);
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[0]);

  const [newMessage, setNewMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const pollRef = useRef(null);
  const chatEndRef = useRef(null);

  const loadClanInfo = async () => {
    try {
      const res = await axios.get(`${API}/clans/me`, authHeaders);
      setClanInfo(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadClanList = async () => {
    try {
      const res = await axios.get(`${API}/clans`, authHeaders);
      setClanList(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await axios.get(`${API}/clans/leaderboard`, authHeaders);
      setLeaderboard(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await axios.get(`${API}/clans/me/messages`, authHeaders);
      setMessages(res.data);
    } catch (e) {
      // молча игнорируем — например если только что вышли из клана
    }
  };

  useEffect(() => {
    if (myLevel < 10) return;
    loadClanInfo();
    loadClanList();
    loadLeaderboard();
  }, []);

  useEffect(() => {
    if (clanInfo?.clan) {
      loadMessages();
      pollRef.current = setInterval(() => {
        loadMessages();
        loadClanInfo();
      }, 4000);
      return () => clearInterval(pollRef.current);
    }
  }, [clanInfo?.clan?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createClan = async () => {
    if (!newClanName.trim()) return;
    try {
      setBusy(true);
      await axios.post(
        `${API}/clans`,
        { name: newClanName.trim(), description: newClanDesc.trim(), bannerIcon, bannerColor },
        authHeaders
      );
      setNewClanName("");
      setNewClanDesc("");
      await loadClanInfo();
      await loadClanList();
    } catch (e) {
      showToast(e.response?.data?.message || "Не удалось создать клан", "error");
    } finally {
      setBusy(false);
    }
  };

  const joinClan = async (id) => {
    try {
      setBusy(true);
      await axios.post(`${API}/clans/${id}/join`, {}, authHeaders);
      await loadClanInfo();
    } catch (e) {
      showToast(e.response?.data?.message || "Не удалось вступить", "error");
    } finally {
      setBusy(false);
    }
  };

  const doLeaveClan = async () => {
    try {
      setBusy(true);
      await axios.post(`${API}/clans/leave`, {}, authHeaders);
      setMessages([]);
      await loadClanInfo();
      await loadClanList();
      await loadLeaderboard();
    } catch (e) {
      showToast(e.response?.data?.message || "Не удалось выйти", "error");
    } finally {
      setBusy(false);
    }
  };

  const leaveClan = () => {
    askConfirm({
      title: "Покинуть клан?",
      text: "Ты потеряешь доступ к чату и таблице лидеров этого клана.",
      confirmLabel: "Покинуть",
      onConfirm: doLeaveClan,
    });
  };

  const changeRole = async (memberId, role) => {
    try {
      await axios.patch(`${API}/clans/members/${memberId}/role`, { role }, authHeaders);
      await loadClanInfo();
    } catch (e) {
      showToast(e.response?.data?.message || "Не удалось изменить роль", "error");
    }
  };

  const doKick = async (memberId) => {
    try {
      await axios.delete(`${API}/clans/members/${memberId}`, authHeaders);
      await loadClanInfo();
    } catch (e) {
      showToast(e.response?.data?.message || "Не удалось исключить", "error");
    }
  };

  const kickMember = (member) => {
    askConfirm({
      title: "Исключить из клана?",
      text: `${member.name} больше не будет в этом клане.`,
      confirmLabel: "Исключить",
      onConfirm: () => doKick(member.id),
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await axios.post(`${API}/clans/me/messages`, { text: newMessage.trim() }, authHeaders);
      setNewMessage("");
      await loadMessages();
    } catch (e) {
      showToast(e.response?.data?.message || "Не удалось отправить", "error");
    }
  };

  const renderLeaderboard = () => (
    <section className="quest-section">
      <div
        className="section-eyebrow"
        style={{ cursor: "pointer" }}
        onClick={() => setShowLeaderboard((v) => !v)}
      >
        <span>🏆</span> Рейтинг кланов {showLeaderboard ? "▲" : "▼"}
      </div>

      {showLeaderboard && (
        leaderboard.length === 0 ? (
          <p className="empty-state">Пока нет кланов с участниками для рейтинга.</p>
        ) : (
          <div className="clan-leaderboard">
            {leaderboard.map((c, i) => (
              <div className="clan-row" key={c.id}>
                <span className="clan-rank">#{i + 1}</span>
                <div className="clan-row-main">
                  <span className="clan-card-banner" style={{ background: c.bannerColor, width: 28, height: 28, fontSize: 14 }}>
                    {c.bannerIcon}
                  </span>
                  <span className="clan-name">{c.name}</span>
                  <span className="clan-tag">#{c.tag}</span>
                </div>
                <span className="clan-stat">👥 {c.memberCount}</span>
                <span className="clan-stat">~{c.avgXp} XP</span>
              </div>
            ))}
          </div>
        )
      )}
    </section>
  );

  if (myLevel < 10) {
    return (
      <LockedFeature requiredLevel={10} currentLevel={myLevel} icon="🏰" title="Кланы" description="Создай клан или вступи в существующий. Вместе сильнее." />
    );
  }

  if (!clanInfo) {
    return <p className="empty-state">Загрузка...</p>;
  }

  if (!clanInfo.clan) {
    const filteredClans = clanList.filter((c) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q.replace("#", ""))
      );
    });

    return (
      <>
        {renderLeaderboard()}

        <section className="quest-section">
          <div className="section-eyebrow">
            <span>⚔️</span> Кланы
          </div>

          <div className="banner-picker">
            <p className="category-label" style={{ margin: 0 }}>Баннер клана</p>
            <div className="banner-picker-row">
              {BANNER_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`banner-icon-option ${bannerIcon === icon ? "selected" : ""}`}
                  onClick={() => setBannerIcon(icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="banner-picker-row">
              {BANNER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`banner-color-option ${bannerColor === color ? "selected" : ""}`}
                  style={{ background: color }}
                  onClick={() => setBannerColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="new-quest-form" style={{ marginBottom: 24, flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="Название нового клана"
              value={newClanName}
              onChange={(e) => setNewClanName(e.target.value)}
            />
            <input
              className="input"
              placeholder="Тема / описание (необязательно)"
              value={newClanDesc}
              onChange={(e) => setNewClanDesc(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy} onClick={createClan}>
              Создать клан
            </button>
          </div>

          <input
            className="input clan-search"
            placeholder="Поиск по названию или тегу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <p className="category-label">Существующие кланы</p>

          {filteredClans.length === 0 ? (
            <p className="empty-state">Ничего не найдено.</p>
          ) : (
            <div className="shop-grid">
              {filteredClans.map((c) => (
                <div className="shop-card" key={c.id}>
                  <div
                    className="clan-card-banner"
                    style={{ background: c.bannerColor }}
                  >
                    {c.bannerIcon}
                  </div>
                  <h4 className="shop-card-title">{c.name}</h4>
                  <p className="clan-tag">#{c.tag}</p>
                  <p className="shop-card-desc">{c.description || "Без описания"}</p>
                  <div className="shop-card-footer">
                    <span className="shop-price">👥 {c.memberCount}</span>
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => joinClan(c.id)}>
                      Вступить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </>
    );
  }

  const myRole = clanInfo.myRole;
  const canManage = myRole === "leader" || myRole === "co_leader";

  return (
    <>
      {renderLeaderboard()}

      <section className="quest-section">
        <div className="clan-header-row">
          <div className="clan-banner" style={{ background: clanInfo.clan.bannerColor }}>
            {clanInfo.clan.bannerIcon}
          </div>
          <div className="clan-header-text">
            <div className="clan-title-row">
              <h3 style={{ margin: 0 }}>{clanInfo.clan.name}</h3>
              <span className="clan-tag">#{clanInfo.clan.tag}</span>
            </div>
            <p className="empty-state" style={{ margin: "4px 0 0" }}>
              {clanInfo.clan.description || "Без описания"}
            </p>
          </div>
        </div>

        <div className="clan-leaderboard">
          {clanInfo.members.map((m, i) => {
            const role = ROLE_META[m.clanRole] || ROLE_META.member;
            const isSelf = m.id === currentUserId;

            return (
              <div className="clan-row" key={m.id}>
                <span className="clan-rank">#{i + 1}</span>

                <div className="clan-row-main">
                  <span className={`activity-dot ${m.isOnline ? "online" : ""}`} title={formatLastActive(m.isOnline, m.lastActiveAt)} />
                  <span
                    className="clan-name"
                    style={{ cursor: onViewProfile ? "pointer" : "default", textDecoration: onViewProfile ? "underline" : "none", textDecorationColor: "rgba(141,140,248,0.4)" }}
                    onClick={() => onViewProfile && onViewProfile(m.id)}
                  >{m.name}</span>
                  {role.label !== "Участник" && (
                    <span className="role-badge">{role.icon} {role.label}</span>
                  )}
                </div>

                <span className="clan-stat">Ур. {m.level}</span>
                <span className="clan-stat">{m.xp} XP</span>
                <span className="clan-stat">💰 {m.gold}</span>

                {!isSelf && canManage && m.clanRole !== "leader" && (
                  <div className="clan-row-actions">
                    {myRole === "leader" && m.clanRole !== "co_leader" && (
                      <button className="btn btn-ghost btn-sm" onClick={() => changeRole(m.id, "co_leader")}>
                        Повысить
                      </button>
                    )}
                    {myRole === "leader" && m.clanRole === "co_leader" && (
                      <button className="btn btn-ghost btn-sm" onClick={() => changeRole(m.id, "member")}>
                        Понизить
                      </button>
                    )}
                    {!(myRole === "co_leader" && m.clanRole === "co_leader") && (
                      <button className="btn btn-danger btn-sm" onClick={() => kickMember(m)}>
                        Исключить
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button className="btn btn-danger btn-sm" style={{ marginTop: 16 }} disabled={busy} onClick={leaveClan}>
          Покинуть клан
        </button>
      </section>

      <section className="quest-section">
        <div className="section-eyebrow"><span>👹</span> Босс недели</div>
        <WeeklyBoss token={token} showToast={showToast} />
      </section>

      <section className="quest-section">
        <div className="section-eyebrow">
          <span>💬</span> Чат клана
        </div>

        <div className="clan-chat">
          {messages.length === 0 ? (
            <p className="empty-state">Сообщений пока нет — напиши первым.</p>
          ) : (
            messages.map((m) => {
              const isOwn = m.userId === currentUserId;
              return (
                <div className={`chat-bubble-wrap ${isOwn ? "own" : "other"}`} key={m.id}>
                  {!isOwn && <p className="chat-bubble-author">{m.author}</p>}
                  <div className="chat-bubble">{m.text}</div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="new-quest-form">
          <VoiceInput onResult={text => setNewMessage(prev => prev + text)} />
          <input
            className="input"
            placeholder="Написать в чат..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button className="btn btn-primary" onClick={sendMessage}>
            Отправить
          </button>
        </div>
      </section>
    </>
  );
}