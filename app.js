const GOAL_REPS = 200;
const STORAGE_KEY = "two-a-day-state-v3";
const LEGACY_KEYS = ["two-a-day-state-v2", "two-a-day-state-v1"];

const DEFAULT_CATALOGUE = [
  ["push-ups", "Push-ups", "Upper body"],
  ["air-squats", "Air squats", "Leg drive"],
  ["sit-ups", "Sit-ups", "Core"],
  ["lunges", "Lunges", "Single leg"],
  ["mountain-climbers", "Mountain climbers", "Engine"],
  ["jumping-jacks", "Jumping jacks", "Warm burn"],
  ["burpees", "Burpees", "Full body"],
  ["glute-bridges", "Glute bridges", "Posterior chain"],
  ["calf-raises", "Calf raises", "Lower leg"],
  ["plank-taps", "Plank taps", "Core stability"],
  ["russian-twists", "Russian twists", "Rotation"],
  ["high-knees", "High knees", "Cardio"],
  ["reverse-crunches", "Reverse crunches", "Lower core"],
  ["step-ups", "Step-ups", "Leg drive"],
  ["triceps-dips", "Triceps dips", "Arms"],
  ["supermans", "Supermans", "Back line"]
].map(([id, name, cue]) => ({ id, name, cue, archived: false }));

