import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const PIECES = {
  K:"♔", Q:"♕", R:"♖", B:"♗", N:"♘", P:"♙",
  k:"♚", q:"♛", r:"♜", b:"♝", n:"♞", p:"♟",
};

const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["8","7","6","5","4","3","2","1"];

function isWhite(p) { return p && p === p.toUpperCase(); }
function isBlack(p) { return p && p !== p.toUpperCase(); }

function parseBoard(boardState) {
  try { return JSON.parse(boardState); } catch { return null; }
}

function getLegalMoves(board, row, col, whiteTurn) {
  const piece = board[row][col];
  if (!piece) return [];
  if (whiteTurn && !isWhite(piece)) return [];
  if (!whiteTurn && !isBlack(piece)) return [];

  const moves = [];
  const friendly = isWhite(piece) ? isWhite : isBlack;
  const enemy    = isWhite(piece) ? isBlack : isWhite;
  const type     = piece.toLowerCase();

  const addMove = (r, c) => {
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    if (friendly(board[r][c])) return false;
    moves.push([r, c]);
    return !board[r][c];
  };
  const ray = (dr, dc) => {
    let r = row + dr, c = col + dc;
    while (r >= 0 && r <= 7 && c >= 0 && c <= 7) { if (!addMove(r, c)) break; r += dr; c += dc; }
  };

  if (type === "p") {
    const dir = isWhite(piece) ? -1 : 1;
    const start = isWhite(piece) ? 6 : 1;
    if (!board[row + dir]?.[col]) {
      moves.push([row + dir, col]);
      if (row === start && !board[row + dir * 2]?.[col]) moves.push([row + dir * 2, col]);
    }
    [-1, 1].forEach(dc => { if (enemy(board[row + dir]?.[col + dc])) moves.push([row + dir, col + dc]); });
  } else if (type === "r") { [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => ray(dr,dc)); }
    else if (type === "b") { [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => ray(dr,dc)); }
    else if (type === "q") { [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => ray(dr,dc)); }
    else if (type === "n") { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => addMove(row+dr,col+dc)); }
    else if (type === "k") { [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => addMove(row+dr,col+dc)); }

  return moves;
}

function PlayerAvatar({ user, size = 44 }) {
  const [err, setErr] = useState(false);
  const name = user?.name || user?.email?.split("@")[0] || "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#7c3aed,#4c1d95)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 900, color: "#fff",
      border: "2px solid rgba(124,58,237,0.5)", flexShrink: 0,
    }}>
      {name[0].toUpperCase()}
    </div>
  );
}

function LaptevAvatar({ size = 44 }) {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#7c3aed,#1e1b4b)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 900, color: "#c4b5fd",
      border: "2px solid #7c3aed", flexShrink: 0,
    }}>L</div>
  );
  return (
    <img src="/images/laptev.jpg" alt="LAPTEV" onError={() => setErr(true)} style={{
      width: size, height: size, borderRadius: "50%",
      border: "2px solid #7c3aed", objectFit: "cover", flexShrink: 0,
      boxShadow: "0 0 12px rgba(124,58,237,0.6)",
    }} />
  );
}

