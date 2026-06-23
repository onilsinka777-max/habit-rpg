// Chess minimax engine ~1500 Elo
const PIECE_VALUES = {
  p:100, n:320, b:330, r:500, q:900, k:20000,
  P:-100, N:-320, B:-330, R:-500, Q:-900, K:-20000,
};

const POSITION_BONUS = {
  p: [
    [0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
    [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0],
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],
    [-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
    [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
    [-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],
    [-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],
    [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  r: [
    [0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0],
  ],
  q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
    [-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],
    [0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],
    [-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20],
  ],
};

const isW = p => p && p === p.toUpperCase();
const isB = p => p && p === p.toLowerCase();
const clr = p => p ? (isW(p) ? 'w' : 'b') : null;

function attacked(board, row, col, by) {
  for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const r=row+dr,c=col+dc;
    if (r>=0&&r<8&&c>=0&&c<8) { const p=board[r][c]; if(p&&p.toLowerCase()==='n'&&clr(p)===by) return true; }
  }
  const pr = by==='w' ? row+1 : row-1;
  for (const dc of [-1,1]) { const c=col+dc; if(pr>=0&&pr<8&&c>=0&&c<8){const p=board[pr][c];if(p&&p.toLowerCase()==='p'&&clr(p)===by)return true;} }
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) { let r=row+dr,c=col+dc; while(r>=0&&r<8&&c>=0&&c<8){if(board[r][c]){const p=board[r][c];if((p.toLowerCase()==='r'||p.toLowerCase()==='q')&&clr(p)===by)return true;break;}r+=dr;c+=dc;} }
  for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) { let r=row+dr,c=col+dc; while(r>=0&&r<8&&c>=0&&c<8){if(board[r][c]){const p=board[r][c];if((p.toLowerCase()==='b'||p.toLowerCase()==='q')&&clr(p)===by)return true;break;}r+=dr;c+=dc;} }
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) { const r=row+dr,c=col+dc; if(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p&&p.toLowerCase()==='k'&&clr(p)===by)return true;} }
  return false;
}

function inCheck(board, color) {
  const k = color==='w' ? 'K' : 'k';
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) if(board[r][c]===k) return attacked(board,r,c,color==='w'?'b':'w');
  return false;
}

function legalMovesFor(board, color) {
  const moves = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p = board[r][c]; if(!p||clr(p)!==color) continue;
    const t = p.toLowerCase();
    const friendly = color==='w' ? isW : isB;
    const enemy = color==='w' ? isB : isW;
    const pseudo = [];
    const add = (tr,tc) => { if(tr<0||tr>7||tc<0||tc>7) return false; if(friendly(board[tr][tc])) return false; pseudo.push([tr,tc]); return !board[tr][tc]; };
    const ray = (dr,dc) => { let rr=r+dr,cc=c+dc; while(rr>=0&&rr<8&&cc>=0&&cc<8){if(!add(rr,cc))break;rr+=dr;cc+=dc;} };
    if(t==='p'){const dir=color==='w'?-1:1;const st=color==='w'?6:1;if(r+dir>=0&&r+dir<8&&!board[r+dir][c]){pseudo.push([r+dir,c]);if(r===st&&!board[r+dir*2]?.[c])pseudo.push([r+dir*2,c]);}for(const dc of[-1,1]){const nc=c+dc;if(nc>=0&&nc<8&&r+dir>=0&&r+dir<8&&enemy(board[r+dir][nc]))pseudo.push([r+dir,nc]);}}
    else if(t==='r')[[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>ray(dr,dc));
    else if(t==='b')[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>ray(dr,dc));
    else if(t==='q')[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>ray(dr,dc));
    else if(t==='n')[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
    else if(t==='k')[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
    for (const [tr,tc] of pseudo) {
      const nb = board.map(row=>[...row]); nb[tr][tc]=nb[r][c]; nb[r][c]=null;
      if(nb[tr][tc]==='P'&&tr===0) nb[tr][tc]='Q';
      if(nb[tr][tc]==='p'&&tr===7) nb[tr][tc]='q';
      if(!inCheck(nb,color)) moves.push({fr:r,fc:c,tr,tc});
    }
  }
  return moves;
}

function applyMove(board, move) {
  const nb = board.map(row=>[...row]);
  nb[move.tr][move.tc] = nb[move.fr][move.fc];
  nb[move.fr][move.fc] = null;
  if(nb[move.tr][move.tc]==='P'&&move.tr===0) nb[move.tr][move.tc]='Q';
  if(nb[move.tr][move.tc]==='p'&&move.tr===7) nb[move.tr][move.tc]='q';
  return nb;
}

function evaluateBoard(board) {
  let score = 0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const piece = board[r][c];
    if(!piece) continue;
    score += PIECE_VALUES[piece] || 0;
    const isBlack = piece === piece.toLowerCase();
    const key = piece.toLowerCase();
    if(POSITION_BONUS[key]) {
      const row = isBlack ? r : 7 - r;
      score += (isBlack ? 1 : -1) * (POSITION_BONUS[key][row]?.[c] || 0);
    }
  }
  return score;
}

function minimax(board, depth, alpha, beta, isMaximizing) {
  if(depth === 0) return evaluateBoard(board);
  const color = isMaximizing ? 'b' : 'w';
  const moves = legalMovesFor(board, color);
  if(moves.length === 0) return isMaximizing ? -99999 : 99999;
  if(isMaximizing) {
    let maxEval = -Infinity;
    for(const move of moves) {
      const eval_ = minimax(applyMove(board, move), depth-1, alpha, beta, false);
      if(eval_ > maxEval) maxEval = eval_;
      if(eval_ > alpha) alpha = eval_;
      if(beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for(const move of moves) {
      const eval_ = minimax(applyMove(board, move), depth-1, alpha, beta, true);
      if(eval_ < minEval) minEval = eval_;
      if(eval_ < beta) beta = eval_;
      if(beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestBotMove(board) {
  const moves = legalMovesFor(board, 'b');
  if(!moves.length) return null;
  let bestMove = null, bestScore = -Infinity;
  for(const move of moves) {
    const score = minimax(applyMove(board, move), 3, -Infinity, Infinity, false);
    if(score > bestScore) { bestScore = score; bestMove = move; }
  }
  return bestMove;
}

self.onmessage = (e) => {
  const move = getBestBotMove(e.data.board);
  self.postMessage({ move });
};
