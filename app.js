const boardElement = document.querySelector("#board");
const messageElement = document.querySelector("#message");
const timerElement = document.querySelector("#timer");
const difficultyElement = document.querySelector("#difficulty");
const puzzleNumberElement = document.querySelector("#puzzle-number");
const notesButton = document.querySelector("#notes");

const easyPuzzle = [
  "530070000",
  "600195000",
  "098000060",
  "800060003",
  "400803001",
  "700020006",
  "060000280",
  "000419005",
  "000080079",
].join("").split("").map(Number);
const easySolution = [
  "534678912",
  "672195348",
  "198342567",
  "859761423",
  "426853791",
  "713924856",
  "961537284",
  "287419635",
  "345286179",
].join("").split("").map(Number);

let puzzle = [];
let solution = [];
let values = [];
let notes = [];
let selectedCell = -1;
let elapsedSeconds = 0;
let puzzleNumber = 0;
let hasWon = false;
let noteMode = false;

function isSafe(grid, row, column, value) {
  for (let position = 0; position < 9; position++) {
    if (grid[row * 9 + position] === value || grid[position * 9 + column] === value) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxColumn = Math.floor(column / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxColumn; c < boxColumn + 3; c++) {
      if (grid[r * 9 + c] === value) return false;
    }
  }
  return true;
}

function solve(grid, randomize = false) {
  let bestIndex = -1;
  let bestCandidates = null;
  for (let index = 0; index < 81; index++) {
    if (grid[index]) continue;
    const row = Math.floor(index / 9);
    const column = index % 9;
    const candidates = [];
    for (let value = 1; value <= 9; value++) {
      if (isSafe(grid, row, column, value)) candidates.push(value);
    }
    if (candidates.length === 0) return false;
    if (bestCandidates === null || candidates.length < bestCandidates.length) {
      bestIndex = index;
      bestCandidates = candidates;
      if (candidates.length === 1) break;
    }
  }
  if (bestIndex === -1) return true;
  if (randomize) bestCandidates.sort(() => Math.random() - 0.5);

  for (const value of bestCandidates) {
    grid[bestIndex] = value;
    if (solve(grid, randomize)) return true;
    grid[bestIndex] = 0;
  }
  return false;
}

function countSolutions(grid, limit = 2) {
  let bestIndex = -1;
  let bestCandidates = null;
  for (let index = 0; index < 81; index++) {
    if (grid[index]) continue;
    const row = Math.floor(index / 9);
    const column = index % 9;
    const candidates = [];
    for (let value = 1; value <= 9; value++) {
      if (isSafe(grid, row, column, value)) candidates.push(value);
    }
    if (candidates.length === 0) return 0;
    if (bestCandidates === null || candidates.length < bestCandidates.length) {
      bestIndex = index;
      bestCandidates = candidates;
      if (candidates.length === 1) break;
    }
  }
  if (bestIndex === -1) return 1;

  let count = 0;
  for (const value of bestCandidates) {
    grid[bestIndex] = value;
    count += countSolutions(grid, limit - count);
    grid[bestIndex] = 0;
    if (count >= limit) return count;
  }
  return count;
}

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function createGeneratedPuzzle(difficulty) {
  const grid = Array(81).fill(0);
  if (!solve(grid, true)) throw new Error("Could not generate a Sudoku solution.");
  const answer = [...grid];
  const targetClues = { medium: 36, hard: 30 }[difficulty];
  const indices = shuffled(Array.from({ length: 81 }, (_, index) => index));
  let clues = 81;

  for (const index of indices) {
    if (clues <= targetClues) break;
    const savedValue = grid[index];
    grid[index] = 0;
    if (countSolutions([...grid]) === 1) clues--;
    else grid[index] = savedValue;
  }
  return { puzzle: grid, solution: answer };
}

function startGame() {
  hasWon = false;
  selectedCell = -1;
  elapsedSeconds = 0;
  puzzleNumber += 1;
  puzzleNumberElement.textContent = String(puzzleNumber).padStart(2, "0");

  if (difficultyElement.value === "easy") {
    puzzle = [...easyPuzzle];
    solution = [...easySolution];
  } else {
    const generated = createGeneratedPuzzle(difficultyElement.value);
    puzzle = generated.puzzle;
    solution = generated.solution;
  }
  values = [...puzzle];
  notes = Array.from({ length: 81 }, () => new Set());
  timerElement.textContent = "00:00";
  notesButton.setAttribute("aria-pressed", "false");
  notesButton.textContent = "✎ Notes";
  noteMode = false;
  setMessage("Choose a square to begin.");
  renderBoard();
}

function setMessage(text, kind = "") {
  messageElement.textContent = text;
  messageElement.className = `game-message${kind ? ` is-${kind}` : ""}`;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getConflicts() {
  const conflicts = new Set();
  const checkGroup = (indices) => {
    const positions = new Map();
    for (const index of indices) {
      const value = values[index];
      if (!value) continue;
      if (!positions.has(value)) positions.set(value, []);
      positions.get(value).push(index);
    }
    for (const matches of positions.values()) {
      if (matches.length > 1) matches.forEach((index) => conflicts.add(index));
    }
  };

  for (let row = 0; row < 9; row++) checkGroup(Array.from({ length: 9 }, (_, column) => row * 9 + column));
  for (let column = 0; column < 9; column++) checkGroup(Array.from({ length: 9 }, (_, row) => row * 9 + column));
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxColumn = 0; boxColumn < 3; boxColumn++) {
      const indices = [];
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) indices.push((boxRow * 3 + row) * 9 + boxColumn * 3 + column);
      }
      checkGroup(indices);
    }
  }
  return conflicts;
}

