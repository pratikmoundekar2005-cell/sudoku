/**
 * AUTOMATED E2E BOT PLAYTHROUGH & STRESS TEST HARNESS
 * Minimal Sudoku v1.1.0
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const HTML_SOURCE = fs.readFileSync(path.join(ROOT_DIR, 'www', 'index.html'), 'utf8');
const JS_SOURCE = fs.readFileSync(path.join(ROOT_DIR, 'www', 'app.js'), 'utf8');

// Colors for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function logPass(msg) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function logSuite(title) {
  console.log(`\n${BOLD}${CYAN}▶ ${title}${RESET}`);
}

/**
 * Creates an isolated browser environment simulating a user device
 */
function createEnv(initialStorage = {}) {
  const dom = new JSDOM(HTML_SOURCE, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // Mock Canvas 2D context to prevent unhandled headless warnings
  window.HTMLCanvasElement.prototype.getContext = function () {
    return {
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      arc: () => {},
      stroke: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      roundRect: () => {},
      scale: () => {},
      rotate: () => {},
      translate: () => {},
      setLineDash: () => {},
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
    };
  };

  // Mock vibration
  window.navigator.vibrate = () => true;

  // Mock matchMedia for prefers-reduced-motion
  window.matchMedia =
    window.matchMedia ||
    function (query) {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };

  // Mock animation frames
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);

  // Seed storage
  for (const [k, v] of Object.entries(initialStorage)) {
    window.localStorage.setItem(k, v);
  }

  // Enable test harness
  window.__DEV__ = true;

  // Execute app code
  window.eval(JS_SOURCE);

  // Dispatch DOMContentLoaded so app.js init() executes immediately
  if (window.document.readyState === 'loading') {
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  }

  return {
    dom,
    window,
    document: window.document,
    engine: window.SudokuEngine,
    state: window.SudokuEngine.getState,
  };
}

