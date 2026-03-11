/* =============================================================
   nqueens.js  —  N-Queens Solver Logic
   Depends on: DOM structure defined in nqueens.html
   Storage key: 'nq_v2' (localStorage)
   ============================================================= */

// ── STATE ──────────────────────────────────────────────────────
let N          = 8;   // current board size
let queens     = [];  // queens[row] = col index, or -1 if empty
let allSols    = [];  // all valid solutions for current N
let solIdx     = 0;   // index of the currently displayed solution
let timerSecs  = 0;   // elapsed seconds since first move
let timerInt   = null;// setInterval handle
let gameActive = false;
let solverStep = 0;   // next row index for step-by-step solver

// ── ALGORITHM: find all solutions (backtracking) ───────────────
/**
 * Returns all valid queen placements for an n×n board.
 * Each solution is an array of length n where solution[row] = col.
 */
function findAllSolutions(n) {
  const sols = [];
  const cols = Array(n).fill(-1);

  function isSafe(row, col) {
    for (let r = 0; r < row; r++) {
      if (cols[r] === col || Math.abs(cols[r] - col) === Math.abs(r - row)) return false;
    }
    return true;
  }

  function backtrack(row) {
    if (row === n) { sols.push([...cols]); return; }
    for (let c = 0; c < n; c++) {
      if (isSafe(row, c)) {
        cols[row] = c;
        backtrack(row + 1);
        cols[row] = -1;
      }
    }
  }

  backtrack(0);
  return sols;
}

// ── BOARD STATE HELPERS ────────────────────────────────────────
/**
 * Returns a Set of "row,col" strings for all squares attacked
 * by currently placed queens.
 */
function getAttacked() {
  const attacked = new Set();
  for (let r = 0; r < N; r++) {
    if (queens[r] < 0) continue;
    const qc = queens[r];
    // Same row
    for (let c = 0; c < N; c++) if (c !== qc) attacked.add(`${r},${c}`);
    // Same column
    for (let rr = 0; rr < N; rr++) if (rr !== r) attacked.add(`${rr},${qc}`);
    // Diagonals
    for (let d = 1; d < N; d++) {
      [[r+d, qc+d], [r+d, qc-d], [r-d, qc+d], [r-d, qc-d]].forEach(([rr, cc]) => {
        if (rr >= 0 && rr < N && cc >= 0 && cc < N) attacked.add(`${rr},${cc}`);
      });
    }
  }
  return attacked;
}

/**
 * Returns a Set of row indices where queens are in conflict
 * (same column or diagonal).
 */
function getConflicts() {
  const bad = new Set();
  for (let r1 = 0; r1 < N; r1++) {
    if (queens[r1] < 0) continue;
    for (let r2 = r1 + 1; r2 < N; r2++) {
      if (queens[r2] < 0) continue;
      if (queens[r1] === queens[r2] ||
          Math.abs(queens[r1] - queens[r2]) === Math.abs(r1 - r2)) {
        bad.add(r1);
        bad.add(r2);
      }
    }
  }
  return bad;
}

/** Returns the number of queens currently on the board. */
function placed() { return queens.filter(c => c >= 0).length; }

/** Returns true when all N queens are placed with no conflicts. */
function isSolved() { return placed() === N && getConflicts().size === 0; }

// ── RENDER ─────────────────────────────────────────────────────
/**
 * Rebuilds the board DOM from scratch based on current state.
 * Also updates the placed-count label and status bar.
 */
function render() {
  const boardEl = document.getElementById('board');
  boardEl.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
  boardEl.style.gridTemplateRows    = `repeat(${N}, 1fr)`;

  const attacked  = getAttacked();
  const conflicts = getConflicts();
  const p         = placed();

  boardEl.innerHTML = '';

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const sq      = document.createElement('div');
      const hasQ    = queens[r] === c;
      const isAtk   = attacked.has(`${r},${c}`);
      const isWhite = (r + c) % 2 === 0;

      sq.className = 'sq ' + (isWhite ? 'white' : 'blue');

      if (hasQ) {
        sq.classList.add('has-queen');
        if (conflicts.has(r)) sq.classList.add('conflict');
      } else if (isAtk && p > 0) {
        sq.classList.add('attacked');
      }

      sq.addEventListener('click', () => handleClick(r, c));
      boardEl.appendChild(sq);
    }
  }

  document.getElementById('placed-count').textContent = `${p} / ${N}`;
  updateStatus(p, conflicts.size);
}