function renderBoard() {
  const activeCell = document.activeElement?.classList.contains("cell")
    ? Number(document.activeElement.dataset.index)
    : -1;
  const conflicts = getConflicts();
  const selectedValue = selectedCell < 0 ? 0 : values[selectedCell];
  const selectedRow = Math.floor(selectedCell / 9);
  const selectedColumn = selectedCell % 9;
  boardElement.replaceChildren();

  values.forEach((value, index) => {
    const row = Math.floor(index / 9);
    const column = index % 9;
    const cell = document.createElement("button");
    const classes = ["cell"];
    cell.type = "button";
    cell.dataset.index = String(index);
    cell.tabIndex = index === (selectedCell < 0 ? puzzle.findIndex((entry) => entry === 0) : selectedCell) ? 0 : -1;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `Row ${row + 1}, column ${column + 1}${value ? `, ${value}` : ", empty"}${puzzle[index] ? ", given" : ""}`);
    if (puzzle[index]) classes.push("is-given");
    if (selectedCell >= 0 && (row === selectedRow || column === selectedColumn || (Math.floor(row / 3) === Math.floor(selectedRow / 3) && Math.floor(column / 3) === Math.floor(selectedColumn / 3)))) classes.push("is-peer");
    if (selectedValue && value === selectedValue) classes.push("is-same");
    if (index === selectedCell) classes.push("is-selected");
    if (conflicts.has(index)) classes.push("is-error");
    cell.className = classes.join(" ");
    cell.setAttribute("aria-selected", String(index === selectedCell));
    if (value) {
      cell.textContent = String(value);
    } else if (notes[index].size) {
      const noteGrid = document.createElement("span");
      noteGrid.className = "cell-notes";
      noteGrid.setAttribute("aria-hidden", "true");
      for (let note = 1; note <= 9; note++) {
        const noteCell = document.createElement("span");
        noteCell.className = "cell-note";
        noteCell.textContent = notes[index].has(note) ? String(note) : "";
        noteGrid.append(noteCell);
      }
      cell.append(noteGrid);
    }
    boardElement.append(cell);
  });

  if (activeCell >= 0) boardElement.querySelector(`[data-index="${activeCell}"]`).focus();
}

function isComplete() {
  return values.every(Boolean)
    && getConflicts().size === 0
    && values.every((value, index) => value === solution[index]);
}

function enterNumber(number) {
  if (selectedCell < 0 || puzzle[selectedCell] || hasWon) return;
  if (number === 0) {
    values[selectedCell] = 0;
    notes[selectedCell].clear();
  } else if (noteMode) {
    if (values[selectedCell]) return;
    if (notes[selectedCell].has(number)) notes[selectedCell].delete(number);
    else notes[selectedCell].add(number);
  } else {
    values[selectedCell] = number;
    notes[selectedCell].clear();
  }
  renderBoard();
  if (isComplete()) {
    hasWon = true;
    setMessage(`Beautifully done — ${timerElement.textContent}.`, "success");
  } else {
    setMessage(noteMode ? "Note added. Keep exploring." : "One step closer. Keep going.");
  }
}

function checkPuzzle() {
  if (isComplete()) {
    hasWon = true;
    setMessage(`Every row, column, and box is in balance. ${timerElement.textContent}.`, "success");
    return;
  }
  const conflicts = getConflicts();
  if (conflicts.size) {
    setMessage(`${conflicts.size} squares have a number conflict.`, "error");
  } else {
    const wrongEntries = values.some((value, index) => value && value !== solution[index]);
    const remaining = values.filter((value) => value === 0).length;
    setMessage(wrongEntries ? "Some numbers need another look." : `${remaining} ${remaining === 1 ? "square" : "squares"} left to fill.`);
  }
}

document.querySelector("#new-game").addEventListener("click", startGame);
document.querySelector("#check-board").addEventListener("click", checkPuzzle);
document.querySelector("#erase").addEventListener("click", () => enterNumber(0));
document.querySelectorAll(".number-button").forEach((button) => {
  button.addEventListener("click", () => enterNumber(Number(button.dataset.number)));
});
notesButton.addEventListener("click", () => {
  noteMode = !noteMode;
  notesButton.setAttribute("aria-pressed", String(noteMode));
  notesButton.textContent = noteMode ? "Notes on" : "✎ Notes";
  setMessage(noteMode ? "Notes on — add small reminders to a square." : "Notes off.");
});
boardElement.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  selectedCell = Number(cell.dataset.index);
  renderBoard();
});
boardElement.addEventListener("focusin", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  const index = Number(cell.dataset.index);
  if (selectedCell === index) return;
  selectedCell = index;
  renderBoard();
});
document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLSelectElement) return;
  if (/^[1-9]$/.test(event.key)) enterNumber(Number(event.key));
  else if (event.key === "Backspace" || event.key === "Delete") enterNumber(0);
  else if (event.key.toLowerCase() === "n") notesButton.click();
  else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key) && selectedCell >= 0) {
    event.preventDefault();
    const movement = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[event.key];
    selectedCell = (selectedCell + movement + 81) % 81;
    renderBoard();
    boardElement.querySelector(`[data-index="${selectedCell}"]`).focus();
  }
});
difficultyElement.addEventListener("change", startGame);
window.setInterval(() => {
  if (!hasWon) {
    elapsedSeconds += 1;
    timerElement.textContent = formatTime(elapsedSeconds);
  }
}, 1000);

startGame();