const elements = {
  todayDate: document.querySelector("#todayDate"),
  statusLabel: document.querySelector("#statusLabel"),
  exerciseGrid: document.querySelector("#exerciseGrid"),
  randomizeButton: document.querySelector("#randomizeButton"),
  manualPickButton: document.querySelector("#manualPickButton"),
  deckPicker: document.querySelector("#deckPicker"),
  deckGrid: document.querySelector("#deckGrid"),
  selectedCount: document.querySelector("#selectedCount"),
  addCustomTodayButton: document.querySelector("#addCustomTodayButton"),
  startButton: document.querySelector("#startButton"),
  resetButton: document.querySelector("#resetButton"),
  completeBadge: document.querySelector("#completeBadge"),
  historyList: document.querySelector("#historyList"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  streakCount: document.querySelector("#streakCount"),
  slotMachine: document.querySelector("#slotMachine"),
  slotOne: document.querySelector("#slotOne"),
  slotTwo: document.querySelector("#slotTwo"),
  catalogueList: document.querySelector("#catalogueList"),
  addCatalogueButton: document.querySelector("#addCatalogueButton"),
  customTodayModal: document.querySelector("#customTodayModal"),
  customTodayForm: document.querySelector("#customTodayForm"),
  customTodayName: document.querySelector("#customTodayName"),
  customTodayCue: document.querySelector("#customTodayCue"),
  catalogueFormModal: document.querySelector("#catalogueFormModal"),
  catalogueForm: document.querySelector("#catalogueForm"),
  catalogueExerciseId: document.querySelector("#catalogueExerciseId"),
  catalogueName: document.querySelector("#catalogueName"),
  catalogueCue: document.querySelector("#catalogueCue"),
  catalogueFormTitle: document.querySelector("#catalogueFormTitle")
};

let selectedExercises = [];
let isSpinning = false;
let spinTimer = null;
let catalogueView = "active";
let state = loadState();
let activeDate = todayKey();

function uid() {
  return `exercise-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric"
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function defaultState() {
  return {
    catalogue: DEFAULT_CATALOGUE.map((exercise) => ({ ...exercise })),
    today: createDefaultDay(),
    history: []
  };
}

function activeCatalogue() {
  return state.catalogue.filter((exercise) => !exercise.archived);
}

function findCatalogueExercise(id) {
  return state.catalogue.find((exercise) => exercise.id === id);
}

function findCatalogueByName(name) {
  return state.catalogue.find((exercise) => exercise.name.toLowerCase() === String(name).toLowerCase());
}

function drawTwoExercises(excludedIds = []) {
  const blocked = new Set(excludedIds);
  const pool = activeCatalogue().filter((exercise) => !blocked.has(exercise.id));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 2).map(toTodayExercise);
}

function toTodayExercise(exercise) {
  return {
    id: exercise.id || uid(),
    catalogueId: exercise.catalogueId || exercise.id || null,
    name: exercise.name,
    cue: exercise.cue || "",
    reps: Number(exercise.reps || 0),
    custom: Boolean(exercise.custom)
  };
}

function createDefaultDay(date = todayKey()) {
  const exercises = drawFromDefaults();
  return { date, exercises };
}

function drawFromDefaults() {
  return [...DEFAULT_CATALOGUE]
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .map(toTodayExercise);
}

function normalizeCatalogue(catalogue) {
  if (!Array.isArray(catalogue) || !catalogue.length) {
    return DEFAULT_CATALOGUE.map((exercise) => ({ ...exercise }));
  }

  const normalized = catalogue.map((exercise) => ({
    id: exercise.id || uid(),
    name: String(exercise.name || "").trim(),
    cue: String(exercise.cue || "").trim(),
    archived: Boolean(exercise.archived)
  })).filter((exercise) => exercise.name);

  DEFAULT_CATALOGUE.forEach((builtIn) => {
    if (!normalized.some((exercise) => exercise.id === builtIn.id || exercise.name.toLowerCase() === builtIn.name.toLowerCase())) {
      normalized.push({ ...builtIn });
    }
  });

  return normalized;
}

function normalizeDay(day, catalogue) {
  if (!day || !Array.isArray(day.exercises)) return createDefaultDay();

  return {
    date: day.date || todayKey(),
    exercises: day.exercises.slice(0, 2).map((exercise) => {
      const raw = typeof exercise === "string" ? { name: exercise, reps: 0 } : exercise;
      const catalogueMatch = catalogue.find((item) =>
        item.id === raw.catalogueId ||
        item.id === raw.id ||
        item.name.toLowerCase() === String(raw.name || "").toLowerCase()
      );

      return {
        id: raw.id || catalogueMatch?.id || uid(),
        catalogueId: raw.catalogueId || catalogueMatch?.id || null,
        name: String(raw.name || catalogueMatch?.name || "Exercise"),
        cue: String(raw.cue || catalogueMatch?.cue || ""),
        reps: clampReps(Number(raw.reps || 0)),
        custom: Boolean(raw.custom || !catalogueMatch)
      };
    })
  };
}

function loadState() {
  let stored = null;

  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) {
      for (const key of LEGACY_KEYS) {
        const legacy = JSON.parse(localStorage.getItem(key));
        if (legacy) {
          stored = legacy;
          break;
        }
      }
    }
  } catch {
    stored = null;
  }

  if (!stored) return defaultState();

  const catalogue = normalizeCatalogue(stored.catalogue);
  const migrated = {
    catalogue,
    today: normalizeDay(stored.today, catalogue),
    history: Array.isArray(stored.history)
      ? stored.history.map((day) => normalizeDay(day, catalogue))
      : []
  };

  if (migrated.today.date !== todayKey()) {
    migrated.history = upsertHistory(migrated.history, migrated.today);
    migrated.today = {
      date: todayKey(),
      exercises: drawFromCatalogue(catalogue)
    };
  }

  return migrated;
}

function drawFromCatalogue(catalogue) {
  const active = catalogue.filter((exercise) => !exercise.archived);
  const source = active.length >= 2 ? active : DEFAULT_CATALOGUE;
  return [...source].sort(() => Math.random() - 0.5).slice(0, 2).map(toTodayExercise);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function upsertHistory(history, day) {
  if (!day?.date) return history;
  return [day, ...history.filter((item) => item.date !== day.date)].slice(0, 60);
}

function dayIsComplete(day) {
  return day.exercises.length === 2 && day.exercises.every((exercise) => exercise.reps >= GOAL_REPS);
}

function clampReps(value) {
  return Math.min(GOAL_REPS, Math.max(0, value));
}

function setTodayExercises(exercises) {
  if (exercises.length !== 2) {
    alert("Pick exactly two exercises.");
    return false;
  }

  const names = exercises.map((exercise) => exercise.name.trim().toLowerCase());
  if (new Set(names).size !== 2) {
    alert("Pick two different exercises.");
    return false;
  }

  state.today = {
    date: todayKey(),
    exercises: exercises.map((exercise) => ({ ...toTodayExercise(exercise), reps: 0 }))
  };

  selectedExercises = [];
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
  return !state.today.exercises.some((exercise) => exercise.reps > 0) || confirm(message);
}

function resetToday() {
  if (!confirm("Reset today's exercises and reps?")) return;
  state.today = { date: todayKey(), exercises: drawTwoExercises() };
  selectedExercises = [];
  saveState();
  render();
}

function clearHistory() {
  if (!state.history.length || !confirm("Clear all saved history?")) return;
  state.history = [];
  saveState();
  render();
}

function renderExerciseCard(dayExercise, index) {
  const percent = Math.round((dayExercise.reps / GOAL_REPS) * 100);
  const done = dayExercise.reps >= GOAL_REPS;

  return `
    <article class="exercise-card">
      <div class="exercise-top">
        <div>
          <h3>${escapeHtml(dayExercise.name)}</h3>
          <p class="card-cue">${escapeHtml(dayExercise.cue || "Custom exercise")}</p>
        </div>
        <div class="rep-count" aria-label="${dayExercise.reps} of ${GOAL_REPS} reps">
          <strong>${dayExercise.reps}</strong>
          <span>of ${GOAL_REPS}</span>
        </div>
      </div>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${GOAL_REPS}" aria-valuenow="${dayExercise.reps}">
        <div class="progress-fill" style="width:${percent}%"></div>
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
  elements.exerciseGrid.innerHTML = state.today.exercises.map(renderExerciseCard).join("");
  elements.completeBadge.hidden = !complete;
}

function selectedKey(exercise) {
  return exercise.selectionId || exercise.catalogueId || exercise.id;
}

function renderDeck() {
  elements.selectedCount.textContent = `${selectedExercises.length}/2`;
  elements.startButton.disabled = selectedExercises.length !== 2;

  const cards = activeCatalogue().map((exercise) => {
    const selected = selectedExercises.some((item) => item.catalogueId === exercise.id);
    return `
      <button class="deck-card ${selected ? "selected" : ""}" type="button" data-catalogue-id="${escapeHtml(exercise.id)}" aria-pressed="${selected}">
        <strong>${escapeHtml(exercise.name)}</strong>
        <small>${escapeHtml(exercise.cue)}</small>
      </button>
    `;
  }).join("");

  const customCards = selectedExercises.filter((exercise) => exercise.custom).map((exercise) => `
    <button class="deck-card selected custom-selection" type="button" data-selection-id="${escapeHtml(exercise.selectionId)}" aria-pressed="true">
      <strong>${escapeHtml(exercise.name)}</strong>
      <small>${escapeHtml(exercise.cue || "Custom for today")}</small>
      <em>Tap to remove</em>
    </button>
  `).join("");

  elements.deckGrid.innerHTML = cards + customCards;
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = `<p class="history-empty">Previous days will land here after midnight.</p>`;
    return;
  }

  elements.historyList.innerHTML = state.history.map((day) => {
    const complete = dayIsComplete(day);
    const rows = day.exercises.map((exercise) => `
      <span><strong>${escapeHtml(exercise.name)}</strong><em>${exercise.reps}/${GOAL_REPS}</em></span>
    `).join("");

    return `
      <article class="history-item ${complete ? "complete" : ""}">
        <div class="history-date"><span>${formatDate(day.date)}</span><strong>${complete ? "Complete" : "Partial"}</strong></div>
        <div class="history-exercises">${rows}</div>
      </article>
    `;
  }).join("");
}

