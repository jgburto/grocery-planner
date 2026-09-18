// ---------- Storage helpers ----------
const STORAGE_KEYS = {
  bank: "gp_mealBank",
  week: "gp_weekPlan",
  list: "gp_groceryList",
  history: "gp_history",
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("Failed to load", key, e);
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function emptyWeek() {
  const days = {};
  DAYS.forEach((d) => {
    days[d.key] = { breakfast: null, lunch: null, dinner: null, snacks: [] };
  });
  return { weekOf: "", days };
}

// ---------- App state ----------
let mealBank = load(STORAGE_KEYS.bank, null);
if (!mealBank) {
  mealBank = SEED_MEALS.map((m) => ({ id: uid(), ...m }));
  save(STORAGE_KEYS.bank, mealBank);
}

let weekPlan = load(STORAGE_KEYS.week, emptyWeek());
let groceryList = load(STORAGE_KEYS.list, null);
let history = load(STORAGE_KEYS.history, []);

let activeTab = "menu";

function persistAll() {
  save(STORAGE_KEYS.bank, mealBank);
  save(STORAGE_KEYS.week, weekPlan);
  save(STORAGE_KEYS.list, groceryList);
  save(STORAGE_KEYS.history, history);
}

function mealById(id) {
  return mealBank.find((m) => m.id === id) || null;
}

// ---------- Tab switching ----------
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  activeTab = btn.dataset.tab;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
  render();
});

function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  if (activeTab === "menu") renderMenuTab(app);
  else if (activeTab === "bank") renderBankTab(app);
  else if (activeTab === "list") renderListTab(app);
  else if (activeTab === "history") renderHistoryTab(app);
}

