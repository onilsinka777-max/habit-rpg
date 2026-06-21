import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const PIECES = {
  K:"♔", Q:"♕", R:"♖", B:"♗", N:"♘", P:"♙",
  k:"♚", q:"♛", r:"♜", b:"♝", n:"♞", p:"♟",
};

const PIECE_COLORS = {
  K:"#e2e8f0",Q:"#e2e8f0",R:"#e2e8f0",B:"#e2e8f0",N:"#e2e8f0",P:"#e2e8f0",
  k:"#7c3aed", q:"#7c3aed", r:"#7c3aed", b:"#7c3aed", n:"#7c3aed", p:"#7c3aed",
};

// Parse FEN position string to 8x8 array
function fenToBoard(fen) {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) c += Number(ch);
      else { board[r][c] = ch; c++; }
    }
  });
  return board;
}

// Basic move generation (simplified — validates piece ownership + captures)
function isWhitePiece(p) { return p && p === p.toUpperCase(); }
function isBlackPiece(p) { return p && p === p.toLowerCase(); }

function getLegalMoves(board, row, col, currentTurn) {
  const piece = board[row][col];
  if (!piece) return [];
  const isWhite = isWhitePiece(piece);
  if ((currentTurn === "white" && !isWhite) || (currentTurn === "black" && isWhite)) return [];

  const moves = [];
  const friendly = isWhite ? isWhitePiece : isBlackPiece;
  const enemy = isWhite ? isBlackPiece : isWhitePiece;
  const type = piece.toLowerCase();

  const addMove = (r, c) => {
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    if (friendly(board[r][c])) return false;
    moves.push([r, c]);
    return !board[r][c]; // continue ray if empty
  };

  const ray = (dr, dc) => {
    let r = row + dr, c = col + dc;
    while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
      if (!addMove(r, c)) break;
      r += dr; c += dc;
    }
  };

  if (type === "p") {
    const dir = isWhite ? -1 : 1;
    const start = isWhite ? 6 : 1;
    if (!board[row + dir]?.[col]) {
      moves.push([row + dir, col]);
      if (row === start && !board[row + dir * 2]?.[col]) moves.push([row + dir * 2, col]);
    }
    [-1, 1].forEach(dc => { if (enemy(board[row + dir]?.[col + dc])) moves.push([row + dir, col + dc]); });
  } else if (type === "r") {
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => ray(dr, dc));
  } else if (type === "b") {
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => ray(dr, dc));
  } else if (type === "q") {
    [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => ray(dr, dc));
  } else if (type === "n") {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => addMove(row+dr, col+dc));
  } else if (type === "k") {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => addMove(row+dr, col+dc));
  }
  return moves;
}

function boardToFen(board) {
  return board.map(row => {
    let s = "", empty = 0;
    for (const cell of row) {
      if (!cell) { empty++; } else { if (empty) { s += empty; empty = 0; } s += cell; }
    }
    if (empty) s += empty;
    return s;
  }).join("/");
}