async function runTestSuite() {
  console.log(`${BOLD}══════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}   MINIMAL SUDOKU v1.1.0 — COMPREHENSIVE AUTOMATED E2E BOT SUITE   ${RESET}`);
  console.log(`${BOLD}══════════════════════════════════════════════════════════════════${RESET}`);

  const startTime = Date.now();
  let totalTests = 0;

  // =========================================================================
  // TEST SUITE 1: ENGINE STRESS TEST (150 PUZZLES)
  // =========================================================================
  logSuite('SUITE 1: Engine Stress & Uniqueness Verification (150 Puzzles)');
  {
    const { engine } = createEnv();
    const difficulties = [
      { name: 'EASY', count: 50, expectedClues: 47 },
      { name: 'MEDIUM', count: 50, expectedClues: 36 },
      { name: 'HARD', count: 50, expectedClues: 28 },
    ];

    for (const diff of difficulties) {
      process.stdout.write(`  Generating & solving ${diff.count} ${diff.name} puzzles... `);
      for (let i = 0; i < diff.count; i++) {
        const { puzzle, solution } = engine.generatePuzzle(diff.name);

        // 1. Solution validity (1-9 in every row, col, box)
        for (let r = 0; r < 9; r++) {
          const rowSet = new Set(solution[r]);
          assert.strictEqual(rowSet.size, 9, `Row ${r} in solution must contain 1-9 without duplicates`);
          assert.ok(!rowSet.has(0), `Row ${r} must contain no 0s`);
        }
        for (let c = 0; c < 9; c++) {
          const colSet = new Set();
          for (let r = 0; r < 9; r++) colSet.add(solution[r][c]);
          assert.strictEqual(colSet.size, 9, `Col ${c} in solution must contain 1-9`);
        }
        for (let b = 0; b < 9; b++) {
          const boxSet = new Set();
          const br = Math.floor(b / 3) * 3;
          const bc = (b % 3) * 3;
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              boxSet.add(solution[br + r][bc + c]);
            }
          }
          assert.strictEqual(boxSet.size, 9, `Box ${b} in solution must contain 1-9`);
        }

        // 2. Clue count check
        const clues = puzzle.flat().filter((x) => x !== 0).length;
        assert.strictEqual(
          clues,
          diff.expectedClues,
          `${diff.name} puzzle #${i + 1} has ${clues} clues, expected ${diff.expectedClues}`
        );

        // 3. Unique solution check
        const solutions = engine.countSolutions(puzzle, 2);
        assert.strictEqual(
          solutions,
          1,
          `${diff.name} puzzle #${i + 1} must have exactly 1 unique solution`
        );
      }
      console.log(`${GREEN}Done (100% Valid)${RESET}`);
      totalTests += diff.count;
    }
    logPass('150/150 generated puzzles rigorously proven unique and structurally valid');
  }

  // =========================================================================
  // TEST SUITE 2: FRESH BOOT & KEYBOARD GUARD TEST
  // =========================================================================
  logSuite('SUITE 2: Fresh Boot & Hardware/Keyboard Input Guard');
  {
    const { window, document, engine } = createEnv();
    const state = engine.getState();

    // 1. Initial view must be Home
    assert.strictEqual(
      document.getElementById('view-home').classList.contains('active'),
      true,
      'Home view must be active on fresh boot'
    );
    assert.strictEqual(
      document.getElementById('view-game').classList.contains('active'),
      false,
      'Game view must not be active on fresh boot'
    );

    // 2. Resume card hidden & no active game
    assert.strictEqual(
      document.getElementById('home-resume-card').classList.contains('hidden'),
      true,
      'Resume card must be hidden when no game exists'
    );
    assert.strictEqual(state.hasActiveGame, false, 'hasActiveGame must be false on fresh boot');
    assert.strictEqual(state.timerInterval, null, 'Timer must NOT be running on boot');
    assert.strictEqual(
      window.localStorage.getItem('sudoku_active_game'),
      null,
      'No active ghost game in localStorage'
    );

    // 3. Dispatching keyboard input on Home view must be safely ignored
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '5', bubbles: true }));
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'n', bubbles: true }));

    const afterState = engine.getState();
    assert.strictEqual(afterState.status, 'PLAYING');
    assert.strictEqual(afterState.notesMode, false, 'Notes mode must not toggle while on Home');
    assert.strictEqual(afterState.mistakes, 0, 'Mistakes must not change while on Home');

    // 4. Escape on Home view does not throw or crash
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.strictEqual(
      document.getElementById('view-home').classList.contains('active'),
      true
    );

    logPass('Fresh boot renders cleanly without ghost game or running timer');
    logPass('Global keyboard handler strictly ignores non-game inputs on Home');
    totalTests += 4;
  }

  // =========================================================================
  // TEST SUITE 3: FULL BOT PLAYTHROUGHS (EASY, MEDIUM, HARD)
  // =========================================================================
  logSuite('SUITE 3: Full Bot Autonomous Playthroughs & State Transitions');
  {
    const difficulties = ['EASY', 'MEDIUM', 'HARD'];

    for (const diff of difficulties) {
      const { window, document, engine } = createEnv();

      // Bot navigates to levels and selects difficulty
      const levelCard = document.querySelector(`.level-card[data-difficulty="${diff.toLowerCase()}"]`);
      assert.ok(levelCard, `Level card for ${diff} must exist`);
      levelCard.click();

      const state = engine.getState();
      assert.strictEqual(state.difficulty, diff);
      assert.strictEqual(
        document.getElementById('view-game').classList.contains('active'),
        true,
        'Active view must transition to view-game'
      );
      assert.ok(state.timerInterval !== null, 'Timer must be actively running in view-game');

      // 1. Initial progress ring must read '0'
      const progressText = document.getElementById('game-progress-text');
      assert.strictEqual(
        progressText.textContent.trim(),
        '0',
        `New game on ${diff} must start at exactly 0% completion`
      );

      // 2. Test Notes Mode & Automatic Peer Note Pruning
      // Find two empty cells in the same row
      let targetRow = -1;
      let colA = -1;
      let colB = -1;
      for (let r = 0; r < 9; r++) {
        const empties = [];
        for (let c = 0; c < 9; c++) {
          if (state.board[r][c] === 0) empties.push(c);
        }
        if (empties.length >= 2) {
          targetRow = r;
          colA = empties[0];
          colB = empties[1];
          break;
        }
      }
      assert.ok(targetRow !== -1, 'Must find a row with at least 2 empty cells');

      // Select cell A, toggle notes, add note for cell A's solution
      engine.selectCell(targetRow, colA);
      engine.toggleNotesMode();
      assert.strictEqual(engine.getState().notesMode, true);
      assert.strictEqual(
        document.getElementById('notes-active-dot').classList.contains('hidden'),
        false
      );

      const correctNumA = state.solution[targetRow][colA];
      engine.handleNumberInput(correctNumA);
      assert.ok(
        engine.getState().notes[targetRow][colA].has(correctNumA),
        'Pencil note must be stored in cell A'
      );

      // Select cell B, add same note
      engine.selectCell(targetRow, colB);
      engine.handleNumberInput(correctNumA);
      assert.ok(
        engine.getState().notes[targetRow][colB].has(correctNumA),
        'Pencil note must be stored in peer cell B'
      );

      // Toggle Notes mode OFF
      engine.toggleNotesMode();
      assert.strictEqual(engine.getState().notesMode, false);

      // Place correct number into cell A
      engine.selectCell(targetRow, colA);
      engine.handleNumberInput(correctNumA);
      assert.strictEqual(
        engine.getState().board[targetRow][colA],
        correctNumA,
        'Direct number must be placed on board'
      );

      // Assert peer cell B automatically had correctNumA pruned from its pencil notes!
      assert.ok(
        !engine.getState().notes[targetRow][colB].has(correctNumA),
        'Peer cell in same row must automatically prune placed note'
      );

      // 3. Test Undo Stack Cap (50 items max) & Erase
      engine.toggleNotesMode();
      for (let i = 0; i < 65; i++) {
        // Toggle note 9 on cell B repeatedly
        engine.selectCell(targetRow, colB);
        engine.handleNumberInput(9);
      }
      engine.toggleNotesMode();

      assert.ok(
        engine.getState().undoStack.length <= 50,
        `Undo stack must be capped at 50, actual: ${engine.getState().undoStack.length}`
      );

      // Test handleUndo()
      const stackLenBeforeUndo = engine.getState().undoStack.length;
      engine.handleUndo();
      assert.strictEqual(
        engine.getState().undoStack.length,
        stackLenBeforeUndo - 1,
        'handleUndo() must pop from undo stack'
      );

      // Test handleErase()
      engine.selectCell(targetRow, colB);
      engine.handleErase();
      assert.strictEqual(engine.getState().board[targetRow][colB], 0);
      assert.strictEqual(engine.getState().notes[targetRow][colB].size, 0);

      // 4. Autonomous Bot Solves All Empty Cells
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (engine.getState().board[r][c] === 0) {
            engine.selectCell(r, c);
            const sol = state.solution[r][c];
            engine.handleNumberInput(sol);
          }
        }
      }

      // Assert Final Solved State
      const finalState = engine.getState();
      assert.strictEqual(finalState.status, 'WON', `Status on completion must be WON`);
      assert.strictEqual(progressText.textContent.trim(), '100', 'Progress must read 100%');
      assert.strictEqual(
        document.getElementById('modal-result').classList.contains('hidden'),
        false,
        'Victory modal must open on win'
      );
      assert.strictEqual(
        document.getElementById('modal-result-title').textContent.trim(),
        'BOARD COMPLETE'
      );

      // Assert keypad buttons are all dimmed/completed
      document.querySelectorAll('.key-btn[data-key]:not(#btn-erase)').forEach((btn) => {
        assert.ok(
          btn.classList.contains('completed'),
          `Keypad button ${btn.dataset.key} must be marked completed`
        );
      });

      // Assert win record saved in history
      const history = engine.getHistoryRecords();
      assert.ok(history.length > 0, 'History record must be saved');
      assert.strictEqual(history[0].result, 'WON');
      assert.strictEqual(history[0].difficulty, diff);

      logPass(`Full bot playthrough completed for ${diff} (0% -> 100%, Victory Modal, History Logged)`);
      totalTests += 7;
    }
  }

  // =========================================================================
  // TEST SUITE 4: MISTAKE & GAME OVER SIMULATION
  // =========================================================================
  logSuite('SUITE 4: Mistake Accumulation & Game Over Trigger');
  {
    const { document, engine } = createEnv();
    engine.startNewGame('EASY');

    const state = engine.getState();
    // Find an empty cell
    let r = -1, c = -1;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (state.board[i][j] === 0) {
          r = i;
          c = j;
          break;
        }
      }
      if (r !== -1) break;
    }

    engine.selectCell(r, c);
    const correct = state.solution[r][c];
    const wrong = (correct % 9) + 1;

    // 1st mistake
    engine.handleNumberInput(wrong);
    assert.strictEqual(engine.getState().mistakes, 1);
    assert.ok(
      document.querySelector('.mistake-dot[data-index="0"]').classList.contains('active'),
      'Dot 0 must be active'
    );
    assert.strictEqual(engine.getState().status, 'PLAYING');

    // 2nd mistake
    engine.handleNumberInput(wrong);
    assert.strictEqual(engine.getState().mistakes, 2);
    assert.ok(
      document.querySelector('.mistake-dot[data-index="1"]').classList.contains('active'),
      'Dot 1 must be active'
    );
    assert.strictEqual(engine.getState().status, 'PLAYING');

    // 3rd mistake -> Game Over
    engine.handleNumberInput(wrong);
    assert.strictEqual(engine.getState().mistakes, 3);
    assert.strictEqual(engine.getState().status, 'LOST');
    assert.strictEqual(
      document.getElementById('modal-result').classList.contains('hidden'),
      false,
      'Modal result must open on loss'
    );
    assert.strictEqual(
      document.getElementById('modal-result-title').textContent.trim(),
      'GAME OVER'
    );

    // Assert loss record in history
    const history = engine.getHistoryRecords();
    assert.ok(history.length > 0);
    assert.strictEqual(history[0].result, 'LOST');

    logPass('Mistakes increment 1 -> 2 -> 3, mistake dots illuminate, Game Over modal triggers cleanly');
    totalTests += 5;
  }

  // =========================================================================
  // TEST SUITE 5: CORRUPT SAVE RECOVERY & ACCIDENTAL OVERWRITE PROTECTION
  // =========================================================================
  logSuite('SUITE 5: Corrupt Save Recovery & Overwrite Protection');
  {
    // 1. Malformed JSON recovery
    {
      const { window, engine } = createEnv({
        sudoku_active_game: '{broken json: [1, 2, 3}}',
      });
      assert.strictEqual(engine.getState().hasActiveGame, false);
      assert.strictEqual(
        window.localStorage.getItem('sudoku_active_game'),
        null,
        'Malformed active game must be purged from localStorage'
      );
    }

    // 2. Schema version mismatch recovery
    {
      const { window, engine } = createEnv({
        sudoku_active_game: JSON.stringify({ version: 1, board: [] }),
      });
      assert.strictEqual(engine.getState().hasActiveGame, false);
      assert.strictEqual(
        window.localStorage.getItem('sudoku_active_game'),
        null,
        'Old schema save must be purged'
      );
    }

    // 3. Invalid board dimensions recovery
    {
      const { window, engine } = createEnv({
        sudoku_active_game: JSON.stringify({
          version: 2,
          board: [[1, 2, 3]],
          solution: [[1]],
          initial: [[true]],
          notes: [],
        }),
      });
      assert.strictEqual(engine.getState().hasActiveGame, false);
      assert.strictEqual(
        window.localStorage.getItem('sudoku_active_game'),
        null,
        'Corrupt dimensions must be purged'
      );
    }

    // 4. Accidental Overwrite Protection
    {
      const { document, engine } = createEnv();
      engine.startNewGame('MEDIUM');

      // Player fills one cell
      const state = engine.getState();
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (state.board[r][c] === 0) {
            engine.selectCell(r, c);
            engine.handleNumberInput(state.solution[r][c]);
            break;
          }
        }
        if (state.undoStack.length > 0) break;
      }

      // User attempts to start new game on HARD via level card
      const hardCard = document.querySelector('.level-card[data-difficulty="hard"]');
      hardCard.click();

      // Assert confirmation modal is shown!
      assert.strictEqual(
        document.getElementById('modal-confirm').classList.contains('hidden'),
        false,
        'Confirmation modal must appear when active game has progress'
      );

      // Cancel keeps current game
      document.getElementById('btn-cancel-new-game').click();
      assert.strictEqual(
        document.getElementById('modal-confirm').classList.contains('hidden'),
        true
      );
      assert.strictEqual(engine.getState().difficulty, 'MEDIUM');

      // Click again and confirm overwrite
      hardCard.click();
      document.getElementById('btn-confirm-new-game').click();
      assert.strictEqual(
        document.getElementById('modal-confirm').classList.contains('hidden'),
        true
      );
      assert.strictEqual(engine.getState().difficulty, 'HARD');
    }

    logPass('Corrupted JSON, outdated schema versions, and invalid grids recover gracefully');
    logPass('Accidental overwrite confirmation modal protects in-progress games');
    totalTests += 5;
  }

  // =========================================================================
  // TEST SUITE 6: REDO STACK & BIDIRECTIONAL UNDO/REDO ENGINE
  // =========================================================================
  logSuite('SUITE 6: Bidirectional Undo/Redo & Stack Limits');
  {
    const { document, engine } = createEnv();
    engine.startNewGame('EASY');

    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');

    // Initially both stacks empty
    assert.strictEqual(engine.getState().undoStack.length, 0);
    assert.strictEqual(engine.getState().redoStack.length, 0);
    assert.ok(btnUndo.classList.contains('btn-disabled'), 'Undo button must be disabled initially');
    assert.ok(btnRedo.classList.contains('btn-disabled'), 'Redo button must be disabled initially');

    // Find empty cell
    const state = engine.getState();
    let r = -1, c = -1;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (state.board[i][j] === 0) {
          r = i;
          c = j;
          break;
        }
      }
      if (r !== -1) break;
    }

    const sol = state.solution[r][c];
    engine.selectCell(r, c);
    engine.handleNumberInput(sol);

    // After move: undoStack = 1, redoStack = 0
    assert.strictEqual(engine.getState().board[r][c], sol);
    assert.strictEqual(engine.getState().undoStack.length, 1);
    assert.strictEqual(engine.getState().redoStack.length, 0);
    assert.ok(!btnUndo.classList.contains('btn-disabled'), 'Undo button enabled after move');
    assert.ok(btnRedo.classList.contains('btn-disabled'), 'Redo button disabled after move');

    // Undo the move
    engine.handleUndo();
    assert.strictEqual(engine.getState().board[r][c], 0, 'Cell reverted to 0');
    assert.strictEqual(engine.getState().undoStack.length, 0);
    assert.strictEqual(engine.getState().redoStack.length, 1, 'Redo stack has 1 snapshot');
    assert.ok(btnUndo.classList.contains('btn-disabled'), 'Undo button disabled');
    assert.ok(!btnRedo.classList.contains('btn-disabled'), 'Redo button enabled');

    // Redo the move
    engine.handleRedo();
    assert.strictEqual(engine.getState().board[r][c], sol, 'Cell restored to solution value');
    assert.strictEqual(engine.getState().undoStack.length, 1);
    assert.strictEqual(engine.getState().redoStack.length, 0);

    // Undo again, then make a new move -> Redo stack must be cleared
    engine.handleUndo();
    assert.strictEqual(engine.getState().redoStack.length, 1);
    engine.toggleNotesMode();
    engine.selectCell(r, c);
    engine.handleNumberInput(sol);
    assert.strictEqual(engine.getState().redoStack.length, 0, 'New action clears redo stack');
    engine.toggleNotesMode();

    logPass('Full bidirectional Undo/Redo cycles function with immediate UI updates');
    totalTests += 6;
  }

  // =========================================================================
  // TEST SUITE 7: EXPLAINABLE SMART HINT ENGINE
  // =========================================================================
  logSuite('SUITE 7: Explainable Smart Hint Engine & Conflict Diagnosis');
  {
    const { document, engine } = createEnv();
    engine.startNewGame('EASY');

    const hint = engine.computeSmartHint();
    assert.ok(hint, 'Smart hint must be computed');
    assert.ok(
      ['NAKED SINGLE', 'HIDDEN SINGLE', 'LOGICAL STEP'].includes(hint.type),
      `Hint type must be valid technique: ${hint.type}`
    );
    assert.strictEqual(
      hint.targetVal,
      engine.getState().solution[hint.row][hint.col],
      'Hint target value must match board solution'
    );
    assert.ok(hint.explanation.length > 10, 'Hint explanation must be descriptive');

    // Trigger hint via UI
    document.getElementById('btn-hint').click();
    assert.strictEqual(
      document.getElementById('hint-banner').classList.contains('hidden'),
      false,
      'Hint banner must open'
    );
    assert.strictEqual(
      document.getElementById('hint-type-badge').textContent.trim(),
      hint.type
    );

    // Apply hint via button
    document.getElementById('btn-apply-hint').click();
    assert.strictEqual(
      engine.getState().board[hint.row][hint.col],
      hint.targetVal,
      'Cell must be filled with hint value'
    );
    assert.strictEqual(
      document.getElementById('hint-banner').classList.contains('hidden'),
      true,
      'Hint banner must dismiss on apply'
    );

    // Test conflict diagnosis
    let emptyR = -1, emptyC = -1;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (engine.getState().board[i][j] === 0) {
          emptyR = i;
          emptyC = j;
          break;
        }
      }
      if (emptyR !== -1) break;
    }
    const wrongVal = (engine.getState().solution[emptyR][emptyC] % 9) + 1;
    engine.getState().board[emptyR][emptyC] = wrongVal; // inject conflict

    const conflictHint = engine.computeSmartHint();
    assert.ok(conflictHint, 'Conflict hint must be returned');
    assert.strictEqual(conflictHint.type, 'CONFLICT FOUND');
    assert.strictEqual(conflictHint.row, emptyR);
    assert.strictEqual(conflictHint.col, emptyC);

    logPass('Smart hints accurately identify Singles, explain deductions, and diagnose conflicts');
    totalTests += 7;
  }

  // =========================================================================
  // TEST SUITE 8: RELAXED MODE VS CLASSIC MODE
  // =========================================================================
  logSuite('SUITE 8: Relaxed Mode vs Classic Mode (Mistake Handling)');
  {
    const { document, engine } = createEnv();
    engine.startNewGame('EASY');

    // 1. Enable Relaxed Mode
    engine.setSettings({ relaxedMode: true });
    assert.strictEqual(engine.getState().settings.relaxedMode, true);
    assert.ok(
      document.getElementById('mistake-container').textContent.includes('RELAXED'),
      'Header reflects relaxed mode'
    );

    let r = -1, c = -1;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (engine.getState().board[i][j] === 0) {
          r = i;
          c = j;
          break;
        }
      }
      if (r !== -1) break;
    }
    engine.selectCell(r, c);
    const wrong = (engine.getState().solution[r][c] % 9) + 1;

    // Input 4 consecutive wrong entries in relaxed mode
    engine.handleNumberInput(wrong);
    engine.handleNumberInput(wrong);
    engine.handleNumberInput(wrong);
    engine.handleNumberInput(wrong);

    assert.strictEqual(engine.getState().mistakes, 4);
    assert.strictEqual(
      engine.getState().status,
      'PLAYING',
      'Relaxed mode must never trigger Game Over on mistakes'
    );
    assert.strictEqual(
      document.getElementById('modal-result').classList.contains('hidden'),
      true,
      'Modal result must remain hidden'
    );

    // 2. Switch back to Classic Mode
    engine.setSettings({ relaxedMode: false });
    // Next mistake in classic mode (with mistakes >= 3) triggers Game Over
    engine.handleNumberInput(wrong);
    assert.strictEqual(engine.getState().status, 'LOST');
    assert.strictEqual(
      document.getElementById('modal-result').classList.contains('hidden'),
      false,
      'Modal result triggers in classic mode'
    );

    logPass('Relaxed Mode allows unlimited mistakes without game over; Classic Mode strictly enforces limit');
    totalTests += 5;
  }

  // =========================================================================
  // TEST SUITE 9: DETERMINISTIC DAILY CHALLENGE & STREAK TRACKING
  // =========================================================================
  logSuite('SUITE 9: Deterministic Daily Challenge & Streak Tracking');
  {
    const { engine, window } = createEnv();

    const d1 = engine.generateDailyPuzzle('2026-10-16');
    const d2 = engine.generateDailyPuzzle('2026-10-16');
    const d3 = engine.generateDailyPuzzle('2026-10-17');

    // 1. Same date produces byte-identical puzzle & solution
    assert.deepStrictEqual(d1.puzzle, d2.puzzle, 'Puzzles for same date must match 100%');
    assert.deepStrictEqual(d1.solution, d2.solution, 'Solutions for same date must match 100%');

    // 2. Different date produces different puzzle
    assert.notDeepStrictEqual(d1.puzzle, d3.puzzle, 'Different dates must produce different boards');

    // 3. Play & solve Daily puzzle
    engine.startNewGame('DAILY', true);
    assert.strictEqual(engine.getState().difficulty, 'DAILY');
    assert.strictEqual(engine.getState().isDaily, true);

    // Solve the daily board
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (engine.getState().board[r][c] === 0) {
          engine.selectCell(r, c);
          engine.handleNumberInput(engine.getState().solution[r][c]);
        }
      }
    }

    assert.strictEqual(engine.getState().status, 'WON');
    const dailyState = engine.getDailyState();
    assert.ok(dailyState, 'Daily state must be saved');
    assert.strictEqual(dailyState.completed, true);

    logPass('Daily puzzles are 100% deterministic by date and record persistent streak completion');
    totalTests += 5;
  }

  // =========================================================================
  // TEST SUITE 10: DEEP SAVE INTEGRITY & CLUE IMMUTABILITY
  // =========================================================================
  logSuite('SUITE 10: Deep Save Integrity & Clue Immutability');
  {
    // 1. Contradictory clues check (clue != solution)
    const validSol = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => ((r * 3 + Math.floor(r / 3) + c) % 9) + 1)
    );
    const corruptCluesSave = {
      version: 3,
      solution: validSol,
      initial: Array.from({ length: 9 }, () => Array(9).fill(false)),
      board: Array.from({ length: 9 }, () => Array(9).fill(0)),
      notes: Array.from({ length: 9 }, () => Array(9).fill([])),
    };
    // Make cell (0,0) an initial clue with value 9, while solution is validSol[0][0]
    corruptCluesSave.initial[0][0] = true;
    corruptCluesSave.board[0][0] = (validSol[0][0] % 9) + 1; // mismatch!

    const { engine } = createEnv({
      sudoku_active_game: JSON.stringify(corruptCluesSave),
    });
    assert.strictEqual(
      engine.getState().hasActiveGame,
      false,
      'Contradictory clue mismatch must be rejected'
    );

    // 2. Redo stack persistence across save/reload
    const { window: win2, engine: eng2 } = createEnv();
    eng2.startNewGame('EASY');
    const st2 = eng2.getState();
    let r = -1, c = -1;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (st2.board[i][j] === 0) { r = i; c = j; break; }
      }
      if (r !== -1) break;
    }
    eng2.selectCell(r, c);
    eng2.handleNumberInput(st2.solution[r][c]);
    eng2.handleUndo(); // Pushes to redo stack
    eng2.saveActiveGame();

    const savedRaw = win2.localStorage.getItem('sudoku_active_game');
    assert.ok(savedRaw, 'Active game saved to localStorage');

    // Load in fresh instance
    const { engine: eng3 } = createEnv({
      sudoku_active_game: savedRaw,
    });
    assert.strictEqual(eng3.getState().hasActiveGame, true);
    assert.strictEqual(eng3.getState().redoStack.length, 1, 'Redo stack survived save & restore');
    eng3.handleRedo();
    assert.strictEqual(
      eng3.getState().board[r][c],
      st2.solution[r][c],
      'Redo after restore correctly places number'
    );

    logPass('Deep save integrity guards prevent clue contradictions and preserve undo/redo state');
    totalTests += 4;
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n${BOLD}══════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${GREEN}✔ ALL ${totalTests} TESTS PASSED PERFECTLY IN ${elapsed}s (100% GREEN)${RESET}`);
  console.log(`${BOLD}══════════════════════════════════════════════════════════════════${RESET}\n`);
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error(`\n${BOLD}${RED}✘ TEST FAILED:${RESET}`, err);
  process.exit(1);
});