// ============================================================
// Weekly Menu tab
// ============================================================
function renderMenuTab(app) {
  const wrap = document.createElement("div");

  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";
  toolbar.innerHTML = `
    <button class="btn-primary" id="generate-list-btn">Generate grocery list from this week</button>
    <button class="btn-secondary" id="save-week-btn">Save as past week</button>
    <button class="btn-secondary" id="clear-week-btn">Clear week</button>
  `;
  wrap.appendChild(toolbar);

  const gridWrap = document.createElement("div");
  gridWrap.className = "grid-wrap";
  const table = document.createElement("table");
  table.className = "week-grid";

  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th>Day</th>${CATEGORIES.map((c) => `<th>${c.label}</th>`).join("")}</tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  DAYS.forEach((day) => {
    const tr = document.createElement("tr");
    const dayCell = document.createElement("td");
    dayCell.className = "day-label";
    dayCell.textContent = day.label;
    tr.appendChild(dayCell);

    ["breakfast", "lunch", "dinner"].forEach((cat) => {
      const td = document.createElement("td");
      td.appendChild(buildSingleMealSelect(day.key, cat));
      tr.appendChild(td);
    });

    const snackTd = document.createElement("td");
    snackTd.appendChild(buildSnackCell(day.key));
    tr.appendChild(snackTd);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  gridWrap.appendChild(table);
  wrap.appendChild(gridWrap);

  app.appendChild(wrap);

  document.getElementById("generate-list-btn").addEventListener("click", generateGroceryList);
  document.getElementById("clear-week-btn").addEventListener("click", () => {
    if (confirm("Clear the entire weekly grid?")) {
      weekPlan = emptyWeek();
      persistAll();
      render();
    }
  });
  document.getElementById("save-week-btn").addEventListener("click", saveAsPastWeek);
}

function buildSingleMealSelect(dayKey, category) {
  const select = document.createElement("select");
  select.className = "cell-select";
  const current = weekPlan.days[dayKey][category];

  const noneOpt = document.createElement("option");
  noneOpt.value = "";
  noneOpt.textContent = "— none —";
  select.appendChild(noneOpt);

  mealBank
    .filter((m) => m.category === category)
    .forEach((m) => {
      const opt = document.createElement("option");
      opt.value = "bank:" + m.id;
      opt.textContent = m.name;
      select.appendChild(opt);
    });

  const customOpt = document.createElement("option");
  customOpt.value = "__custom__";
  customOpt.textContent = "+ Custom one-off meal...";
  select.appendChild(customOpt);

  if (current && current.type === "bank") {
    select.value = "bank:" + current.id;
  } else if (current && current.type === "custom") {
    const opt = document.createElement("option");
    opt.value = "custom:" + current.name;
    opt.textContent = current.name + " (custom)";
    select.insertBefore(opt, customOpt);
    select.value = "custom:" + current.name;
  } else {
    select.value = "";
  }

  select.addEventListener("change", () => {
    const val = select.value;
    if (val === "") {
      weekPlan.days[dayKey][category] = null;
    } else if (val === "__custom__") {
      const name = prompt("Name of the custom meal:");
      if (name && name.trim()) {
        weekPlan.days[dayKey][category] = { type: "custom", name: name.trim() };
      } else {
        select.value = "";
        return;
      }
    } else if (val.startsWith("bank:")) {
      weekPlan.days[dayKey][category] = { type: "bank", id: val.slice(5) };
    } else if (val.startsWith("custom:")) {
      weekPlan.days[dayKey][category] = { type: "custom", name: val.slice(7) };
    }
    persistAll();
    render();
  });

  return select;
}

function buildSnackCell(dayKey) {
  const cell = document.createElement("div");
  cell.className = "snack-cell";
  const snacks = weekPlan.days[dayKey].snacks || [];

  snacks.forEach((s, idx) => {
    const tag = document.createElement("div");
    tag.className = "snack-tag";
    const label = s.type === "bank" ? (mealById(s.id) ? mealById(s.id).name : "(deleted meal)") : s.name + " (custom)";
    tag.innerHTML = `<span>${escapeHtml(label)}</span>`;
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-icon";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      weekPlan.days[dayKey].snacks.splice(idx, 1);
      persistAll();
      render();
    });
    tag.appendChild(removeBtn);
    cell.appendChild(tag);
  });

  const select = document.createElement("select");
  select.className = "cell-select";
  const addOpt = document.createElement("option");
  addOpt.value = "";
  addOpt.textContent = "+ add snack...";
  select.appendChild(addOpt);

  mealBank
    .filter((m) => m.category === "snack")
    .forEach((m) => {
      const opt = document.createElement("option");
      opt.value = "bank:" + m.id;
      opt.textContent = m.name;
      select.appendChild(opt);
    });

  const customOpt = document.createElement("option");
  customOpt.value = "__custom__";
  customOpt.textContent = "+ Custom one-off snack...";
  select.appendChild(customOpt);

  select.addEventListener("change", () => {
    const val = select.value;
    if (val === "__custom__") {
      const name = prompt("Name of the custom snack:");
      if (name && name.trim()) {
        weekPlan.days[dayKey].snacks.push({ type: "custom", name: name.trim() });
      }
    } else if (val.startsWith("bank:")) {
      weekPlan.days[dayKey].snacks.push({ type: "bank", id: val.slice(5) });
    }
    if (val !== "") {
      persistAll();
      render();
    }
  });

  cell.appendChild(select);
  return cell;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function saveAsPastWeek() {
  const label = prompt("Label this week (e.g. 'Aug 17 - Aug 23'):", weekPlan.weekOf || "");
  if (label === null) return;
  weekPlan.weekOf = label.trim();
  const snapshot = {
    id: uid(),
    savedAt: new Date().toISOString(),
    weekOf: weekPlan.weekOf,
    days: JSON.parse(JSON.stringify(weekPlan.days)),
  };
  history.unshift(snapshot);
  persistAll();
  alert("Saved to History.");
  render();
}

// ============================================================
// Grocery list generation
// ============================================================
function collectWeekIngredients() {
  const entries = []; // {name, section, quantity, mealName}
  const customMeals = [];

  DAYS.forEach((day) => {
    const d = weekPlan.days[day.key];
    ["breakfast", "lunch", "dinner"].forEach((cat) => {
      const cellVal = d[cat];
      if (!cellVal) return;
      if (cellVal.type === "bank") {
        const meal = mealById(cellVal.id);
        if (!meal) return;
        meal.ingredients.forEach((ing) => entries.push({ ...ing, mealName: meal.name }));
      } else if (cellVal.type === "custom") {
        customMeals.push(cellVal.name);
      }
    });
    (d.snacks || []).forEach((s) => {
      if (s.type === "bank") {
        const meal = mealById(s.id);
        if (!meal) return;
        meal.ingredients.forEach((ing) => entries.push({ ...ing, mealName: meal.name }));
      } else if (s.type === "custom") {
        customMeals.push(s.name);
      }
    });
  });

  return { entries, customMeals };
}

function generateGroceryList() {
  const { entries, customMeals } = collectWeekIngredients();

  if (entries.length === 0 && customMeals.length === 0) {
    alert("This week's grid is empty — add some meals first.");
    return;
  }

  const map = new Map(); // key: section|name.lower -> item
  entries.forEach((e) => {
    if (!e.name) return;
    const key = e.section + "|" + e.name.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        section: e.section,
        name: e.name.trim(),
        quantities: e.quantity ? [e.quantity] : [],
        sources: [e.mealName],
        checked: false,
      });
    } else {
      const item = map.get(key);
      if (e.quantity && !item.quantities.includes(e.quantity)) item.quantities.push(e.quantity);
      if (!item.sources.includes(e.mealName)) item.sources.push(e.mealName);
    }
  });

  // preserve checked state from previous list where the same item still exists
  const prevChecked = new Map();
  if (groceryList) {
    groceryList.items.forEach((it) => {
      prevChecked.set(it.section + "|" + it.name.toLowerCase(), it.checked);
    });
  }

  const items = Array.from(map.values()).map((it) => {
    const key = it.section + "|" + it.name.toLowerCase();
    return { ...it, checked: prevChecked.get(key) || false };
  });

  items.sort((a, b) => a.name.localeCompare(b.name));

  groceryList = {
    generatedAt: new Date().toISOString(),
    weekOf: weekPlan.weekOf || "",
    items,
    customMeals,
  };
  persistAll();
  activeTab = "list";
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === "list"));
  render();
}

