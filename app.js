const GOAL_REPS = 200;
const STORAGE_KEY = "two-a-day-state-v2";

const EXERCISE_DECK = [
  { name: "Push-ups", cue: "Upper body", type: "floor", color: "#f5912f" },
  { name: "Air squats", cue: "Leg drive", type: "squat", color: "#f35b24" },
  { name: "Sit-ups", cue: "Core", type: "floor", color: "#438982" },
  { name: "Lunges", cue: "Single leg", type: "lunge", color: "#276f6d" },
  { name: "Mountain climbers", cue: "Engine", type: "floor", color: "#f5912f" },
  { name: "Jumping jacks", cue: "Warm burn", type: "standing", color: "#f35b24" },
  { name: "Burpees", cue: "Full body", type: "jump", color: "#438982" },
  { name: "Glute bridges", cue: "Posterior", type: "bridge", color: "#276f6d" },
  { name: "Calf raises", cue: "Lower leg", type: "standing", color: "#f5912f" },
  { name: "Plank taps", cue: "Core lock", type: "floor", color: "#f35b24" },
  { name: "Russian twists", cue: "Rotation", type: "seated", color: "#438982" },
  { name: "High knees", cue: "Cardio", type: "standing", color: "#276f6d" },
  { name: "Reverse crunches", cue: "Lower core", type: "seated", color: "#f5912f" },
  { name: "Step-ups", cue: "Climb", type: "lunge", color: "#f35b24" },
  { name: "Triceps dips", cue: "Arms", type: "dip", color: "#438982" },
  { name: "Supermans", cue: "Back line", type: "bridge", color: "#276f6d" }
];