function renderStreak() {
  const completedDates = new Set(
    [state.today, ...state.history].filter(dayIsComplete).map((day) => day.date)
  );
  let cursor = new Date(`${todayKey()}T12:00:00`);
  let streak = 0;

  while (completedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  elements.streakCount.textContent = streak;
}

function renderSlot(names = state.today.exercises.map((exercise) => exercise.name)) {
  elements.slotOne.textContent = names[0] || "Ready";
  elements.slotTwo.textContent = names[1] || "Set";
}

function renderCatalogue() {
  document.querySelectorAll(".catalogue-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.catalogueView === catalogueView);
  });

  const exercises = state.catalogue
    .filter((exercise) => catalogueView === "archived" ? exercise.archived : !exercise.archived)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!exercises.length) {
    elements.catalogueList.innerHTML = `<p class="history-empty">${catalogueView === "archived" ? "Nothing archived." : "No active exercises."}</p>`;
    return;
  }

  elements.catalogueList.innerHTML = exercises.map((exercise) => `
    <article class="catalogue-row">
      <div class="catalogue-copy">
        <strong>${escapeHtml(exercise.name)}</strong>
        <span>${escapeHtml(exercise.cue)}</span>
      </div>
      <div class="catalogue-actions">
        <button type="button" data-edit-id="${escapeHtml(exercise.id)}">Edit</button>
        ${exercise.archived
          ? `<button type="button" data-restore-id="${escapeHtml(exercise.id)}">Restore</button>
             <button class="danger-text" type="button" data-delete-id="${escapeHtml(exercise.id)}">Delete</button>`
          : `<button type="button" data-archive-id="${escapeHtml(exercise.id)}">Archive</button>`}
      </div>
    </article>
  `).join("");
}

