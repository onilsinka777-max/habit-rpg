import { useEffect, useState } from "react";
import axios from "axios";
import Chat from "./Chat";
import VoiceInput from "./VoiceInput";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Modals ────────────────────────────────────────────────────────────────────
function DuelModal({ friend, myGold, onClose, onSend }) {
  const [stake, setStake] = useState(100);
  const canSend = stake >= 50 && myGold >= stake && friend?.gold >= stake;
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,0.7)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }} onClick={onClose}>
      <div style={{
        background:"#0f0b1e", border:"1px solid #dc2626", borderRadius:20, padding:24,
        maxWidth:380, width:"100%", boxShadow:"0 0 40px rgba(220,38,38,0.3)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>⚔️</div>
          <div style={{ fontWeight:900, fontSize:18, color:"#f87171", marginBottom:6 }}>Дуэль стриков</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.6 }}>
            Вызвать <b style={{ color:"#f1f5f9" }}>{friend.name}</b> на дуэль?<br/>
            Кто первый прервёт стрик — проигрывает. Золото замораживается сразу.
          </div>
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:8 }}>СТАВКА (мин. 50 золота)</div>
          <input type="number" min={50} max={Math.min(myGold, friend?.gold || 0)} value={stake}
            onChange={e => setStake(Math.max(50, Number(e.target.value)))}
            style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(220,38,38,0.4)", borderRadius:10, padding:"10px 14px", color:"#f1f5f9", fontSize:16, fontWeight:700 }}
          />
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:6 }}>
            У тебя: {myGold}💰 · У {friend.name}: {friend.gold || "?"}💰
          </div>
        </div>
        <div style={{ background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"rgba(255,255,255,0.6)" }}>
          ⚔️ Ставка: <b style={{ color:"#f5b637" }}>{stake} золота</b> с каждого.<br/>
          Победитель получит: <b style={{ color:"#34d399" }}>{stake * 2} золота</b>
        </div>
        {!canSend && <div style={{ fontSize:12, color:"#ef4444", marginBottom:10 }}>
          {stake < 50 ? "Минимальная ставка 50 золота" : myGold < stake ? "Недостаточно золота у тебя" : "Недостаточно золота у соперника"}
        </div>}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:"12px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"rgba(255,255,255,0.5)", cursor:"pointer", fontWeight:700 }}>Отмена</button>
          <button onClick={() => onSend(stake)} disabled={!canSend} style={{
            flex:2, padding:"12px",
            background: canSend ? "linear-gradient(135deg,#dc2626,#991b1b)" : "rgba(255,255,255,0.05)",
            border:"none", borderRadius:10,
            color: canSend ? "#fff" : "rgba(255,255,255,0.3)",
            cursor: canSend ? "pointer" : "default", fontWeight:800, fontSize:14,
          }}>⚔️ Вызвать!</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Friends({ token, showToast, askConfirm, myStreak, myGold, onChessInvite, onViewProfile }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [friends,      setFriends]      = useState([]);
  const [requests,     setRequests]     = useState([]);
  const [duels,        setDuels]        = useState([]);
  const [sharedStreaks, setSharedStreaks] = useState([]);
  const [name,         setName]         = useState("");
  const [busy,         setBusy]         = useState(false);
  const [tab,          setTab]          = useState("friends");
  const [chatFriend,   setChatFriend]   = useState(null);
  const [duelTarget,   setDuelTarget]   = useState(null);

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

  const loadDuels = async () => {
    try {
      const [d, ss] = await Promise.all([
        axios.get(`${API}/streak-duels/active`, authHeaders).catch(() => ({ data: [] })),
        axios.get(`${API}/shared-streak/active`, authHeaders).catch(() => ({ data: [] })),
      ]);
      setDuels(d.data || []);
      setSharedStreaks(ss.data || []);
    } catch { /* silently ignore */ }
  };

  useEffect(() => { load(); loadDuels(); }, []);

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
    } catch { showToast("Ошибка", "error"); }
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
        } catch { showToast("Ошибка", "error"); }
      },
    });
  };

  const sendDuel = async (stake) => {
    if (!duelTarget) return;
    try {
      await axios.post(`${API}/streak-duels/challenge/${duelTarget.id}`, { stake }, authHeaders);
      showToast(`⚔️ Вызов отправлен ${duelTarget.name}!`, "success");
      setDuelTarget(null);
      loadDuels();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  const acceptDuel = async (id) => {
    try {
      await axios.post(`${API}/streak-duels/accept/${id}`, {}, authHeaders);
      showToast("⚔️ Дуэль принята!", "success");
      loadDuels();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  const declineDuel = async (id) => {
    try {
      await axios.post(`${API}/streak-duels/decline/${id}`, {}, authHeaders);
      showToast("Дуэль отклонена. Золото возвращено.", "success");
      loadDuels();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  const inviteSharedStreak = async (friendId, friendName) => {
    try {
      await axios.post(`${API}/shared-streak/invite/${friendId}`, {}, authHeaders);
      showToast(`🔥 Приглашение на совместный стрик отправлено ${friendName}!`, "success");
      loadDuels();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  const acceptSharedStreak = async (id) => {
    try {
      await axios.patch(`${API}/shared-streak/${id}/accept`, {}, authHeaders);
      showToast("🔥 Совместный стрик начат!", "success");
      loadDuels();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  const pendingDuels = duels.filter(d => d.status === "pending");
  const activeDuels  = duels.filter(d => d.status === "active");
  const pendingSS    = sharedStreaks.filter(s => s.status === "pending");
  const activeSS     = sharedStreaks.filter(s => s.status === "active");
  if (chatFriend) {
    return <Chat token={token} showToast={showToast} friend={chatFriend} onBack={() => setChatFriend(null)} />;
  }

  return (
    <section className="quest-section">
      {duelTarget && (
        <DuelModal
          friend={duelTarget}
          myGold={myGold || 0}
          onClose={() => setDuelTarget(null)}
          onSend={sendDuel}
        />
      )}

      <div className="section-eyebrow"><span>🤝</span> Друзья</div>

      {/* Send request */}
      <div className="new-quest-form" style={{ marginBottom: 20 }}>
        <VoiceInput onResult={text => setName(prev => (prev + text).trim())} size={14} />
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
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { key:"friends", label:"Друзья", badge: friends.length || 0 },
          { key:"duels",   label:"⚔️ Дуэли", badge: pendingDuels.length + pendingSS.length },
          { key:"requests", label:"Заявки", badge: requests.length },
        ].map(t => (
          <button key={t.key}
            className={`branch-tab ${tab===t.key?"active":""}`}
            style={tab===t.key?{background:"#8d8cf8",boxShadow:"0 4px 12px rgba(141,140,248,0.3)"}:undefined}
            onClick={() => setTab(t.key)}>
            {t.label}
            {t.badge > 0 && (
              <span style={{ background:"#ef4444", borderRadius:"50%", width:18, height:18, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:11, marginLeft:4, color:"#fff" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Friends tab ── */}
      {tab === "friends" && (
        friends.length === 0 ? (
          <p className="empty-state">Нет друзей — отправь заявку выше.</p>
        ) : (
          <div className="quest-list">
            {friends.map(f => {
              const sharedWithFriend = activeSS.find(s =>
                (s.user1Id === f.id || s.user2Id === f.id) ||
                (s.user1?.id === f.id || s.user2?.id === f.id)
              );
              const duelWithFriend = activeDuels.find(d =>
                d.challengerId === f.id || d.challengedId === f.id ||
                d.challenger?.id === f.id || d.challenged?.id === f.id
              );
              return (
                <div key={f.id} className="quest-card" style={{ borderLeft: f.streak > (myStreak||0) ? "3px solid #ef4444" : undefined }}>
                  <div className="quest-main">
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                      <h4 className="quest-title" style={{ margin:0 }}>{f.name}</h4>
                      {f.isOnline && <span title="В сети" style={{ width:8,height:8,borderRadius:"50%",background:"#34d399",display:"inline-block",flexShrink:0 }} />}
                      {sharedWithFriend && (
                        <span style={{ fontSize:11, background:"rgba(251,146,60,0.15)", color:"#fb923c", borderRadius:5, padding:"1px 7px" }}>
                          🔥 Стрик: {sharedWithFriend.streak}д
                        </span>
                      )}
                      {duelWithFriend && (
                        <span style={{ fontSize:11, background:"rgba(220,38,38,0.15)", color:"#f87171", borderRadius:5, padding:"1px 7px" }}>
                          ⚔️ Дуэль
                        </span>
                      )}
                    </div>
                    <div className="quest-meta">
                      <span>⚡ {f.level} уровень</span>
                      <span>💰 {f.gold}</span>
                      <span style={{ color:f.streak>(myStreak||0)?"#ef4444":"inherit" }}>🔥 {f.streak} дн.{f.streak>(myStreak||0)?" ↑":""}</span>
                      {f.clanName && <span>⚔️ {f.clanName}</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {onViewProfile && (
                      <button className="btn btn-ghost btn-sm" onClick={() => onViewProfile(f.id)} title="Профиль">👤</button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => setChatFriend(f)} title="Чат">💬</button>
                    {!duelWithFriend && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setDuelTarget(f)} title="Дуэль стриков" style={{ fontSize:13 }}>⚔️</button>
                    )}
                    {!sharedWithFriend && (
                      <button className="btn btn-ghost btn-sm" onClick={() => inviteSharedStreak(f.id, f.name)} title="Совместный стрик" style={{ fontSize:13 }}>🔥</button>
                    )}
                    {onChessInvite && (
                      <button className="btn btn-ghost btn-sm" title="Шахматы" style={{ fontSize:15 }}
                        onClick={async () => {
                          try {
                            const res = await axios.post(`${API}/chess/invite/${f.id}`, {}, authHeaders);
                            showToast(`♟ Вызов отправлен ${f.name || f.email}!`, "success");
                            onChessInvite(res.data.id);
                          } catch (e) {
                            const msg = e.response?.data?.message || "Ошибка";
                            const existingId = e.response?.data?.gameId;
                            if (existingId) { showToast("Открываю существующую игру", "info"); onChessInvite(existingId); }
                            else showToast(msg, "error");
                          }
                        }}>♟</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => removeFriend(f)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Duels tab ── */}
      {tab === "duels" && (
        <div>
          {/* Incoming duel requests */}
          {pendingDuels.filter(d => d.challengedId === undefined || d.challenged?.id !== undefined).map(d => {
            return (
              <div key={d.id} style={{
                background:"rgba(220,38,38,0.07)", border:"1px solid rgba(220,38,38,0.3)",
                borderRadius:14, padding:16, marginBottom:12,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <span style={{ fontSize:28 }}>⚔️</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:"#f87171" }}>
                      {d.status === "pending" ? "Вызов на дуэль стриков!" : "Активная дуэль"}
                    </div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>
                      {d.challenger?.name} ⚔️ {d.challenged?.name} · Ставка: {d.stake}💰
                    </div>
                  </div>
                </div>
                {d.status === "pending" && (
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="btn btn-primary btn-sm" style={{ background:"#dc2626" }} onClick={() => acceptDuel(d.id)}>Принять ⚔️</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => declineDuel(d.id)}>Отклонить</button>
                  </div>
                )}
                {d.status === "active" && (
                  <div style={{ display:"flex", gap:16 }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontWeight:700, fontSize:20 }}>🔥{d.challenger?.streak || "?"}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{d.challenger?.name}</div>
                    </div>
                    <div style={{ alignSelf:"center", fontSize:14, color:"rgba(255,255,255,0.4)" }}>vs</div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontWeight:700, fontSize:20 }}>🔥{d.challenged?.streak || "?"}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{d.challenged?.name}</div>
                    </div>
                    <div style={{ marginLeft:"auto", textAlign:"right" }}>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Ставка</div>
                      <div style={{ fontWeight:700, color:"#f5b637" }}>{d.stake}💰</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {activeDuels.map(d => (
            <div key={`act-${d.id}`} style={{
              background:"rgba(220,38,38,0.07)", border:"1px solid rgba(220,38,38,0.3)",
              borderRadius:14, padding:16, marginBottom:12,
            }}>
              <div style={{ fontSize:12, color:"#f87171", fontWeight:700, marginBottom:8 }}>⚔️ АКТИВНАЯ ДУЭЛЬ</div>
              <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:700, fontSize:22 }}>🔥{d.challenger?.streak || "?"}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{d.challenger?.name}</div>
                </div>
                <div style={{ color:"rgba(255,255,255,0.4)" }}>⚔️</div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:700, fontSize:22 }}>🔥{d.challenged?.streak || "?"}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{d.challenged?.name}</div>
                </div>
                <div style={{ marginLeft:"auto" }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Ставка</div>
                  <div style={{ fontWeight:700, color:"#f5b637" }}>{d.stake}💰</div>
                </div>
              </div>
            </div>
          ))}

          {/* Shared streaks */}
          {(pendingSS.length > 0 || activeSS.length > 0) && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:1, marginBottom:10 }}>
                СОВМЕСТНЫЕ СТРИКИ
              </div>
              {pendingSS.map(s => (
                <div key={`ss-${s.id}`} style={{
                  background:"rgba(251,146,60,0.07)", border:"1px solid rgba(251,146,60,0.25)",
                  borderRadius:14, padding:14, marginBottom:10,
                }}>
                  <div style={{ fontWeight:700, color:"#fb923c", marginBottom:8 }}>🔥 Приглашение на совместный стрик</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginBottom:10 }}>
                    {s.user1?.name} + {s.user2?.name}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="btn btn-primary btn-sm" style={{ background:"#f97316" }} onClick={() => acceptSharedStreak(s.id)}>Принять 🔥</button>
                  </div>
                </div>
              ))}
              {activeSS.map(s => (
                <div key={`ssa-${s.id}`} style={{
                  background:"rgba(251,146,60,0.07)", border:"1px solid rgba(251,146,60,0.25)",
                  borderRadius:14, padding:14, marginBottom:10,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:700, color:"#fb923c" }}>🔥 Совместный стрик</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginTop:2 }}>
                        {s.user1?.name} + {s.user2?.name}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:900, fontSize:28, color:"#fb923c" }}>{s.streak}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>дней</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {duels.length === 0 && sharedStreaks.length === 0 && (
            <p className="empty-state">Нет активных дуэлей.<br/>Нажми ⚔️ рядом с другом чтобы вызвать его.</p>
          )}
        </div>
      )}

      {/* ── Requests tab ── */}
      {tab === "requests" && (
        requests.length === 0 ? (
          <p className="empty-state">Нет входящих заявок.</p>
        ) : (
          <div className="quest-list">
            {requests.map(r => (
              <div key={r.id} className="quest-card">
                <div className="quest-main">
                  <h4 className="quest-title">{r.name}</h4>
                  <div className="quest-meta"><span>⚡ {r.level} уровень</span></div>
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