// ============================================================
// Grocery List tab
// ============================================================
function renderListTab(app) {
  const wrap = document.createElement("div");

  if (!groceryList || groceryList.items.length === 0) {
    wrap.innerHTML = `<div class="empty-state">No grocery list yet. Go to <strong>Weekly Menu</strong>, fill in some meals, and click "Generate grocery list from this week".</div>`;
    app.appendChild(wrap);
    return;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";
  toolbar.innerHTML = `
    <button class="btn-secondary" id="clear-checks-btn">Uncheck all</button>
    <button class="btn-secondary" id="regenerate-btn">Regenerate from current week</button>
  `;
  wrap.appendChild(toolbar);

  const note = document.createElement("p");
  note.className = "small-note";
  note.textContent = `Generated ${new Date(groceryList.generatedAt).toLocaleString()}${groceryList.weekOf ? " · " + groceryList.weekOf : ""}`;
  wrap.appendChild(note);

  if (groceryList.customMeals && groceryList.customMeals.length) {
    const custNote = document.createElement("p");
    custNote.className = "small-note";
    custNote.textContent = "Custom one-off meals this week (add their ingredients manually): " + groceryList.customMeals.join(", ");
    wrap.appendChild(custNote);
  }

  SECTIONS.forEach((sec) => {
    const items = groceryList.items.filter((i) => i.section === sec.key);
    if (items.length === 0) return;
    const box = document.createElement("div");
    box.className = "grocery-section";
    const h = document.createElement("h3");
    h.textContent = sec.label;
    box.appendChild(h);

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "grocery-item" + (item.checked ? " checked" : "");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = item.checked;
      cb.addEventListener("change", () => {
        item.checked = cb.checked;
        row.classList.toggle("checked", item.checked);
        persistAll();
      });
      row.appendChild(cb);

      const label = document.createElement("span");
      label.className = "item-label";
      label.textContent = item.name;
      row.appendChild(label);

      if (item.quantities.length) {
        const qty = document.createElement("span");
        qty.className = "item-qty";
        qty.textContent = "(" + item.quantities.join(", ") + ")";
        row.appendChild(qty);
      }

      const src = document.createElement("span");
      src.className = "item-sources";
      src.textContent = item.sources.length > 1 ? `used in ${item.sources.length} meals` : "";
      row.appendChild(src);

      box.appendChild(row);
    });

    wrap.appendChild(box);
  });

  app.appendChild(wrap);

  document.getElementById("clear-checks-btn").addEventListener("click", () => {
    groceryList.items.forEach((i) => (i.checked = false));
    persistAll();
    render();
  });
  document.getElementById("regenerate-btn").addEventListener("click", generateGroceryList);
}

