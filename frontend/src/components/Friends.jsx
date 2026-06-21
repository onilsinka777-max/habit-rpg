import { useEffect, useState } from "react";
import axios from "axios";
import Chat from "./Chat";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Friends({ token, showToast, askConfirm, myStreak }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [friends,    setFriends]    = useState([]);
  const [requests,   setRequests]   = useState([]);
  const [name,       setName]       = useState("");
  const [busy,       setBusy]       = useState(false);
  const [tab,        setTab]        = useState("friends");
  const [chatFriend, setChatFriend] = useState(null);

  const load = async () => {
    try {
      const [fr, rq] = await Promise.all([
        axios.get(`${API}/friends`, authHeaders),
        axios.get(`${API}/friends/requests`, authHeaders),
      ]);
      setFriends(fr.data);
      setRequests(rq.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const sendRequest = async () => {
    if (!name.trim()) return;
    try {
      setBusy(true);
      const res = await axios.post(`${API}/friends/request`, { name }, authHeaders);
      showToast(res.data.message, "success");
      setName("");
      await load();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(false); }
  };

  const accept = async (id) => {
    try {
      await axios.post(`${API}/friends/requests/${id}/accept`, {}, authHeaders);
      showToast("Заявка принята!", "success");
      await load();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  const decline = async (id) => {
    try {
      await axios.delete(`${API}/friends/requests/${id}`, authHeaders);
      showToast("Заявка отклонена", "success");
      await load();
    } catch (e) { showToast("Ошибка", "error"); }
  };

  const removeFriend = (friend) => {
    askConfirm({
      title: "Удалить из друзей?",
      text: `«${friend.name}» будет удалён из списка друзей.`,
      confirmLabel: "Удалить",
      onConfirm: async () => {
        try {
          await axios.delete(`${API}/friends/${friend.id}`, authHeaders);
          await load();
        } catch (e) { showToast("Ошибка", "error"); }
      },
    });
  };

  if (chatFriend) {
    return <Chat token={token} showToast={showToast} friend={chatFriend} onBack={() => setChatFriend(null)} />;
  }

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>🤝</span> Друзья</div>

      {/* Send request */}
      <div className="new-quest-form" style={{ marginBottom: 20 }}>
        <input
          className="input"
          placeholder="Ник игрока"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendRequest()}
        />
        <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={sendRequest}>
          {busy ? "..." : "Отправить заявку"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <button
          className={`branch-tab ${tab==="friends"?"active":""}`}
          style={tab==="friends"?{background:"#f472b6",boxShadow:"0 4px 12px rgba(244,114,182,0.3)"}:undefined}
          onClick={() => setTab("friends")}>
          Друзья {friends.length > 0 && `(${friends.length})`}
        </button>
        <button
          className={`branch-tab ${tab==="requests"?"active":""}`}
          style={tab==="requests"?{background:"#fb923c",boxShadow:"0 4px 12px rgba(251,146,60,0.3)"}:undefined}
          onClick={() => setTab("requests")}>
          Заявки {requests.length > 0 && (
            <span style={{ background:"#f87171", borderRadius:"50%", width:18, height:18, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:11, marginLeft:4 }}>
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {/* Friends list */}
      {tab === "friends" && (
        friends.length === 0 ? (
          <p className="empty-state">Нет друзей — отправь заявку выше.</p>
        ) : (
          <div className="quest-list">
            {friends.map(f => (
              <div key={f.id} className="quest-card" style={{ borderLeft:f.streak>(myStreak||0)?"3px solid #ef4444":undefined }}>
                <div className="quest-main">
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <h4 className="quest-title" style={{ margin:0 }}>{f.name}</h4>
                    {f.isOnline && <span title="В сети" style={{ width:8,height:8,borderRadius:"50%",background:"#34d399",display:"inline-block",flexShrink:0 }} />}
                  </div>
                  <div className="quest-meta">
                    <span>⚡ {f.level} уровень</span>
                    <span>💰 {f.gold}</span>
                    <span style={{ color:f.streak>(myStreak||0)?"#ef4444":"inherit" }}>🔥 {f.streak} дн.{f.streak>(myStreak||0)?" ↑":""}</span>
                    {f.clanName && <span>⚔️ {f.clanName}</span>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setChatFriend(f)}>💬</button>
                  <button className="btn btn-danger btn-sm" onClick={() => removeFriend(f)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Requests list */}
      {tab === "requests" && (
        requests.length === 0 ? (
          <p className="empty-state">Нет входящих заявок.</p>
        ) : (
          <div className="quest-list">
            {requests.map(r => (
              <div key={r.id} className="quest-card">
                <div className="quest-main">
                  <h4 className="quest-title">{r.name}</h4>
                  <div className="quest-meta">
                    <span>⚡ {r.level} уровень</span>
                  </div>
                </div>
                <div className="quest-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => accept(r.id)}>Принять</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => decline(r.id)}>Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </section>
  );
}