/**
 * Updates the status bar text and dot colour based on game state.
 */
function updateStatus(p, conflicts) {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  dot.className = 'status-dot';

  if (p === 0) {
    text.textContent = `Click any square to place a queen. You need to place ${N} queens total.`;
  } else if (conflicts > 0) {
    dot.classList.add('error');
    text.textContent = `${conflicts} queen${conflicts > 1 ? 's are' : ' is'} attacking each other! Move them to safe squares.`;
  } else if (p === N) {
    dot.classList.add('win');
    text.textContent = `🎉 All ${N} queens are safe — you solved it!`;
  } else {
    dot.classList.add('ok');
    text.textContent = `Great so far! ${p} placed, ${N - p} more to go. No conflicts yet.`;
  }
}

// ── INTERACTION ────────────────────────────────────────────────
/**
 * Handles a click on board square (row, col).
 * Toggles a queen on/off and checks for win condition.
 */
function handleClick(row, col) {
  if (!gameActive) { startTimer(); gameActive = true; }
  queens[row] = queens[row] === col ? -1 : col;
  render();
  if (isSolved()) {
    clearInterval(timerInt);
    gameActive = false;
    const pts = calcScore();
    saveScore(pts);
    updateHeaderStats();
    updateScoreList();
    setTimeout(() => showWin(pts), 300);
  }
}

/** Calculates points: base score minus a time penalty. */
function calcScore() {
  return Math.max(10, N * N * 10 - Math.floor(timerSecs / 5));
}

// ── CONTROLS ───────────────────────────────────────────────────
/** Switches to board size n and starts a fresh game. */
function setN(n) {
  N = n;
  document.querySelectorAll('.n-btn').forEach(b => b.classList.toggle('active', +b.dataset.n === n));
  document.getElementById('size-label').textContent = `${n} × ${n}`;
  resetBoard();
}

/** Resets all game state and re-renders an empty board. */
function resetBoard() {
  clearInterval(timerInt);
  queens     = Array(N).fill(-1);
  allSols    = [];
  solIdx     = 0;
  timerSecs  = 0;
  gameActive = false;
  solverStep = 0;
  updateTimerDisplay();
  render();
  document.getElementById('solutions-card').style.display = 'none';
  closeWin();
}

/** Removes all player-placed queens without resetting the timer or score. */
function clearBoard() {
  queens     = Array(N).fill(-1);
  solverStep = 0;
  render();
  showToast('Board cleared!');
}

/** Starts the game timer. */
function startTimer() {
  clearInterval(timerInt);
  timerInt = setInterval(() => { timerSecs++; updateTimerDisplay(); }, 1000);
}

/** Refreshes the timer display element. */
function updateTimerDisplay() {
  const m = Math.floor(timerSecs / 60);
  const s = String(timerSecs % 60).padStart(2, '0');
  document.getElementById('timer').textContent = `${m}:${s}`;
}

// ── SOLVER ─────────────────────────────────────────────────────
/**
 * Places the next queen from the first found solution, one row at a time.
 * Triggers win condition when the board is fully solved.
 */
function solveStep() {
  if (!allSols.length) { allSols = findAllSolutions(N); solIdx = 0; }
  if (!allSols.length) { showToast('No solution exists for this size'); return; }
  if (solverStep >= N) { showToast('Already solved! Start a New Game to try again.'); return; }

  if (!gameActive) { startTimer(); gameActive = true; }
  queens[solverStep] = allSols[0][solverStep];
  solverStep++;
  render();

  if (solverStep === N) {
    clearInterval(timerInt);
    gameActive = false;
    const pts  = calcScore();
    saveScore(pts);
    updateHeaderStats();
    updateScoreList();
    setTimeout(() => showWin(pts), 300);
  }
}

/**
 * Computes all solutions and displays the first one.
 * Opens the Solutions browser card.
 */
function solveAll() {
  allSols = findAllSolutions(N);
  solIdx  = 0;
  if (!allSols.length) { showToast(`No solutions exist for N=${N}`); return; }
  displaySolution(0);
  document.getElementById('solutions-card').style.display = 'block';
  updateSolNav();
  showToast(`Found ${allSols.length} solution${allSols.length > 1 ? 's' : ''}!`);
}

/** Displays solution at index idx on the board. */
function displaySolution(idx) {
  queens = [...allSols[idx]];
  solIdx = idx;
  render();
  updateSolNav();
}