// ============================================================
// Meal Bank tab
// ============================================================
let editingMealId = null;

function renderBankTab(app) {
  const wrap = document.createElement("div");
  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";
  toolbar.innerHTML = `<button class="btn-primary" id="add-meal-btn">+ Add meal</button>`;
  wrap.appendChild(toolbar);

  CATEGORIES.forEach((cat) => {
    const group = document.createElement("div");
    group.className = "bank-category-group";
    const h = document.createElement("h3");
    h.textContent = cat.label;
    group.appendChild(h);

    const meals = mealBank.filter((m) => m.category === cat.key).sort((a, b) => a.name.localeCompare(b.name));
    if (meals.length === 0) {
      const p = document.createElement("p");
      p.className = "small-note";
      p.textContent = "No meals yet in this category.";
      group.appendChild(p);
    }

    meals.forEach((meal) => {
      const row = document.createElement("div");
      row.className = "meal-row";
      const info = document.createElement("div");
      info.className = "meal-info";
      const name = document.createElement("span");
      name.className = "meal-name";
      name.textContent = meal.name;
      info.appendChild(name);
      const meta = document.createElement("span");
      meta.className = "meal-meta";
      const cuisineTxt = meal.cuisine ? meal.cuisine + " · " : "";
      meta.textContent = cuisineTxt + meal.ingredients.length + " ingredient" + (meal.ingredients.length === 1 ? "" : "s");
      info.appendChild(meta);
      row.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "meal-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "btn-secondary";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => openMealModal(meal.id));
      const delBtn = document.createElement("button");
      delBtn.className = "btn-danger";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        if (confirm(`Delete "${meal.name}" from the meal bank?`)) {
          mealBank = mealBank.filter((m) => m.id !== meal.id);
          persistAll();
          render();
        }
      });
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      row.appendChild(actions);

      group.appendChild(row);
    });

    wrap.appendChild(group);
  });

  app.appendChild(wrap);
  document.getElementById("add-meal-btn").addEventListener("click", () => openMealModal(null));
}

function openMealModal(mealId) {
  editingMealId = mealId;
  const meal = mealId ? mealById(mealId) : { name: "", category: "breakfast", cuisine: "", ingredients: [] };

  document.getElementById("meal-modal-title").textContent = mealId ? "Edit Meal" : "Add Meal";
  document.getElementById("meal-name").value = meal.name;
  document.getElementById("meal-cuisine").value = meal.cuisine || "";

  const catSelect = document.getElementById("meal-category");
  catSelect.innerHTML = CATEGORIES.map((c) => `<option value="${c.key}">${c.label}</option>`).join("");
  catSelect.value = meal.category;

  const rowsWrap = document.getElementById("ingredient-rows");
  rowsWrap.innerHTML = "";
  (meal.ingredients.length ? meal.ingredients : [{ name: "", section: "produce", quantity: "" }]).forEach((ing) =>
    addIngredientRow(ing)
  );

  document.getElementById("meal-modal-backdrop").classList.remove("hidden");
}