const elements = {
  todayDate: document.querySelector("#todayDate"),
  statusLabel: document.querySelector("#statusLabel"),
  exerciseGrid: document.querySelector("#exerciseGrid"),
  randomizeButton: document.querySelector("#randomizeButton"),
  manualPickButton: document.querySelector("#manualPickButton"),
  deckPicker: document.querySelector("#deckPicker"),
  deckGrid: document.querySelector("#deckGrid"),
  selectedCount: document.querySelector("#selectedCount"),
  randomPartnerButton: document.querySelector("#randomPartnerButton"),
  startButton: document.querySelector("#startButton"),
  resetButton: document.querySelector("#resetButton"),
  completeBadge: document.querySelector("#completeBadge"),
  historyList: document.querySelector("#historyList"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  streakCount: document.querySelector("#streakCount"),
  slotMachine: document.querySelector("#slotMachine"),
  slotOne: document.querySelector("#slotOne"),
  slotTwo: document.querySelector("#slotTwo")
};

let selectedNames = [];
let isSpinning = false;
let spinTimer = null;
let state = loadState();
let activeDate = todayKey();

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function findExercise(name) {
  return EXERCISE_DECK.find((exercise) => exercise.name === name) || EXERCISE_DECK[0];
}

function createDefaultDay(date = todayKey()) {
  const exercises = drawTwoExercises().map((name) => ({ name, reps: 0 }));
  return { date, exercises };
}

function normalizeDay(day) {
  if (!day || !Array.isArray(day.exercises)) return createDefaultDay();
  return {
    date: day.date || todayKey(),
    exercises: day.exercises.slice(0, 2).map((exercise) => ({
      name: typeof exercise === "string" ? exercise : exercise.name,
      reps: clampReps(Number(exercise.reps || 0))
    }))
  };
}

function loadState() {
  const fallback = {
    today: createDefaultDay(),
    history: []
  };

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      || JSON.parse(localStorage.getItem("two-a-day-state-v1"));
    if (!stored || !stored.today || !Array.isArray(stored.history)) return fallback;

    stored.today = normalizeDay(stored.today);
    stored.history = stored.history.map(normalizeDay);

    if (stored.today.date !== todayKey()) {
      stored.history = upsertHistory(stored.history, stored.today);
      stored.today = createDefaultDay();
    }

    return stored;
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function upsertHistory(history, day) {
  if (!day || !day.date) return history;
  const withoutDay = history.filter((item) => item.date !== day.date);
  return [day, ...withoutDay].slice(0, 60);
}

function drawTwoExercises(excluded = []) {
  const blocked = new Set(excluded);
  const pool = EXERCISE_DECK
    .map((exercise) => exercise.name)
    .filter((name) => !blocked.has(name));
  return pool.sort(() => Math.random() - 0.5).slice(0, 2);
}

function dayIsComplete(day) {
  return day.exercises.length === 2 && day.exercises.every((exercise) => exercise.reps >= GOAL_REPS);
}

function clampReps(value) {
  return Math.min(GOAL_REPS, Math.max(0, value));
}

function setTodayExercises(names) {
  if (new Set(names).size !== 2) {
    alert("Pick two different exercises.");
    return false;
  }

  state.today = {
    date: todayKey(),
    exercises: names.map((name) => ({ name, reps: 0 }))
  };
  selectedNames = [];
  saveState();
  render();
  return true;
}

function addReps(index, amount) {
  state.today.exercises[index].reps = clampReps(state.today.exercises[index].reps + amount);
  saveState();
  render();
}

function canReplaceToday(message) {
  const hasProgress = state.today.exercises.some((exercise) => exercise.reps > 0);
  return !hasProgress || confirm(message);
}

function resetToday() {
  const confirmed = confirm("Reset today's exercises and reps?");
  if (!confirmed) return;

  state.today = createDefaultDay();
  selectedNames = [];
  saveState();
  render();
}

function clearHistory() {
  if (!state.history.length) return;
  const confirmed = confirm("Clear all saved history?");
  if (!confirmed) return;

  state.history = [];
  saveState();
  render();
}

function exerciseIllustration(exercise) {
  const color = exercise.color;
  const common = `
    <circle cx="70" cy="25" r="10" fill="${color}"/>
    <path d="M18 72h112" stroke="#b8c6c4" stroke-width="4" stroke-linecap="round" opacity=".45"/>
  `;
  const shapes = {
    floor: `<path d="M42 66l28-22 34 14 20 22" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 82h92" stroke="${color}" stroke-width="10" stroke-linecap="round"/>`,
    squat: `<path d="M70 36l-24 22 22 20 34-3" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M45 92h58" stroke="${color}" stroke-width="9" stroke-linecap="round"/>`,
    lunge: `<path d="M70 36l-20 28 24 18 34-24" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 92h86" stroke="${color}" stroke-width="9" stroke-linecap="round"/>`,
    standing: `<path d="M70 38v36M70 55L42 36M70 55l30-18M70 74L48 102M70 74l26 28" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round"/>`,
    jump: `<path d="M70 38l-24 23M70 38l28 22M70 38v30M70 68L45 94M70 68l27 28" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round"/><path d="M34 28l-10-9M106 29l12-10" stroke="#f6efe5" stroke-width="5" stroke-linecap="round" opacity=".75"/>`,
    bridge: `<path d="M30 82h24l24-28 24 28h28" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="44" cy="63" r="10" fill="${color}"/>`,
    seated: `<path d="M62 44l-18 30 36 4 30-18M62 44l30 22" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M38 94h80" stroke="${color}" stroke-width="9" stroke-linecap="round"/>`,
    dip: `<path d="M38 62h66M104 62v38M52 62l18 24 25-8" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="52" cy="42" r="10" fill="${color}"/>`
  };

  return `
    <div class="exercise-art" aria-hidden="true">
      <svg viewBox="0 0 140 112" focusable="false">
        ${common}
        ${shapes[exercise.type] || shapes.standing}
      </svg>
    </div>
  `;
}

function renderExerciseCard(dayExercise, index) {
  const exercise = findExercise(dayExercise.name);
  const percent = Math.round((dayExercise.reps / GOAL_REPS) * 100);
  const done = dayExercise.reps >= GOAL_REPS;

  return `
    <article class="exercise-card">
      <div class="exercise-top">
        <div>
          <h3>${dayExercise.name}</h3>
          <p class="card-cue">${exercise.cue}</p>
        </div>
        <div class="rep-count" aria-label="${dayExercise.reps} of ${GOAL_REPS} reps">
          <strong>${dayExercise.reps}</strong>
          <span>of ${GOAL_REPS}</span>
        </div>
      </div>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${GOAL_REPS}" aria-valuenow="${dayExercise.reps}">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
      <div class="rep-buttons">
        ${[1, 5, 10, 25].map((amount) => `
          <button type="button" data-index="${index}" data-amount="${amount}" ${done ? "disabled" : ""}>+${amount}</button>
        `).join("")}
      </div>
    </article>
  `;
}

function renderToday() {
  const complete = dayIsComplete(state.today);
  const totalReps = state.today.exercises.reduce((sum, exercise) => sum + exercise.reps, 0);

  elements.todayDate.textContent = formatDate(state.today.date);
  elements.statusLabel.textContent = complete ? "Complete" : `${totalReps}/400`;
  elements.exerciseGrid.innerHTML = state.today.exercises
    .map((exercise, index) => renderExerciseCard(exercise, index))
    .join("");
  elements.completeBadge.hidden = !complete;
}

function renderDeck() {
  elements.selectedCount.textContent = `${selectedNames.length}/2`;
  elements.startButton.disabled = selectedNames.length === 0;
  elements.startButton.textContent = selectedNames.length === 1 ? "Add random partner" : "Get started";
  elements.randomPartnerButton.textContent = "Randomize 2";

  elements.deckGrid.innerHTML = EXERCISE_DECK.map((exercise) => {
    const selected = selectedNames.includes(exercise.name);
    return `
      <button class="deck-card ${selected ? "selected" : ""}" type="button" data-exercise="${exercise.name}" aria-pressed="${selected}">
        ${exerciseIllustration(exercise)}
        <strong>${exercise.name}</strong>
        <small>${exercise.cue}</small>
      </button>
    `;
  }).join("");
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = `<p class="history-empty">Previous days will land here after midnight.</p>`;
    return;
  }

  elements.historyList.innerHTML = state.history.map((day) => {
    const complete = dayIsComplete(day);
    const rows = day.exercises.map((exercise) => `
      <span>
        <strong>${exercise.name}</strong>
        <em>${exercise.reps}/${GOAL_REPS}</em>
      </span>
    `).join("");

    return `
      <article class="history-item ${complete ? "complete" : ""}">
        <div class="history-date">
          <span>${formatDate(day.date)}</span>
          <span>${complete ? "Complete" : "Partial"}</span>
        </div>
        <div class="history-exercises">${rows}</div>
      </article>
    `;
  }).join("");
}

function renderStreak() {
  const completedDates = new Set(
    [state.today, ...state.history]
      .filter(dayIsComplete)
      .map((day) => day.date)
  );
  let cursor = new Date(`${todayKey()}T12:00:00`);
  let streak = 0;

  while (completedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  elements.streakCount.textContent = streak;
}

function checkForNewDay() {
  if (todayKey() === activeDate) return;

  state.history = upsertHistory(state.history, state.today);
  state.today = createDefaultDay();
  activeDate = todayKey();
  saveState();
  render();
}

function renderSlot(names = state.today.exercises.map((exercise) => exercise.name)) {
  elements.slotOne.textContent = names[0] || "Ready";
  elements.slotTwo.textContent = names[1] || "Set";
}

function spinToPair(names) {
  if (isSpinning) return;
  if (!canReplaceToday("Spin a new pair and clear current reps?")) return;

  isSpinning = true;
  elements.slotMachine.classList.add("spinning");
  elements.randomizeButton.disabled = true;
  let ticks = 0;

  clearInterval(spinTimer);
  spinTimer = setInterval(() => {
    const first = EXERCISE_DECK[Math.floor(Math.random() * EXERCISE_DECK.length)].name;
    const second = drawTwoExercises([first])[0];
    renderSlot([first, second]);
    ticks += 1;

    if (ticks >= 18) {
      clearInterval(spinTimer);
      renderSlot(names);
      setTimeout(() => {
        setTodayExercises(names);
        elements.slotMachine.classList.remove("spinning");
        elements.randomizeButton.disabled = false;
        isSpinning = false;
      }, 220);
    }
  }, 70);
}

function startSelectedPair(useSpin = false) {
  if (selectedNames.length === 0) return;
  if (!canReplaceToday("Start a new pair and clear current reps?")) return;

  const names = [...selectedNames];
  if (names.length === 1) {
    names.push(drawTwoExercises(names)[0]);
  }

  if (useSpin) {
    spinToPair(names);
  } else {
    setTodayExercises(names);
    renderSlot(names);
  }

  elements.deckPicker.hidden = true;
}

function render() {
  renderToday();
  renderDeck();
  renderHistory();
  renderStreak();
  renderSlot();
}

elements.exerciseGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-amount]");
  if (!button) return;
  addReps(Number(button.dataset.index), Number(button.dataset.amount));
});

elements.randomizeButton.addEventListener("click", () => {
  spinToPair(drawTwoExercises());
});

elements.manualPickButton.addEventListener("click", () => {
  elements.deckPicker.hidden = !elements.deckPicker.hidden;
});

elements.deckGrid.addEventListener("click", (event) => {
  const card = event.target.closest("button[data-exercise]");
  if (!card) return;

  const name = card.dataset.exercise;
  if (selectedNames.includes(name)) {
    selectedNames = selectedNames.filter((selected) => selected !== name);
  } else if (selectedNames.length < 2) {
    selectedNames.push(name);
  } else {
    selectedNames = [selectedNames[1], name];
  }

  renderDeck();
});

elements.randomPartnerButton.addEventListener("click", () => {
  const names = selectedNames.length === 1
    ? [selectedNames[0], drawTwoExercises(selectedNames)[0]]
    : drawTwoExercises();
  spinToPair(names);
  elements.deckPicker.hidden = true;
});

elements.startButton.addEventListener("click", () => {
  startSelectedPair();
});

elements.resetButton.addEventListener("click", resetToday);
elements.clearHistoryButton.addEventListener("click", clearHistory);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

render();
setInterval(checkForNewDay, 60 * 1000);