export default function Chess({ token, showToast, gameId: initialGameId }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const [game, setGame]       = useState(null);
  const [board, setBoard]     = useState(null);
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [myColor, setMyColor] = useState(null);
  const [userId, setUserId]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameId, setGameId]   = useState(initialGameId || null);
  const [myGames, setMyGames] = useState([]);

  useEffect(() => {
    axios.get(`${API}/me`, auth).then(r => setUserId(r.data.id)).catch(() => {});
  }, []);

  const loadGame = useCallback(async (id) => {
    try {
      const res = await axios.get(`${API}/chess/game/${id}`, auth);
      setGame(res.data);
      setBoard(fenToBoard(res.data.board));
      if (userId) setMyColor(res.data.player1Id === userId ? "white" : "black");
    } catch { showToast("Не удалось загрузить игру", "error"); }
  }, [userId]);

  useEffect(() => {
    if (gameId && userId) { loadGame(gameId); setLoading(false); }
    else { axios.get(`${API}/chess/my-games`, auth).then(r => { setMyGames(r.data); setLoading(false); }).catch(() => setLoading(false)); }
  }, [gameId, userId]);

  // Poll for opponent moves
  useEffect(() => {
    if (!gameId || !game || game.status !== "active") return;
    const t = setInterval(() => loadGame(gameId), 3000);
    return () => clearInterval(t);
  }, [gameId, game?.currentTurn]);

  const handleClick = async (r, c) => {
    if (!board || game?.status !== "active") return;
    if (myColor !== game?.currentTurn) { showToast("Сейчас ход соперника", "info"); return; }

    if (selected) {
      const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c);
      if (isLegal) {
        const newBoard = board.map(row => [...row]);
        const captured = newBoard[r][c];
        newBoard[r][c] = newBoard[selected[0]][selected[1]];
        newBoard[selected[0]][selected[1]] = null;
        const fen = boardToFen(newBoard);

        // Check for captured king (simplified win detection)
        const status = (captured === "k" || captured === "K") ? "finished" : "active";
        const result = status === "finished" ? myColor : undefined;

        try {
          const res = await axios.post(`${API}/chess/game/${gameId}/move`, {
            board: fen, from:[selected[0],selected[1]], to:[r,c], status, result,
          }, auth);
          setGame(res.data);
          setBoard(fenToBoard(res.data.board));
          if (status === "finished") showToast(`🏆 Победа! +15 XP`, "success");
        } catch (e) { showToast(e.response?.data?.message || "Ошибка хода", "error"); }

        setSelected(null); setLegalMoves([]);
      } else {
        setSelected(null); setLegalMoves([]);
      }
    } else {
      const piece = board[r][c];
      if (!piece) return;
      const moves = getLegalMoves(board, r, c, myColor);
      if (moves.length || (piece && ((myColor === "white" && isWhitePiece(piece)) || (myColor === "black" && isBlackPiece(piece))))) {
        setSelected([r, c]);
        setLegalMoves(moves);
      }
    }
  };

  if (loading) return <p className="empty-state">Загрузка...</p>;

  if (!gameId) {
    return (
      <section className="quest-section">
        <div className="section-eyebrow"><span>♟️</span> Шахматы</div>
        {myGames.length === 0 ? (
          <p className="empty-state">Нет активных игр. Пригласи друга через кнопку "♟" в списке друзей!</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {myGames.map(g => {
              const opp = g.player1Id === userId ? g.player2 : g.player1;
              const myC = g.player1Id === userId ? "белые" : "чёрные";
              return (
                <button key={g.id} onClick={() => setGameId(g.id)} style={{
                  background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.25)",
                  borderRadius:12, padding:"14px 16px", textAlign:"left", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:12, color:"#e2e8f0",
                }}>
                  <span style={{ fontSize:28 }}>♟️</span>
                  <div>
                    <div style={{ fontWeight:700, marginBottom:3 }}>vs {opp?.name || opp?.email}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>
                      Я играю {myC} · {g.status === "active" ? (g.currentTurn === (g.player1Id===userId?"white":"black") ? "🟢 Ваш ход" : "⏳ Ход соперника") : "✅ Завершена"}
                    </div>
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
  const isMyTurn = game.currentTurn === myColor && game.status === "active";

  return (
    <section className="quest-section">
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <button onClick={() => { setGameId(null); setGame(null); }} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:20 }}>←</button>
        <div className="section-eyebrow" style={{ margin:0 }}><span>♟️</span> vs {opp?.name || opp?.email}</div>
        <div style={{ marginLeft:"auto", fontSize:12, color: isMyTurn ? "#34d399" : "rgba(255,255,255,0.4)" }}>
          {game.status === "finished" ? "Игра завершена" : isMyTurn ? "🟢 Ваш ход" : "⏳ Ждём соперника"}
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"center" }}>
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(8,1fr)",
          width:"min(360px,100%)", aspectRatio:"1",
          border:"2px solid rgba(124,58,237,0.4)",
          borderRadius:8, overflow:"hidden",
          boxShadow:"0 0 40px rgba(124,58,237,0.2)",
        }}>
          {board.map((row, r) => row.map((piece, c) => {
            const isLight = (r + c) % 2 === 0;
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const isLegal = legalMoves.some(([lr, lc]) => lr === r && lc === c);
            const isLastRow = r === 7;
            const isLastCol = c === 7;
            return (
              <div key={`${r}-${c}`} onClick={() => handleClick(r, c)} style={{
                background: isSelected ? "rgba(124,58,237,0.5)" : isLegal ? "rgba(52,211,153,0.25)" : isLight ? "#1e1b4b" : "#0d0b1e",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor: "pointer", aspectRatio:"1",
                position:"relative",
                borderRight: !isLastCol ? "1px solid rgba(124,58,237,0.1)" : "none",
                borderBottom: !isLastRow ? "1px solid rgba(124,58,237,0.1)" : "none",
                transition:"background 0.1s",
              }}>
                {isLegal && !piece && (
                  <div style={{ width:"30%", height:"30%", borderRadius:"50%", background:"rgba(52,211,153,0.5)" }} />
                )}
                {piece && (
                  <span style={{
                    fontSize:"clamp(16px,4vw,32px)", lineHeight:1,
                    color: PIECE_COLORS[piece],
                    textShadow: isWhitePiece(piece) ? "0 0 10px rgba(255,255,255,0.3)" : "0 0 10px rgba(124,58,237,0.8)",
                    userSelect:"none",
                  }}>
                    {PIECES[piece]}
                  </span>
                )}
              </div>
            );
          }))}
        </div>
      </div>

      <div style={{ textAlign:"center", marginTop:12, fontSize:12, color:"rgba(255,255,255,0.4)" }}>
        Вы играете {myColor === "white" ? "белыми ♔" : "чёрными ♚"} · Ход: {game.currentTurn === "white" ? "белых" : "чёрных"}
      </div>
    </section>
  );
}