export default function Chess({ token, showToast, gameId: initialGameId }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const [game,       setGame]       = useState(null);
  const [board,      setBoard]      = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [myColor,    setMyColor]    = useState(null);
  const [userId,     setUserId]     = useState(null);
  const [userInfo,   setUserInfo]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [gameId,     setGameId]     = useState(initialGameId || null);
  const [myGames,    setMyGames]    = useState([]);
  const [moveHistory,setMoveHistory]= useState([]);
  const socketRef   = useRef(null);
  const historyEndRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/me`, auth).then(r => {
      setUserId(r.data.id);
      setUserInfo(r.data);
    }).catch(() => {});
  }, []);

  const loadGame = useCallback(async (id) => {
    try {
      const res = await axios.get(`${API}/chess/game/${id}`, auth);
      const g = res.data;
      setGame(g);
      setBoard(parseBoard(g.boardState));
      try { setMoveHistory(JSON.parse(g.moves || "[]")); } catch {}
      if (userId) setMyColor(g.player1Id === userId ? "white" : "black");
    } catch { showToast("Не удалось загрузить игру", "error"); }
  }, [userId]);

  // Socket.io setup for real-time play
  useEffect(() => {
    if (!gameId || !userId) return;
    const socket = io(API, { transports: ["websocket","polling"] });
    socketRef.current = socket;
    socket.emit("chess:join", { gameId, userId });

    socket.on("chess:move", ({ boardState, from, to }) => {
      const b = parseBoard(boardState);
      if (b) setBoard(b);
      const notation = `${FILES[from[1]]}${RANKS[from[0]]}-${FILES[to[1]]}${RANKS[to[0]]}`;
      setMoveHistory(prev => [...prev, notation]);
      setGame(prev => prev ? { ...prev, boardState, currentTurn: prev.currentTurn === 1 ? 2 : 1 } : prev);
    });
    socket.on("chess:resigned", ({ userId: rId }) => {
      if (rId !== userId) showToast("🏆 Соперник сдался! Вы победили!", "success");
      setGame(prev => prev ? { ...prev, status: "finished" } : prev);
    });
    socket.on("chess:opponent_disconnected", () => {
      showToast("Соперник отключился", "error");
    });
    return () => socket.disconnect();
  }, [gameId, userId]);

  useEffect(() => {
    if (gameId && userId) { loadGame(gameId); setLoading(false); }
    else { axios.get(`${API}/chess/my-games`, auth).then(r => { setMyGames(r.data); setLoading(false); }).catch(() => setLoading(false)); }
  }, [gameId, userId]);

  // Poll for opponent moves (fallback when socket misses)
  useEffect(() => {
    if (!gameId || !game || game.status !== "active") return;
    const t = setInterval(() => loadGame(gameId), 5000);
    return () => clearInterval(t);
  }, [gameId, game?.currentTurn, game?.status]);

  useEffect(() => { historyEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [moveHistory]);

  const handleClick = async (r, c) => {
    if (!board || game?.status !== "active") return;
    const whiteTurn = game.currentTurn === 1;
    const myIsWhite = myColor === "white";
    if (whiteTurn !== myIsWhite) { showToast("Сейчас ход соперника", "info"); return; }

    if (selected) {
      const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c);
      if (isLegal) {
        const newBoard = board.map(row => [...row]);
        const captured = newBoard[r][c];
        let piece = newBoard[selected[0]][selected[1]];
        if (piece === "P" && r === 0) piece = "Q";
        if (piece === "p" && r === 7) piece = "q";
        newBoard[r][c] = piece;
        newBoard[selected[0]][selected[1]] = null;

        const boardState = JSON.stringify(newBoard);
        const status = (captured === "k" || captured === "K") ? "finished" : "active";
        const myNum  = myColor === "white" ? "1" : "2";
        const result = status === "finished" ? myNum : undefined;
        const from   = [selected[0], selected[1]];
        const to     = [r, c];
        const notation = `${FILES[from[1]]}${RANKS[from[0]]}-${FILES[to[1]]}${RANKS[to[0]]}`;

        try {
          const res = await axios.post(`${API}/chess/game/${gameId}/move`, { boardState, from, to, status, result }, auth);
          setGame(res.data);
          setBoard(parseBoard(res.data.boardState));
          setMoveHistory(prev => [...prev, notation]);
          socketRef.current?.emit("chess:move", { gameId, from, to, boardState, userId });
          if (status === "finished") showToast("🏆 Победа! +15 XP", "success");
        } catch (e) { showToast(e.response?.data?.message || "Ошибка хода", "error"); }

        setSelected(null); setLegalMoves([]);
      } else {
        const piece = board[r][c];
        if (piece && ((myIsWhite && isWhite(piece)) || (!myIsWhite && isBlack(piece)))) {
          setSelected([r, c]);
          setLegalMoves(getLegalMoves(board, r, c, myIsWhite));
        } else { setSelected(null); setLegalMoves([]); }
      }
    } else {
      const piece = board[r][c];
      if (!piece) return;
      if (myIsWhite && !isWhite(piece)) return;
      if (!myIsWhite && !isBlack(piece)) return;
      setSelected([r, c]);
      setLegalMoves(getLegalMoves(board, r, c, myIsWhite));
    }
  };

  const resign = async () => {
    if (!gameId || game?.status !== "active") return;
    try {
      await axios.post(`${API}/chess/game/${gameId}/resign`, {}, auth);
      socketRef.current?.emit("chess:resign", { gameId, userId });
      showToast("Вы сдались", "info");
      setGame(prev => prev ? { ...prev, status: "finished" } : prev);
    } catch { showToast("Ошибка", "error"); }
  };

  if (loading) return <p className="empty-state">Загрузка...</p>;

  // ── Список игр ────────────────────────────────────────────────────────────
  if (!gameId) {
    return (
      <section className="quest-section">
        <style>{`@keyframes cPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
        <div className="section-eyebrow"><span>♟️</span> Шахматы</div>

        {myGames.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 20px" }}>
            <div style={{ fontSize:56, marginBottom:14 }}>♟️</div>
            <p style={{ color:"rgba(255,255,255,0.45)", fontSize:15, marginBottom:6 }}>Нет активных игр</p>
            <p style={{ color:"rgba(255,255,255,0.25)", fontSize:12 }}>Пригласи друга через кнопку ♟ в разделе Друзья</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {myGames.map(g => {
              const opp = g.player1Id === userId ? g.player2 : g.player1;
              const myC = g.player1Id === userId ? "♔ Белые" : "♚ Чёрные";
              const myTurn = (g.player1Id === userId && g.currentTurn === 1) || (g.player2Id === userId && g.currentTurn === 2);
              return (
                <button key={g.id} onClick={() => setGameId(g.id)} style={{
                  background:"linear-gradient(135deg,rgba(124,58,237,0.1),rgba(13,11,30,0.97))",
                  border:"1px solid rgba(124,58,237,0.3)", borderRadius:14,
                  padding:"14px 18px", textAlign:"left", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:14, color:"#e2e8f0",
                  boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
                }}>
                  <span style={{ fontSize:30 }}>♟️</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>vs {opp?.name || opp?.email?.split("@")[0]}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Я: {myC}</div>
                  </div>
                  <div style={{
                    fontSize:11, fontWeight:700,
                    color: g.status === "finished" ? "rgba(255,255,255,0.25)" : myTurn ? "#34d399" : "#f5b637",
                    animation: myTurn && g.status === "active" ? "cPulse 1.5s infinite" : "none",
                  }}>
                    {g.status === "finished" ? "✅ Завершена" : myTurn ? "🟢 Ваш ход" : "⏳ Ход соперника"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  if (!game || !board) return <p className="empty-state">Загрузка игры...</p>;

  const opp = game.player1Id === userId ? game.player2 : game.player1;
  const isMyTurn = (myColor === "white" && game.currentTurn === 1) || (myColor === "black" && game.currentTurn === 2);
  const oppRating = game.player1Id === userId ? (game.player2Rating || 1000) : (game.player1Rating || 1000);

  return (
    <section className="quest-section" style={{ padding:"0 0 80px" }}>
      <style>{`
        @keyframes turnGlow {
          0%,100% { box-shadow:0 0 0 rgba(52,211,153,0); }
          50%      { box-shadow:0 0 16px rgba(52,211,153,0.45); }
        }
        @keyframes cPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .c-cell { width:64px; height:64px; }
        .c-piece { font-size:44px; }
        @media(max-width:560px) {
          .c-cell  { width:44px; height:44px; }
          .c-piece { font-size:30px; }
        }
        .c-cell:hover .c-piece { transform:scale(1.08); }
        .c-piece { display:block; line-height:1; transition:transform 0.1s; user-select:none; }
      `}</style>

      {/* Back */}
      <button onClick={() => { setGameId(null); setGame(null); socketRef.current?.disconnect(); }}
        style={{ background:"none", border:"none", color:"rgba(255,255,255,0.45)", cursor:"pointer",
          fontSize:13, display:"flex", alignItems:"center", gap:6, padding:"12px 16px 4px" }}>
        ← Все партии
      </button>

      {/* VS Header */}
      <div style={{
        margin:"8px 16px 16px",
        background:"linear-gradient(135deg,rgba(10,8,24,0.98),rgba(28,22,64,0.95))",
        border:"1px solid rgba(124,58,237,0.45)",
        borderRadius:16, padding:"14px 18px",
        display:"flex", alignItems:"center", gap:10,
        boxShadow:"0 4px 30px rgba(0,0,0,0.5)",
      }}>
        {/* Me */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
          <PlayerAvatar user={userInfo} size={44} />
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#e2e8f0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {userInfo?.name || "Вы"}
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:1 }}>
              {myColor === "white" ? "♔ Белые" : "♚ Чёрные"} · {userInfo?.chessRating || 1000}
            </div>
          </div>
        </div>

        <div style={{ fontWeight:900, fontSize:14, color:"rgba(255,255,255,0.2)", letterSpacing:3, flexShrink:0 }}>VS</div>

        {/* Opponent */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0, justifyContent:"flex-end" }}>
          <div style={{ textAlign:"right", minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#e2e8f0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {opp?.name || opp?.email?.split("@")[0] || "Соперник"}
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:1 }}>
              {myColor === "white" ? "♚ Чёрные" : "♔ Белые"} · {oppRating}
            </div>
          </div>
          <LaptevAvatar size={44} />
        </div>
      </div>

      {/* Board + History */}
      <div style={{ display:"flex", gap:12, padding:"0 16px", alignItems:"flex-start" }}>

        {/* Coordinates + Board */}
        <div style={{ flexShrink:0 }}>
          <div style={{ display:"flex" }}>
            {/* Rank numbers */}
            <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-around", paddingRight:4, paddingTop:18 }}>
              {RANKS.map(rank => (
                <div key={rank} className="c-cell" style={{
                  fontSize:10, color:"rgba(255,255,255,0.3)", fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  height:64,
                }}>{rank}</div>
              ))}
            </div>

            <div>
              {/* File letters top */}
              <div style={{ display:"flex", marginBottom:3, paddingLeft:0 }}>
                {FILES.map(f => (
                  <div key={f} className="c-cell" style={{
                    fontSize:10, color:"rgba(255,255,255,0.3)", fontWeight:700,
                    display:"flex", alignItems:"center", justifyContent:"center", height:16,
                  }}>{f}</div>
                ))}
              </div>

              {/* Board grid */}
              <div style={{
                display:"grid", gridTemplateColumns:"repeat(8,auto)",
                border:"3px solid #7c3aed", borderRadius:6, overflow:"hidden",
                boxShadow:"0 0 30px rgba(124,58,237,0.5)",
              }}>
                {board.map((row, r) => row.map((piece, c) => {
                  const isLight    = (r + c) % 2 === 0;
                  const isSel      = selected?.[0] === r && selected?.[1] === c;
                  const isLegalMv  = legalMoves.some(([lr, lc]) => lr === r && lc === c);

                  let bg = isLight ? "#c8b8e8" : "#4a3570";
                  if (isSel) bg = "rgba(245,182,55,0.55)";

                  return (
                    <div key={`${r}-${c}`} className="c-cell"
                      onClick={() => handleClick(r, c)}
                      style={{
                        background: bg, position:"relative",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        cursor:"pointer",
                        transition:"filter 0.08s",
                      }}
                    >
                      {/* Legal move dot / ring */}
                      {isLegalMv && !piece && (
                        <div style={{
                          width:12, height:12, borderRadius:"50%",
                          background:"#34d399", opacity:0.8,
                          pointerEvents:"none",
                        }} />
                      )}
                      {isLegalMv && piece && (
                        <div style={{
                          position:"absolute", inset:2, border:"3px solid #34d399",
                          borderRadius:4, opacity:0.75, pointerEvents:"none",
                        }} />
                      )}

                      {/* Piece */}
                      {piece && (
                        <span className="c-piece" style={{
                          color: isWhite(piece) ? "#ffffff" : "#1a0a2e",
                          textShadow: isWhite(piece)
                            ? "0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(255,255,255,0.3)"
                            : "0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(124,58,237,0.5)",
                          position:"relative", zIndex:1,
                        }}>
                          {PIECES[piece]}
                        </span>
                      )}
                    </div>
                  );
                }))}
              </div>

              {/* File letters bottom */}
              <div style={{ display:"flex", marginTop:3 }}>
                {FILES.map(f => (
                  <div key={f} className="c-cell" style={{
                    fontSize:10, color:"rgba(255,255,255,0.3)", fontWeight:700,
                    display:"flex", alignItems:"center", justifyContent:"center", height:16,
                  }}>{f}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Move history */}
        <div style={{
          flex:1, minWidth:0,
          background:"rgba(255,255,255,0.03)",
          border:"1px solid rgba(124,58,237,0.2)",
          borderRadius:12, overflow:"hidden",
          display:"flex", flexDirection:"column",
          maxHeight:400,
        }}>
          <div style={{
            padding:"8px 12px", fontSize:10, fontWeight:800,
            color:"rgba(255,255,255,0.3)", letterSpacing:1.5,
            borderBottom:"1px solid rgba(255,255,255,0.06)",
          }}>ПАРТИЯ</div>
          <div style={{ flex:1, overflowY:"auto", padding:"6px 8px" }}>
            {moveHistory.length === 0 ? (
              <p style={{ fontSize:11, color:"rgba(255,255,255,0.2)", padding:"8px 4px", margin:0 }}>Ходов ещё нет</p>
            ) : (
              moveHistory.map((mv, i) => (
                <div key={i} style={{
                  display:"flex", gap:6, alignItems:"center",
                  padding:"3px 4px", borderRadius:5,
                  background: i === moveHistory.length - 1 ? "rgba(124,58,237,0.18)" : "transparent",
                }}>
                  {i % 2 === 0 && (
                    <span style={{ fontSize:9, color:"rgba(255,255,255,0.2)", width:16, textAlign:"right", flexShrink:0 }}>
                      {Math.floor(i/2)+1}.
                    </span>
                  )}
                  <span style={{ fontSize:12, fontFamily:"monospace", color: i % 2 === 0 ? "rgba(255,255,255,0.75)" : "rgba(200,184,232,0.75)" }}>
                    {mv}
                  </span>
                </div>
              ))
            )}
            <div ref={historyEndRef} />
          </div>
        </div>
      </div>

      {/* Turn indicator + Resign */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, margin:"14px 16px 0" }}>
        <div style={{
          display:"flex", alignItems:"center", gap:10, flex:1,
          background: game.status !== "active"
            ? "rgba(255,255,255,0.04)"
            : isMyTurn ? "rgba(52,211,153,0.1)" : "rgba(245,182,55,0.06)",
          border: `1px solid ${game.status !== "active" ? "rgba(255,255,255,0.1)" : isMyTurn ? "rgba(52,211,153,0.35)" : "rgba(245,182,55,0.25)"}`,
          borderRadius:12, padding:"10px 16px",
          animation: isMyTurn && game.status === "active" ? "turnGlow 2s infinite" : "none",
        }}>
          <div style={{
            width:8, height:8, borderRadius:"50%", flexShrink:0,
            background: game.status !== "active" ? "rgba(255,255,255,0.25)" : isMyTurn ? "#34d399" : "#f5b637",
            boxShadow: isMyTurn && game.status === "active" ? "0 0 6px #34d399" : "none",
          }} />
          <span style={{
            fontSize:13, fontWeight:700,
            color: game.status !== "active" ? "rgba(255,255,255,0.4)" : isMyTurn ? "#34d399" : "#f5b637",
          }}>
            {game.status === "finished"
              ? "Игра завершена"
              : isMyTurn
              ? "Ваш ход"
              : `Ход ${opp?.name?.split(" ")[0] || "соперника"}`}
          </span>
        </div>

        {game.status === "active" && (
          <button onClick={resign} style={{
            background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.35)",
            color:"#f87171", borderRadius:10, padding:"10px 18px",
            fontSize:13, fontWeight:700, cursor:"pointer",
            transition:"background 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
          >
            Сдаться
          </button>
        )}
      </div>
    </section>
  );
}
