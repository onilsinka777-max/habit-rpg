import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://habit-rpg-production.up.railway.app";

export default function Friends({ token, showToast, askConfirm }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [friends, setFriends] = useState([]);
  const [nickInput, setNickInput] = useState("");
  const [busy, setBusy] = useState(false);

  const loadFriends = async () => {
    try {
      const res = await axios.get(`${API}/friends`, authHeaders);
      setFriends(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const addFriend = async () => {
    if (!nickInput.trim()) return;
    try {
      setBusy(true);
      await axios.post(`${API}/friends`, { name: nickInput.trim() }, authHeaders);
      setNickInput("");
      await loadFriends();
      showToast("Друг добавлен", "success");
    } catch (e) {
      showToast(e.response?.data?.message || "Не удалось добавить", "error");
    } finally {
      setBusy(false);
    }
  };

  const doRemoveFriend = async (id) => {
    try {
      await axios.delete(`${API}/friends/${id}`, authHeaders);
      await loadFriends();
    } catch (e) {
      showToast(e.response?.data?.message || "Не удалось удалить", "error");
    }
  };

  const removeFriend = (friend) => {
    askConfirm({
      title: "Удалить из друзей?",
      text: `${friend.name} больше не будет в твоём списке друзей.`,
      confirmLabel: "Удалить",
      onConfirm: () => doRemoveFriend(friend.id),
    });
  };

  return (
    <section className="quest-section">
      <div className="section-eyebrow">
        <span>🤝</span> Друзья
      </div>

      <div className="new-quest-form">
        <input
          className="input"
          placeholder="Ник друга"
          value={nickInput}
          onChange={(e) => setNickInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFriend()}
        />
        <button className="btn btn-primary" disabled={busy} onClick={addFriend}>
          Добавить
        </button>
      </div>

      {friends.length === 0 ? (
        <p className="empty-state">Пока никого не добавил — введи ник друга выше.</p>
      ) : (
        <div className="friends-list">
          {friends.map((f) => (
            <div className="friend-row" key={f.id}>
              <div>
                <p className="friend-name">{f.name}</p>
                <p className="friend-sub">
                  Ур. {f.level}
                  {f.clanName ? ` · клан «${f.clanName}»` : " · без клана"}
                </p>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => removeFriend(f)}>
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}