function render() {
  renderToday();
  renderDeck();
  renderHistory();
  renderStreak();
  renderSlot();
  renderCatalogue();
}

function spinToPair(exercises) {
  if (isSpinning) return;
  if (!canReplaceToday("Spin a new pair and clear current reps?")) return;
  if (activeCatalogue().length < 2) {
    alert("Keep at least two active catalogue exercises to use the randomizer.");
    return;
  }

  isSpinning = true;
  elements.slotMachine.classList.add("spinning");
  elements.randomizeButton.disabled = true;
  let ticks = 0;

  clearInterval(spinTimer);
  spinTimer = setInterval(() => {
    const preview = drawTwoExercises();
    renderSlot(preview.map((exercise) => exercise.name));
    ticks += 1;

    if (ticks >= 18) {
      clearInterval(spinTimer);
      renderSlot(exercises.map((exercise) => exercise.name));
      setTimeout(() => {
        setTodayExercises(exercises);
        elements.slotMachine.classList.remove("spinning");
        elements.randomizeButton.disabled = false;
        isSpinning = false;
      }, 220);
    }
  }, 70);
}

function openModal(modal) {
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function openCatalogueForm(id = "") {
  const exercise = id ? findCatalogueExercise(id) : null;
  elements.catalogueFormTitle.textContent = exercise ? "Edit exercise" : "Add exercise";
  elements.catalogueExerciseId.value = exercise?.id || "";
  elements.catalogueName.value = exercise?.name || "";
  elements.catalogueCue.value = exercise?.cue || "";
  openModal(elements.catalogueFormModal);
  setTimeout(() => elements.catalogueName.focus(), 50);
}

function saveCatalogueExercise(event) {
  event.preventDefault();

  const id = elements.catalogueExerciseId.value;
  const name = elements.catalogueName.value.trim();
  const cue = elements.catalogueCue.value.trim();

  if (!name || !cue) return;

  const duplicate = state.catalogue.find((exercise) =>
    exercise.id !== id && exercise.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    alert("An exercise with that name is already in the catalogue.");
    return;
  }

  if (id) {
    const exercise = findCatalogueExercise(id);
    exercise.name = name;
    exercise.cue = cue;

    state.today.exercises.forEach((todayExercise) => {
      if (todayExercise.catalogueId === id) {
        todayExercise.name = name;
        todayExercise.cue = cue;
      }
    });
  } else {
    state.catalogue.push({ id: uid(), name, cue, archived: false });
  }

  saveState();
  closeModal(elements.catalogueFormModal);
  render();
}

function archiveExercise(id) {
  const exercise = findCatalogueExercise(id);
  if (!exercise) return;
  exercise.archived = true;
  saveState();
  render();
}

function restoreExercise(id) {
  const exercise = findCatalogueExercise(id);
  if (!exercise) return;
  exercise.archived = false;
  saveState();
  render();
}

function deleteExercise(id) {
  const exercise = findCatalogueExercise(id);
  if (!exercise || !exercise.archived) return;
  if (!confirm(`Permanently delete "${exercise.name}" from the catalogue? Past workout records will stay intact.`)) return;
  state.catalogue = state.catalogue.filter((item) => item.id !== id);
  saveState();
  render();
}

function checkForNewDay() {
  if (todayKey() === activeDate) return;
  state.history = upsertHistory(state.history, state.today);
  state.today = { date: todayKey(), exercises: drawTwoExercises() };
  activeDate = todayKey();
  selectedExercises = [];
  saveState();
  render();
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
  const catalogueCard = event.target.closest("button[data-catalogue-id]");
  const customCard = event.target.closest("button[data-selection-id]");

  if (customCard) {
    selectedExercises = selectedExercises.filter((exercise) => exercise.selectionId !== customCard.dataset.selectionId);
    renderDeck();
    return;
  }

  if (!catalogueCard) return;
  const id = catalogueCard.dataset.catalogueId;
  const existingIndex = selectedExercises.findIndex((exercise) => exercise.catalogueId === id);

  if (existingIndex >= 0) {
    selectedExercises.splice(existingIndex, 1);
  } else if (selectedExercises.length < 2) {
    selectedExercises.push(toTodayExercise(findCatalogueExercise(id)));
  } else {
    selectedExercises.shift();
    selectedExercises.push(toTodayExercise(findCatalogueExercise(id)));
  }

  renderDeck();
});

