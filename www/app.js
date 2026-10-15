/**
 * MINIMAL SUDOKU — PHASE 3: 10/10 DARK UI, REMOTION ANIMATIONS & LOCALSTORAGE PERSISTENCE
 * Personal Phone Edition
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. CONSTANTS & STORAGE KEYS
  // ==========================================================================

  const GRID_SIZE = 9;
  const BOX_SIZE = 3;
  const STORAGE_ACTIVE_GAME = 'sudoku_active_game';
  const STORAGE_HISTORY_STATS = 'sudoku_history_stats';

  const DIFFICULTY_REMOVALS = {
    EASY: 34,
    MEDIUM: 45,
    HARD: 53,
  };

  // ==========================================================================
  // 2. NATIVE HAPTICS HELPER
  // ==========================================================================

  function triggerHaptic(pattern) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Safe fallback for environments where vibration is blocked
      }
    }
  }

  // ==========================================================================
  // 3. SUDOKU GENERATOR & BACKTRACKING ENGINE
  // ==========================================================================

  function createEmptyGrid() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  }

  function cloneGrid(grid) {
    return grid.map((row) => [...row]);
  }

  function createNotesGrid() {
    return Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => new Set())
    );
  }

  function cloneNotes(notesGrid) {
    return notesGrid.map((row) => row.map((set) => new Set(set)));
  }

  function serializeNotes(notesGrid) {
    return notesGrid.map((row) => row.map((set) => Array.from(set)));
  }

  function deserializeNotes(serialized) {
    return serialized.map((row) => row.map((arr) => new Set(arr)));
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function fillDiagonalBoxes(board) {
    for (let box = 0; box < 9; box += 4) {
      const startRow = Math.floor(box / 3) * 3;
      const startCol = (box % 3) * 3;
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      let idx = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          board[startRow + r][startCol + c] = nums[idx++];
        }
      }
    }
  }

  function solveRandomized(board) {
    const rowMask = new Uint16Array(9);
    const colMask = new Uint16Array(9);
    const boxMask = new Uint16Array(9);

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = board[r][c];
        if (val !== 0) {
          const bit = 1 << val;
          rowMask[r] |= bit;
          colMask[c] |= bit;
          boxMask[Math.floor(r / 3) * 3 + Math.floor(c / 3)] |= bit;
        }
      }
    }

    function backtrack() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) {
            const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
            const occupied = rowMask[r] | colMask[c] | boxMask[b];
            const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

            for (const num of candidates) {
              const bit = 1 << num;
              if (!(occupied & bit)) {
                board[r][c] = num;
                rowMask[r] |= bit;
                colMask[c] |= bit;
                boxMask[b] |= bit;

                if (backtrack()) return true;

                board[r][c] = 0;
                rowMask[r] &= ~bit;
                colMask[c] &= ~bit;
                boxMask[b] &= ~bit;
              }
            }
            return false;
          }
        }
      }
      return true;
    }

    return backtrack();
  }

  function generateFullSolution() {
    const board = createEmptyGrid();
    fillDiagonalBoxes(board);
    solveRandomized(board);
    return board;
  }

  function countSolutions(board, limit = 2) {
    const rowMask = new Uint16Array(9);
    const colMask = new Uint16Array(9);
    const boxMask = new Uint16Array(9);

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = board[r][c];
        if (val !== 0) {
          const bit = 1 << val;
          rowMask[r] |= bit;
          colMask[c] |= bit;
          boxMask[Math.floor(r / 3) * 3 + Math.floor(c / 3)] |= bit;
        }
      }
    }

    let solutions = 0;

    function solve() {
      let minCandidates = 10;
      let targetRow = -1;
      let targetCol = -1;
      let targetBox = -1;
      let targetMask = 0;

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) {
            const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
            const occupied = rowMask[r] | colMask[c] | boxMask[b];
            const available = (~occupied) & 0x3FE;

            let count = 0;
            for (let num = 1; num <= 9; num++) {
              if (available & (1 << num)) count++;
            }

            if (count === 0) return;

            if (count < minCandidates) {
              minCandidates = count;
              targetRow = r;
              targetCol = c;
              targetBox = b;
              targetMask = available;
              if (count === 1) break;
            }
          }
        }
        if (minCandidates === 1) break;
      }

      if (targetRow === -1) {
        solutions++;
        return;
      }

      for (let num = 1; num <= 9; num++) {
        const bit = 1 << num;
        if (targetMask & bit) {
          board[targetRow][targetCol] = num;
          rowMask[targetRow] |= bit;
          colMask[targetCol] |= bit;
          boxMask[targetBox] |= bit;

          solve();

          board[targetRow][targetCol] = 0;
          rowMask[targetRow] &= ~bit;
          colMask[targetCol] &= ~bit;
          boxMask[targetBox] &= ~bit;

          if (solutions >= limit) return;
        }
      }
    }

    solve();
    return solutions;
  }

  function generatePuzzle(difficulty = 'MEDIUM') {
    const diffKey = difficulty.toUpperCase();
    const targetRemovals = DIFFICULTY_REMOVALS[diffKey] || DIFFICULTY_REMOVALS.MEDIUM;
    const solution = generateFullSolution();
    const puzzle = cloneGrid(solution);

    const coords = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        coords.push([r, c]);
      }
    }
    const shuffledCoords = shuffle(coords);

    let removed = 0;
    for (const [r, c] of shuffledCoords) {
      const temp = puzzle[r][c];
      puzzle[r][c] = 0;

      const solutions = countSolutions(cloneGrid(puzzle), 2);
      if (solutions !== 1) {
        puzzle[r][c] = temp;
      } else {
        removed++;
        if (removed >= targetRemovals) break;
      }
    }

    return { puzzle, solution, difficulty: diffKey };
  }

  // ==========================================================================
  // 4. APPLICATION STATE
  // ==========================================================================

  const state = {
    difficulty: 'MEDIUM', // 'EASY' | 'MEDIUM' | 'HARD'
    solution: createEmptyGrid(),
    initial: createEmptyGrid().map((row) => row.map(() => false)),
    board: createEmptyGrid(),
    notes: createNotesGrid(),
    selectedCell: null, // { row, col } or null
    notesMode: false,
    mistakes: 0, // 0 to 3 max
    undoStack: [], // Array of snapshots
    status: 'PLAYING', // 'PLAYING' | 'WON' | 'LOST'
    startTime: null,
    elapsedSeconds: 0,
    timerInterval: null,
    hasActiveGame: false,
    currentView: 'view-home',
  };

  function pushUndoSnapshot() {
    state.undoStack.push({
      board: cloneGrid(state.board),
      notes: cloneNotes(state.notes),
    });
  }

  // ==========================================================================
  // 5. DOM ELEMENTS
  // ==========================================================================

  const views = {
    home: document.getElementById('view-home'),
    levels: document.getElementById('view-levels'),
    game: document.getElementById('view-game'),
    history: document.getElementById('view-history'),
  };

  const elements = {
    // Navigation / Home
    btnGotoLevels: document.getElementById('btn-goto-levels'),
    btnGotoHistory: document.getElementById('btn-goto-history'),
    btnHomeResume: document.getElementById('btn-home-resume'),
    homeResumeCard: document.getElementById('home-resume-card'),
    homeResumeDiff: document.getElementById('home-resume-difficulty'),
    homeResumePercent: document.getElementById('home-resume-percent'),
    homeResumeBar: document.getElementById('home-resume-bar'),

    // Level Select
    levelCards: document.querySelectorAll('.level-card'),

    // Game Arena Header & Infographics
    btnGameBack: document.getElementById('btn-game-back'),
    gameProgressRing: document.getElementById('game-progress-ring-bar'),
    gameProgressText: document.getElementById('game-progress-text'),
    btnDiffSignal: document.getElementById('btn-difficulty-signal'),
    gameDiffLabel: document.getElementById('game-difficulty-label'),
    diffSigB1: document.querySelector('.sig-b1'),
    diffSigB2: document.querySelector('.sig-b2'),
    diffSigB3: document.querySelector('.sig-b3'),
    mistakeDots: document.querySelectorAll('.mistake-dot'),

    // Board & Controls
    boardContainer: document.getElementById('sudoku-board'),
    btnUndo: document.getElementById('btn-undo'),
    btnNotes: document.getElementById('btn-notes'),
    notesActiveDot: document.getElementById('notes-active-dot'),
    btnErase: document.getElementById('btn-erase'),
    keyBtns: document.querySelectorAll('.key-btn[data-key]:not(#btn-erase)'),

    // Result Modal
    modalResult: document.getElementById('modal-result'),
    modalResultTitle: document.getElementById('modal-result-title'),
    modalResultSubtitle: document.getElementById('modal-result-subtitle'),
    modalStatTime: document.getElementById('modal-stat-time'),
    modalStatDifficulty: document.getElementById('modal-stat-difficulty'),
    btnModalPlayAgain: document.getElementById('btn-modal-play-again'),
    btnModalHome: document.getElementById('btn-modal-home'),

    // History View
    statGamesWon: document.getElementById('stat-games-won'),
    statWinRate: document.getElementById('stat-win-rate'),
    statWinrateRing: document.getElementById('stat-winrate-ring'),
    statBestStreak: document.getElementById('stat-best-streak'),
    historyList: document.getElementById('history-list'),

    // Canvas Mounts
    canvasHome: document.getElementById('canvas-home-emblem'),
    canvasVictory: document.getElementById('canvas-victory-burst'),
  };

  // ==========================================================================
  // 6. VIEW ROUTER
  // ==========================================================================

  function navigateTo(viewId) {
    Object.values(views).forEach((v) => v && v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      state.currentView = viewId;
    }

    if (viewId === 'view-home') {
      updateHomeResumeCard();
      startHomeCanvasAnimation();
    } else {
      stopHomeCanvasAnimation();
    }

    if (viewId === 'view-history') {
      renderHistoryAndStats();
    }
  }

  // ==========================================================================
  // 7. TIMER & FORMATTING
  // ==========================================================================

  function startTimer() {
    stopTimer();
    state.startTime = Date.now() - state.elapsedSeconds * 1000;
    state.timerInterval = setInterval(() => {
      state.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
      // Auto-save periodically every 10 seconds
      if (state.elapsedSeconds % 10 === 0 && state.status === 'PLAYING') {
        saveActiveGame();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function formatDate(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const timeStr = `${formattedHours}:${minutes} ${ampm}`;

    if (isToday) return `Today, ${timeStr}`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${timeStr}`;
  }

  // ==========================================================================
  // 8. LOCALSTORAGE AUTO-SAVE & HISTORY SYSTEM
  // ==========================================================================

  function saveActiveGame() {
    if (state.status !== 'PLAYING') return;

    try {
      const payload = {
        solution: state.solution,
        initial: state.initial,
        board: state.board,
        notes: serializeNotes(state.notes),
        mistakes: state.mistakes,
        difficulty: state.difficulty,
        undoStack: state.undoStack.map((snap) => ({
          board: snap.board,
          notes: serializeNotes(snap.notes),
        })),
        elapsedSeconds: state.elapsedSeconds,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_ACTIVE_GAME, JSON.stringify(payload));
      state.hasActiveGame = true;
      updateHomeResumeCard();
    } catch (err) {
      console.warn('[LocalStorage] Save failed:', err);
    }
  }

  function clearActiveGame() {
    state.hasActiveGame = false;
    try {
      localStorage.removeItem(STORAGE_ACTIVE_GAME);
    } catch (err) {
      console.warn('[LocalStorage] Clear failed:', err);
    }
    updateHomeResumeCard();
  }

  function loadActiveGame() {
    try {
      const raw = localStorage.getItem(STORAGE_ACTIVE_GAME);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || !data.board || !data.solution) return false;

      state.solution = data.solution;
      state.initial = data.initial;
      state.board = data.board;
      state.notes = deserializeNotes(data.notes);
      state.mistakes = data.mistakes || 0;
      state.difficulty = data.difficulty || 'MEDIUM';
      state.undoStack = (data.undoStack || []).map((snap) => ({
        board: snap.board,
        notes: deserializeNotes(snap.notes),
      }));
      state.elapsedSeconds = data.elapsedSeconds || 0;
      state.hasActiveGame = true;
      state.status = 'PLAYING';

      // Find first empty or selected cell
      state.selectedCell = null;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (state.board[r][c] === 0) {
            state.selectedCell = { row: r, col: c };
            break;
          }
        }
        if (state.selectedCell) break;
      }

      renderBoard();
      updateHomeResumeCard();
      return true;
    } catch (err) {
      console.warn('[LocalStorage] Load failed:', err);
      return false;
    }
  }

  function logGameHistory(result) {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_STATS);
      const history = raw ? JSON.parse(raw) : [];

      const record = {
        id: `match_${Date.now()}`,
        difficulty: state.difficulty,
        result, // 'WON' | 'LOST'
        mistakes: state.mistakes,
        duration: state.elapsedSeconds,
        timestamp: Date.now(),
      };

      history.unshift(record);
      // Keep up to 60 recent matches
      if (history.length > 60) history.pop();

      localStorage.setItem(STORAGE_HISTORY_STATS, JSON.stringify(history));
      renderHistoryAndStats();
    } catch (err) {
      console.warn('[LocalStorage] History log failed:', err);
    }
  }

  function getHistoryRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_STATS);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function renderHistoryAndStats() {
    const records = getHistoryRecords();
    const wonCount = records.filter((r) => r.result === 'WON').length;
    const totalCount = records.length;
    const winRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

    // Calculate best consecutive win streak in chronological order
    const chronological = [...records].reverse();
    let currentStreak = 0;
    let bestStreak = 0;
    chronological.forEach((r) => {
      if (r.result === 'WON') {
        currentStreak++;
        if (currentStreak > bestStreak) bestStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    if (elements.statGamesWon) elements.statGamesWon.textContent = wonCount;
    if (elements.statWinRate) elements.statWinRate.textContent = winRate;
    if (elements.statBestStreak) elements.statBestStreak.textContent = bestStreak;

    // Progress Ring for Win Rate (circumference = 2 * PI * 23 ≈ 144.5)
    if (elements.statWinrateRing) {
      const circumference = 144.5;
      const offset = circumference - (winRate / 100) * circumference;
      elements.statWinrateRing.style.strokeDashoffset = offset;
    }

    // Populate history cards list
    if (elements.historyList) {
      if (records.length === 0) {
        elements.historyList.innerHTML = `
          <div class="history-item empty-history" style="justify-content: center; opacity: 0.5; padding: 24px;">
            <span>No games logged yet. Start a match!</span>
          </div>
        `;
        return;
      }

      elements.historyList.innerHTML = records
        .map((r) => {
          const isWon = r.result === 'WON';
          const b1Lit = '#9D7BFF';
          const b2Lit = r.difficulty !== 'EASY' ? '#9D7BFF' : '#F2EFF9';
          const b3Lit = r.difficulty === 'HARD' ? '#9D7BFF' : '#F2EFF9';
          const b2Op = r.difficulty !== 'EASY' ? '1' : '0.2';
          const b3Op = r.difficulty === 'HARD' ? '1' : '0.2';

          return `
            <div class="history-item">
              <div class="history-item-left">
                <svg viewBox="0 0 16 12" class="signal-mini-bars">
                  <rect x="1" y="8" width="3" height="4" rx="1" fill="${b1Lit}" />
                  <rect x="6.5" y="4" width="3" height="8" rx="1" fill="${b2Lit}" fill-opacity="${b2Op}" />
                  <rect x="12" y="1" width="3" height="11" rx="1" fill="${b3Lit}" fill-opacity="${b3Op}" />
                </svg>
                <div class="history-details">
                  <span class="history-difficulty">${r.difficulty}</span>
                  <span class="history-date">${formatDate(r.timestamp)}</span>
                </div>
              </div>
              <div class="history-status ${isWon ? 'completed' : 'failed'}" style="${!isWon ? 'color: rgba(242, 239, 249, 0.45); background: rgba(242, 239, 249, 0.06);' : ''}">
                <span>${isWon ? 'SOLVED' : 'FAILED'}</span>
              </div>
            </div>
          `;
        })
        .join('');
    }
  }

  // ==========================================================================
  // 9. LIVE INFOGRAPHIC CALCULATIONS
  // ==========================================================================

  function updateCompletion() {
    let filled = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (state.board[r][c] !== 0) filled++;
      }
    }

    const percentage = Math.floor((filled / 81) * 100);

    // Update Progress Ring (circumference = 2 * PI * 18 ≈ 113.1)
    const circumference = 113.1;
    const offset = circumference - (percentage / 100) * circumference;
    if (elements.gameProgressRing) {
      elements.gameProgressRing.style.strokeDashoffset = offset;
    }
    if (elements.gameProgressText) {
      elements.gameProgressText.textContent = percentage;
    }

    return percentage;
  }

  function updateKeypad() {
    // Count occurrences of each digit 1-9 on board
    const counts = Array(10).fill(0);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = state.board[r][c];
        if (val >= 1 && val <= 9) counts[val]++;
      }
    }

    elements.keyBtns.forEach((btn) => {
      const num = parseInt(btn.dataset.key, 10);
      const placed = counts[num] || 0;
      // Micro-bar shrinks proportionally as remaining placements go from 9 down to 0
      const remaining = Math.max(0, 9 - placed);
      const percent = Math.floor((remaining / 9) * 100);

      const microFill = btn.querySelector('.micro-fill');
      if (microFill) {
        microFill.style.width = `${percent}%`;
      }

      // When all 9 are placed, smoothly fade to opacity 0.2 and disable pointer events
      if (remaining === 0) {
        btn.classList.add('completed');
      } else {
        btn.classList.remove('completed');
      }
    });
  }

  function updateMistakeDots() {
    elements.mistakeDots.forEach((dot) => {
      const idx = parseInt(dot.dataset.index, 10);
      if (idx < state.mistakes) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function updateDifficultySignalUI() {
    const d = state.difficulty;
    const shortLabel = d === 'EASY' ? 'EASY' : d === 'HARD' ? 'HARD' : 'MED';

    if (elements.gameDiffLabel) {
      elements.gameDiffLabel.textContent = shortLabel;
    }

    if (elements.diffSigB1 && elements.diffSigB2 && elements.diffSigB3) {
      const litFill = '#9D7BFF';
      const dimFill = '#F2EFF9';
      const dimOpacity = '0.2';

      elements.diffSigB1.setAttribute('fill', litFill);
      elements.diffSigB1.setAttribute('fill-opacity', '1');

      if (d === 'EASY') {
        elements.diffSigB2.setAttribute('fill', dimFill);
        elements.diffSigB2.setAttribute('fill-opacity', dimOpacity);
        elements.diffSigB3.setAttribute('fill', dimFill);
        elements.diffSigB3.setAttribute('fill-opacity', dimOpacity);
      } else if (d === 'MEDIUM') {
        elements.diffSigB2.setAttribute('fill', litFill);
        elements.diffSigB2.setAttribute('fill-opacity', '1');
        elements.diffSigB3.setAttribute('fill', dimFill);
        elements.diffSigB3.setAttribute('fill-opacity', dimOpacity);
      } else {
        elements.diffSigB2.setAttribute('fill', litFill);
        elements.diffSigB2.setAttribute('fill-opacity', '1');
        elements.diffSigB3.setAttribute('fill', litFill);
        elements.diffSigB3.setAttribute('fill-opacity', '1');
      }
    }
  }

  function updateHomeResumeCard() {
    if (!elements.homeResumeCard) return;

    if (state.hasActiveGame && state.status === 'PLAYING') {
      elements.homeResumeCard.classList.remove('hidden');
      const d = state.difficulty;
      const diffTag = d === 'EASY' ? '▂__ EASY' : d === 'HARD' ? '▂▄▆ HARD' : '▂▄_ MED';
      const pct = updateCompletion();

      if (elements.homeResumeDiff) elements.homeResumeDiff.textContent = diffTag;
      if (elements.homeResumePercent) elements.homeResumePercent.textContent = `${pct}%`;
      if (elements.homeResumeBar) elements.homeResumeBar.style.width = `${pct}%`;
    } else {
      elements.homeResumeCard.classList.add('hidden');
    }
  }

  // ==========================================================================
  // 10. 9x9 GRID HIERARCHY & SIGHTLINE HIGHLIGHTING
  // ==========================================================================

  function renderBoard(isStaggered = false) {
    if (!elements.boardContainer) return;

    const selected = state.selectedCell;
    const selectedNum = selected ? state.board[selected.row][selected.col] : 0;
    const selectedBox = selected
      ? Math.floor(selected.row / 3) * 3 + Math.floor(selected.col / 3)
      : -1;

    // Check if 9 3x3 box containers exist
    let boxContainers = elements.boardContainer.querySelectorAll('.sudoku-box');
    const needsBuild = boxContainers.length !== 9;

    if (needsBuild) {
      elements.boardContainer.innerHTML = '';
      for (let b = 0; b < 9; b++) {
        const boxEl = document.createElement('div');
        boxEl.className = 'sudoku-box';
        boxEl.dataset.box = b;

        const bRow = Math.floor(b / 3) * 3;
        const bCol = (b % 3) * 3;

        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const row = bRow + r;
            const col = bCol + c;

            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            cell.addEventListener('click', () => {
              triggerHaptic(10); // Crisp 10ms tick
              selectCell(row, col);
            });

            boxEl.appendChild(cell);
          }
        }
        elements.boardContainer.appendChild(boxEl);
      }
    }

    const allCells = elements.boardContainer.querySelectorAll('.sudoku-cell');

    allCells.forEach((cell) => {
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      const val = state.board[r][c];
      const isInitial = state.initial[r][c];
      const currentBox = Math.floor(r / 3) * 3 + Math.floor(c / 3);

      cell.className = 'sudoku-cell';

      if (isStaggered) {
        cell.classList.add('stagger-in');
        cell.style.animationDelay = `${(r + c) * 22}ms`;
      } else {
        cell.style.animationDelay = '';
      }

      // 3-Tier Sightline Highlighting
      const isSelected = selected && selected.row === r && selected.col === c;
      if (isSelected) {
        // Tier 1: Selected cell (scale-up + 2px amethyst border)
        cell.classList.add('selected');
      } else if (selected) {
        // Tier 2: Peer cells (same row, col, or box)
        const isPeer =
          selected.row === r ||
          selected.col === c ||
          selectedBox === currentBox;
        if (isPeer) {
          cell.classList.add('highlighted');
        }
      }

      // Tier 3: Identical numbers across the board
      if (val !== 0 && selectedNum !== 0 && val === selectedNum && !isSelected) {
        cell.classList.add('matching-num');
      }

      // Typography & Value Display
      if (val !== 0) {
        cell.classList.add(isInitial ? 'initial-clue' : 'user-input');
        cell.textContent = val;
      } else {
        // Render 3x3 pencil notes mini-grid
        const notesSet = state.notes[r][c];
        if (notesSet && notesSet.size > 0) {
          let notesHtml = '<div class="notes-grid">';
          for (let n = 1; n <= 9; n++) {
            const hasNum = notesSet.has(n);
            notesHtml += `<span class="note-num ${hasNum ? '' : 'hidden'}">${n}</span>`;
          }
          notesHtml += '</div>';
          cell.innerHTML = notesHtml;
        } else {
          cell.textContent = '';
        }
      }
    });

    updateCompletion();
    updateKeypad();
    updateMistakeDots();
    updateDifficultySignalUI();
  }

  function selectCell(r, c) {
    triggerHaptic(10);
    state.selectedCell = { row: r, col: c };
    renderBoard(false);
  }

  // Check if a line or 3x3 box completed on move
  function checkPeerCompletions(r, c) {
    let rowComplete = true;
    let colComplete = true;
    let boxComplete = true;

    for (let i = 0; i < 9; i++) {
      if (state.board[r][i] === 0 || state.board[r][i] !== state.solution[r][i]) {
        rowComplete = false;
      }
      if (state.board[i][c] === 0 || state.board[i][c] !== state.solution[i][c]) {
        colComplete = false;
      }
    }

    const bRow = Math.floor(r / 3) * 3;
    const bCol = Math.floor(c / 3) * 3;
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const row = bRow + br;
        const col = bCol + bc;
        if (state.board[row][col] === 0 || state.board[row][col] !== state.solution[row][col]) {
          boxComplete = false;
        }
      }
    }

    if (rowComplete || colComplete || boxComplete) {
      triggerHaptic([15, 40, 25]); // Completion celebration haptic
    }
  }

  // ==========================================================================
  // 11. PLAYER ACTIONS & GAME RULES
  // ==========================================================================

  function handleNumberInput(num) {
    if (!state.selectedCell || state.status !== 'PLAYING') return;

    triggerHaptic(10); // Tap haptic

    const { row: r, col: c } = state.selectedCell;

    if (state.initial[r][c]) return;

    if (state.notesMode) {
      if (state.board[r][c] === 0) {
        pushUndoSnapshot();
        const set = state.notes[r][c];
        if (set.has(num)) {
          set.delete(num);
        } else {
          set.add(num);
        }
        renderBoard(false);
        saveActiveGame();
      }
      return;
    }

    // Direct Placement Mode
    const expected = state.solution[r][c];
    if (num === expected) {
      pushUndoSnapshot();
      state.board[r][c] = num;
      state.notes[r][c].clear();

      // Automatically prune notes in peer cells
      const bRow = Math.floor(r / 3) * 3;
      const bCol = Math.floor(c / 3) * 3;
      for (let i = 0; i < 9; i++) {
        state.notes[r][i].delete(num);
        state.notes[i][c].delete(num);
        const br = bRow + Math.floor(i / 3);
        const bc = bCol + (i % 3);
        state.notes[br][bc].delete(num);
      }

      renderBoard(false);
      saveActiveGame();
      checkPeerCompletions(r, c);

      if (checkWinCondition()) {
        handleWin();
      }
    } else {
      // INCORRECT PLACEMENT
      state.mistakes++;
      updateMistakeDots();
      triggerHaptic([40, 50, 40]); // Mistake penalty haptic

      triggerCellConflict(r, c);
      saveActiveGame();

      if (state.mistakes >= 3) {
        handleGameOver();
      }
    }
  }

  function triggerCellConflict(r, c) {
    const cellEl = elements.boardContainer.querySelector(
      `.sudoku-cell[data-row="${r}"][data-col="${c}"]`
    );
    if (cellEl) {
      cellEl.classList.add('conflict');
      setTimeout(() => {
        cellEl.classList.remove('conflict');
      }, 300);
    }
  }

  function handleErase() {
    if (!state.selectedCell || state.status !== 'PLAYING') return;
    triggerHaptic(10);

    const { row: r, col: c } = state.selectedCell;
    if (state.initial[r][c]) return;

    if (state.board[r][c] !== 0 || state.notes[r][c].size > 0) {
      pushUndoSnapshot();
      state.board[r][c] = 0;
      state.notes[r][c].clear();
      renderBoard(false);
      saveActiveGame();
    }
  }

  function handleUndo() {
    if (state.undoStack.length === 0 || state.status !== 'PLAYING') return;
    triggerHaptic(10);

    const prev = state.undoStack.pop();
    state.board = prev.board;
    state.notes = prev.notes;
    renderBoard(false);
    saveActiveGame();
  }

  function toggleNotesMode() {
    triggerHaptic(10);
    state.notesMode = !state.notesMode;
    if (elements.notesActiveDot) {
      elements.notesActiveDot.classList.toggle('hidden', !state.notesMode);
    }
  }

  function checkWinCondition() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (state.board[r][c] === 0 || state.board[r][c] !== state.solution[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  function handleWin() {
    state.status = 'WON';
    stopTimer();
    clearActiveGame();
    logGameHistory('WON');
    triggerHaptic([15, 40, 25]);
    showModal(true);
    playVictoryBurstAnimation();
  }

  function handleGameOver() {
    state.status = 'LOST';
    stopTimer();
    clearActiveGame();
    logGameHistory('LOST');
    showModal(false);
  }

  // ==========================================================================
  // 12. RESULT MODAL & GAME INITIALIZATION
  // ==========================================================================

  function showModal(isVictory) {
    if (!elements.modalResult) return;

    if (elements.modalResultTitle) {
      elements.modalResultTitle.textContent = isVictory ? 'BOARD COMPLETE' : 'GAME OVER';
    }
    if (elements.modalResultSubtitle) {
      elements.modalResultSubtitle.textContent = isVictory
        ? `Pristine deduction. ${state.mistakes} error${state.mistakes === 1 ? '' : 's'} made.`
        : 'Maximum mistakes reached (3/3).';
    }
    if (elements.modalStatTime) {
      elements.modalStatTime.textContent = formatTime(state.elapsedSeconds);
    }
    if (elements.modalStatDifficulty) {
      elements.modalStatDifficulty.textContent = state.difficulty;
    }

    elements.modalResult.classList.remove('hidden');
  }

  function hideModal() {
    if (elements.modalResult) {
      elements.modalResult.classList.add('hidden');
    }
  }

  function startNewGame(difficulty = 'MEDIUM') {
    hideModal();
    const diffUpper = difficulty.toUpperCase();
    state.difficulty = diffUpper;

    const { puzzle, solution } = generatePuzzle(diffUpper);

    state.solution = solution;
    state.board = cloneGrid(puzzle);
    state.initial = puzzle.map((row) => row.map((v) => v !== 0));
    state.notes = createNotesGrid();
    state.undoStack = [];
    state.mistakes = 0;
    state.notesMode = false;
    state.status = 'PLAYING';
    state.elapsedSeconds = 0;
    state.hasActiveGame = true;

    if (elements.notesActiveDot) {
      elements.notesActiveDot.classList.add('hidden');
    }

    // Auto-select first empty cell
    state.selectedCell = null;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (state.board[r][c] === 0) {
          state.selectedCell = { row: r, col: c };
          break;
        }
      }
      if (state.selectedCell) break;
    }

    renderBoard(true); // Staggered entry animation
    startTimer();
    saveActiveGame();
    navigateTo('view-game');
  }

  // ==========================================================================
  // 13. REMOTION MOTION ASSETS: 60FPS SPRING-PHYSICS ENGINES
  // ==========================================================================

  // --- HOME EMBLEM 60FPS ENGINE ---
  // 4-second seamless loop: 3x3 geometric grid pulsing and rotating in #9D7BFF and #F2EFF9 against #0F0E13
  let homeAnimFrameId = null;
  function startHomeCanvasAnimation() {
    if (!elements.canvasHome) return;
    const canvas = elements.canvasHome;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    stopHomeCanvasAnimation();

    const period = 4000; // 4000ms = 4 seconds seamless loop
    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    function draw(timestamp) {
      if (state.currentView !== 'view-home') return;

      const progress = (timestamp % period) / period; // 0 to 1
      const theta = progress * Math.PI * 2;

      // Pure Obsidian clear
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;

      ctx.save();
      ctx.translate(cx, cy);

      // Gentle rotation: smooth sine wave
      const rot = Math.sin(theta) * 0.08;
      ctx.rotate(rot);

      // Subtle pulse scale: 0.96 to 1.04
      const scale = 1 + Math.sin(theta) * 0.04;
      ctx.scale(scale, scale);

      // Outer faint dashed orbit ring in lavender mist
      ctx.beginPath();
      ctx.arc(0, 0, 72, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(242, 239, 249, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.stroke();

      // Inner amethyst accent ring
      ctx.beginPath();
      ctx.arc(0, 0, 54, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(157, 123, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 7]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3x3 geometric grid
      const sqSize = 18;
      const gap = 6;
      const start = -((3 * sqSize + 2 * gap) / 2) + sqSize / 2;

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const x = start + c * (sqSize + gap);
          const y = start + r * (sqSize + gap);
          const isCenter = r === 1 && c === 1;

          ctx.beginPath();
          ctx.roundRect(x - sqSize / 2, y - sqSize / 2, sqSize, sqSize, 4);

          if (isCenter) {
            // Center focal cell: Elevated surface obsidian + Amethyst accent
            ctx.fillStyle = '#181620';
            ctx.fill();
            ctx.strokeStyle = '#9D7BFF';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // Center crosshair in lavender
            ctx.beginPath();
            ctx.moveTo(x - 4, y);
            ctx.lineTo(x + 4, y);
            ctx.moveTo(x, y - 4);
            ctx.lineTo(x, y + 4);
            ctx.strokeStyle = '#F2EFF9';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
          } else {
            // Surrounding cells: subtle glow
            const cellPhase = theta + (r * 3 + c) * 0.35;
            const alpha = 0.25 + Math.sin(cellPhase) * 0.15;
            ctx.fillStyle = '#181620';
            ctx.fill();
            ctx.strokeStyle = `rgba(157, 123, 255, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      ctx.restore();

      homeAnimFrameId = window.requestAnimationFrame(draw);
    }

    homeAnimFrameId = window.requestAnimationFrame(draw);
  }

  function stopHomeCanvasAnimation() {
    if (homeAnimFrameId && typeof window !== 'undefined' && window.cancelAnimationFrame) {
      window.cancelAnimationFrame(homeAnimFrameId);
      homeAnimFrameId = null;
    }
  }

  // --- VICTORY BURST 60FPS SPRING-PHYSICS ENGINE ---
  // 2.5-second smooth spring-physics geometric expansion of 9 amethyst squares locking into place
  let victoryAnimFrameId = null;
  function playVictoryBurstAnimation() {
    if (!elements.canvasVictory) return;
    const canvas = elements.canvasVictory;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (victoryAnimFrameId) {
      if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(victoryAnimFrameId);
      }
      victoryAnimFrameId = null;
    }

    const dpr = window.devicePixelRatio || 1;
    const size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const startTime = performance.now();
    const duration = 2500; // 2.5 seconds

    // Damped harmonic spring function: Remotion spring physics model
    function springEasing(t) {
      // Damping = 12, Stiffness = 100
      const c = 0.5;
      const omega = 12;
      return 1 - Math.exp(-c * omega * t) * Math.cos(omega * t);
    }

    function render(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const t = progress * 2.2; // Spring timeframe

      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;

      ctx.save();
      ctx.translate(cx, cy);

      // Expansion spring value
      const springVal = springEasing(t);

      // Radial burst sparkle particles during first 1.2s
      if (progress < 0.6) {
        const burstT = progress / 0.6;
        const particleDist = burstT * 68;
        const alpha = Math.max(0, 1 - burstT);

        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const px = Math.cos(angle) * particleDist;
          const py = Math.sin(angle) * particleDist;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(157, 123, 255, ${alpha})`;
          ctx.fill();
        }
      }

      // Outer settlement ring
      const ringAlpha = Math.min(1, progress * 1.5) * 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, 48 * springVal, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(157, 123, 255, ${ringAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 9 Amethyst squares locking into place
      const targetSqSize = 16;
      const targetGap = 5;
      const fullGridWidth = 3 * targetSqSize + 2 * targetGap;
      const startOffset = -(fullGridWidth / 2) + targetSqSize / 2;

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const targetX = startOffset + c * (targetSqSize + targetGap);
          const targetY = startOffset + r * (targetSqSize + targetGap);

          // Animate position outwards from center using spring physics
          const curX = targetX * springVal;
          const curY = targetY * springVal;
          const curSize = Math.max(0, targetSqSize * springVal);

          ctx.beginPath();
          ctx.roundRect(curX - curSize / 2, curY - curSize / 2, curSize, curSize, 3);
          ctx.fillStyle = '#181620';
          ctx.fill();

          ctx.strokeStyle = '#9D7BFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Subtle victory checkmark in center square when locked
          if (r === 1 && c === 1 && progress > 0.4) {
            const checkAlpha = Math.min(1, (progress - 0.4) / 0.3);
            ctx.beginPath();
            ctx.moveTo(curX - 4, curY);
            ctx.lineTo(curX - 1, curY + 3);
            ctx.lineTo(curX + 4, curY - 3);
            ctx.strokeStyle = `rgba(242, 239, 249, ${checkAlpha})`;
            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        }
      }

      ctx.restore();

      if (progress < 1) {
        victoryAnimFrameId = window.requestAnimationFrame(render);
      }
    }

    victoryAnimFrameId = requestAnimationFrame(render);
  }

  // ==========================================================================
  // 14. EVENT LISTENERS
  // ==========================================================================

  function initEventListeners() {
    // Navigation back buttons
    document.querySelectorAll('.btn-nav-back').forEach((btn) => {
      btn.addEventListener('click', () => {
        triggerHaptic(10);
        const target = btn.dataset.target || 'view-home';
        navigateTo(target);
      });
    });

    // Home view actions
    if (elements.btnGotoLevels) {
      elements.btnGotoLevels.addEventListener('click', () => {
        triggerHaptic(10);
        navigateTo('view-levels');
      });
    }

    if (elements.btnGotoHistory) {
      elements.btnGotoHistory.addEventListener('click', () => {
        triggerHaptic(10);
        navigateTo('view-history');
      });
    }

    if (elements.btnHomeResume) {
      elements.btnHomeResume.addEventListener('click', () => {
        triggerHaptic(10);
        if (state.hasActiveGame) {
          startTimer();
          navigateTo('view-game');
        } else {
          startNewGame('MEDIUM');
        }
      });
    }

    // Level selection cards
    elements.levelCards.forEach((card) => {
      card.addEventListener('click', () => {
        triggerHaptic(10);
        const diff = (card.dataset.difficulty || 'medium').toUpperCase();
        startNewGame(diff);
      });
    });

    // Difficulty signal cycle in header
    if (elements.btnDiffSignal) {
      elements.btnDiffSignal.addEventListener('click', () => {
        triggerHaptic(10);
        const cycle = { EASY: 'MEDIUM', MEDIUM: 'HARD', HARD: 'EASY' };
        const nextDiff = cycle[state.difficulty] || 'MEDIUM';
        startNewGame(nextDiff);
      });
    }

    // Game Arena back button (pauses timer and saves active state)
    if (elements.btnGameBack) {
      elements.btnGameBack.addEventListener('click', () => {
        triggerHaptic(10);
        stopTimer();
        saveActiveGame();
        navigateTo('view-home');
      });
    }

    // Floating Utility Row
    if (elements.btnUndo) {
      elements.btnUndo.addEventListener('click', handleUndo);
    }

    if (elements.btnNotes) {
      elements.btnNotes.addEventListener('click', toggleNotesMode);
    }

    // Keypad numbers (1-9)
    elements.keyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = parseInt(btn.dataset.key, 10);
        if (key >= 1 && key <= 9) {
          handleNumberInput(key);
        }
      });
    });

    // Keypad erase button
    if (elements.btnErase) {
      elements.btnErase.addEventListener('click', handleErase);
    }

    // Modal action buttons
    if (elements.btnModalPlayAgain) {
      elements.btnModalPlayAgain.addEventListener('click', () => {
        triggerHaptic(10);
        startNewGame(state.difficulty);
      });
    }

    if (elements.btnModalHome) {
      elements.btnModalHome.addEventListener('click', () => {
        triggerHaptic(10);
        hideModal();
        navigateTo('view-home');
      });
    }

    // Desktop Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (state.status !== 'PLAYING') return;

      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleErase();
      } else if (e.key === 'n' || e.key === 'N') {
        toggleNotesMode();
      } else if ((e.ctrlKey && (e.key === 'z' || e.key === 'Z')) || e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleUndo();
      } else if (e.key.startsWith('Arrow')) {
        if (!state.selectedCell) {
          selectCell(0, 0);
          return;
        }
        let { row, col } = state.selectedCell;
        if (e.key === 'ArrowUp') row = (row + 8) % 9;
        else if (e.key === 'ArrowDown') row = (row + 1) % 9;
        else if (e.key === 'ArrowLeft') col = (col + 8) % 9;
        else if (e.key === 'ArrowRight') col = (col + 1) % 9;
        triggerHaptic(10);
        selectCell(row, col);
      }
    });
  }

  // ==========================================================================
  // 15. INITIALIZATION LIFECYCLE
  // ==========================================================================

  function init() {
    initEventListeners();

    // Check for saved active game from previous session
    const hasRestored = loadActiveGame();
    if (!hasRestored) {
      // Pre-initialize a default board
      startNewGame('MEDIUM');
    }

    renderHistoryAndStats();
    navigateTo('view-home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Debugging & test harness exports
  window.SudokuEngine = {
    generatePuzzle,
    countSolutions,
    startNewGame,
    selectCell,
    handleNumberInput,
    handleErase,
    handleUndo,
    toggleNotesMode,
    navigateTo,
    triggerHaptic,
    saveActiveGame,
    loadActiveGame,
    getHistoryRecords,
    getState: () => ({ ...state }),
  };
})();