function addIngredientRow(ing) {
  ing = ing || { name: "", section: "produce", quantity: "" };
  const rowsWrap = document.getElementById("ingredient-rows");
  const row = document.createElement("div");
  row.className = "ingredient-row";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Ingredient name";
  nameInput.className = "ing-name";
  nameInput.value = ing.name;

  const sectionSelect = document.createElement("select");
  sectionSelect.className = "ing-section";
  sectionSelect.innerHTML = SECTIONS.map((s) => `<option value="${s.key}">${s.label.replace(/^\S+\s/, "")}</option>`).join("");
  sectionSelect.value = ing.section;

  const qtyInput = document.createElement("input");
  qtyInput.type = "text";
  qtyInput.placeholder = "Qty (optional)";
  qtyInput.className = "ing-qty";
  qtyInput.value = ing.quantity || "";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-icon";
  removeBtn.textContent = "✕";
  removeBtn.addEventListener("click", () => row.remove());

  row.appendChild(nameInput);
  row.appendChild(sectionSelect);
  row.appendChild(qtyInput);
  row.appendChild(removeBtn);
  rowsWrap.appendChild(row);
}

document.getElementById("add-ingredient-row").addEventListener("click", () => addIngredientRow());
document.getElementById("meal-modal-cancel").addEventListener("click", closeMealModal);

function closeMealModal() {
  document.getElementById("meal-modal-backdrop").classList.add("hidden");
  editingMealId = null;
}

document.getElementById("meal-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("meal-name").value.trim();
  const category = document.getElementById("meal-category").value;
  const cuisine = document.getElementById("meal-cuisine").value.trim();

  const ingredients = [];
  document.querySelectorAll("#ingredient-rows .ingredient-row").forEach((row) => {
    const iName = row.querySelector(".ing-name").value.trim();
    const iSection = row.querySelector(".ing-section").value;
    const iQty = row.querySelector(".ing-qty").value.trim();
    if (iName) ingredients.push({ name: iName, section: iSection, quantity: iQty });
  });

  if (!name) return;

  if (editingMealId) {
    const meal = mealById(editingMealId);
    meal.name = name;
    meal.category = category;
    meal.cuisine = cuisine;
    meal.ingredients = ingredients;
  } else {
    mealBank.push({ id: uid(), name, category, cuisine, ingredients });
  }

  persistAll();
  closeMealModal();
  render();
});

// ============================================================
// History tab
// ============================================================
function renderHistoryTab(app) {
  const wrap = document.createElement("div");

  if (history.length === 0) {
    wrap.innerHTML = `<div class="empty-state">No past weeks saved yet. Use "Save as past week" on the Weekly Menu tab.</div>`;
    app.appendChild(wrap);
    return;
  }

  history.forEach((h) => {
    const row = document.createElement("div");
    row.className = "history-item";
    const info = document.createElement("div");
    info.innerHTML = `<strong>${escapeHtml(h.weekOf || "Untitled week")}</strong><br><span class="meal-meta">Saved ${new Date(h.savedAt).toLocaleDateString()}</span>`;
    row.appendChild(info);

    const actions = document.createElement("div");
    const loadBtn = document.createElement("button");
    loadBtn.className = "btn-secondary";
    loadBtn.textContent = "Load into this week";
    loadBtn.addEventListener("click", () => {
      if (confirm("Replace the current weekly grid with this saved week?")) {
        weekPlan = { weekOf: h.weekOf, days: JSON.parse(JSON.stringify(h.days)) };
        persistAll();
        activeTab = "menu";
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === "menu"));
        render();
      }
    });
    const delBtn = document.createElement("button");
    delBtn.className = "btn-danger";
    delBtn.textContent = "Delete";
    delBtn.style.marginLeft = "0.4rem";
    delBtn.addEventListener("click", () => {
      history = history.filter((x) => x.id !== h.id);
      persistAll();
      render();
    });
    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);
    row.appendChild(actions);

    wrap.appendChild(row);
  });

  app.appendChild(wrap);
}

// ---------- Init ----------
render();