/** Navigates the solutions list by dir (+1 or -1). */
function navSol(dir) {
  if (!allSols.length) return;
  displaySolution((solIdx + dir + allSols.length) % allSols.length);
}

/** Re-renders the solutions navigator and list. */
function updateSolNav() {
  document.getElementById('sol-idx').textContent   = solIdx + 1;
  document.getElementById('sol-total').textContent = allSols.length;
  document.getElementById('prev-sol').disabled     = allSols.length <= 1;
  document.getElementById('next-sol').disabled     = allSols.length <= 1;

  const list = document.getElementById('sol-list');
  list.innerHTML = allSols.slice(0, 12).map((sol, i) => `
    <div class="sol-item ${i === solIdx ? 'active' : ''}" onclick="displaySolution(${i})">
      <span>[${sol.join(', ')}]</span><span>#${i + 1}</span>
    </div>
  `).join('');

  if (allSols.length > 12) {
    list.innerHTML += `
      <div class="sol-item" style="justify-content:center;cursor:default;color:var(--muted)">
        +${allSols.length - 12} more…
      </div>`;
  }
}

// ── LOCALSTORAGE ───────────────────────────────────────────────
/** Safely reads stored data, returning a default if missing or corrupt. */
function getData() {
  try { return JSON.parse(localStorage.getItem('nq_v2')) || { scores: [], solved: 0 }; }
  catch { return { scores: [], solved: 0 }; }
}

/** Persists data object to localStorage. */
function setData(d) { localStorage.setItem('nq_v2', JSON.stringify(d)); }

/** Saves a new score entry, keeps top 10, increments solved counter. */
function saveScore(pts) {
  const d = getData();
  d.scores.push({ pts, n: N, time: timerSecs, date: new Date().toLocaleDateString() });
  d.scores.sort((a, b) => b.pts - a.pts);
  d.scores  = d.scores.slice(0, 10);
  d.solved  = (d.solved || 0) + 1;
  setData(d);
}

/** Wipes all saved scores and refreshes the UI. */
function clearScores() {
  localStorage.removeItem('nq_v2');
  updateHeaderStats();
  updateScoreList();
  showToast('Scores cleared!');
}

/** Updates the header Best Score and Solved counters. */
function updateHeaderStats() {
  const d = getData();
  document.getElementById('best-score').textContent    = d.scores.length ? d.scores[0].pts : 0;
  document.getElementById('solved-count').textContent  = d.solved || 0;
}

/** Rebuilds the scoreboard list DOM. */
function updateScoreList() {
  const d  = getData();
  const el = document.getElementById('score-list');

  if (!d.scores.length) {
    el.innerHTML = '<div class="no-scores">No scores yet — solve a puzzle!</div>';
    return;
  }

  el.innerHTML = d.scores.slice(0, 8).map((s, i) => `
    <div class="score-row">
      <div class="score-rank">${i + 1}</div>
      <div class="score-info">N=${s.n} · ${fmtTime(s.time)} · ${s.date}</div>
      <div class="score-pts">${s.pts}</div>
    </div>
  `).join('');
}

/** Formats seconds into m:ss string. */
function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ── UI HELPERS ─────────────────────────────────────────────────
/** Briefly shows a toast notification at the bottom of the screen. */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/** Populates and shows the win modal. */
function showWin(pts) {
  document.getElementById('win-pts').textContent    = pts;
  document.getElementById('win-detail').textContent =
    `N=${N}  ·  Time: ${fmtTime(timerSecs)}  ·  ${pts} points`;
  document.getElementById('win-overlay').classList.add('show');
}

/** Hides the win modal. */
function closeWin() {
  document.getElementById('win-overlay').classList.remove('show');
}

// ── INITIALISATION ─────────────────────────────────────────────
/** Builds the N-selector buttons for sizes 4–8. */
function buildNSelector() {
  const sel = document.getElementById('n-selector');
  [4, 5, 6, 7, 8].forEach(n => {
    const btn       = document.createElement('button');
    btn.className   = 'n-btn' + (n === N ? ' active' : '');
    btn.textContent = n;
    btn.dataset.n   = n;
    btn.onclick     = () => setN(n);
    sel.appendChild(btn);
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  navSol(-1);
  if (e.key === 'ArrowRight') navSol(1);
  if (e.key === 'Escape')     closeWin();
});

// Bootstrap
buildNSelector();
updateHeaderStats();
updateScoreList();
resetBoard();