elements.addCustomTodayButton.addEventListener("click", () => {
  if (selectedExercises.length >= 2) {
    alert("Remove one selected exercise before adding another.");
    return;
  }
  elements.customTodayForm.reset();
  openModal(elements.customTodayModal);
  setTimeout(() => elements.customTodayName.focus(), 50);
});

elements.customTodayForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.customTodayName.value.trim();
  const cue = elements.customTodayCue.value.trim();
  if (!name) return;

  if (selectedExercises.some((exercise) => exercise.name.toLowerCase() === name.toLowerCase())) {
    alert("Pick two different exercises.");
    return;
  }

  selectedExercises.push({
    id: uid(),
    selectionId: uid(),
    catalogueId: null,
    name,
    cue,
    reps: 0,
    custom: true
  });

  closeModal(elements.customTodayModal);
  renderDeck();
});

elements.startButton.addEventListener("click", () => {
  if (selectedExercises.length !== 2) return;
  if (!canReplaceToday("Start a new pair and clear current reps?")) return;
  setTodayExercises(selectedExercises);
  renderSlot(selectedExercises.map((exercise) => exercise.name));
  elements.deckPicker.hidden = true;
});

elements.resetButton.addEventListener("click", resetToday);
elements.clearHistoryButton.addEventListener("click", clearHistory);
elements.addCatalogueButton.addEventListener("click", () => openCatalogueForm());
elements.catalogueForm.addEventListener("submit", saveCatalogueExercise);

document.querySelectorAll(".catalogue-tab").forEach((button) => {
  button.addEventListener("click", () => {
    catalogueView = button.dataset.catalogueView;
    renderCatalogue();
  });
});

elements.catalogueList.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit-id]");
  const archive = event.target.closest("[data-archive-id]");
  const restore = event.target.closest("[data-restore-id]");
  const remove = event.target.closest("[data-delete-id]");

  if (edit) openCatalogueForm(edit.dataset.editId);
  if (archive) archiveExercise(archive.dataset.archiveId);
  if (restore) restoreExercise(restore.dataset.restoreId);
  if (remove) deleteExercise(remove.dataset.deleteId);
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => closeModal(document.querySelector(`#${button.dataset.closeModal}`)));
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}

saveState();
render();
setInterval(checkForNewDay, 60 * 1000);
