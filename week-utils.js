// week-utils.js — F3 "Cook this week" helpers.
// Global script + CommonJS shim. No dependencies.

const SLOT_ORDER = ["breakfast", "lunch", "dinner"]; // snacks follow dinner within a day

/**
 * @param {{ weekOf: string, days: Record<string, { breakfast, lunch, dinner, snacks: Array }> }} weekPlan
 * @param {Array<{ id: string, name: string, ... }>} mealBank
 * @param {Array<{ key: string, label: string }>} [days]  // injectable for tests; defaults to global DAYS
 * @returns {Array<{ kind: "bank", meal: object, slots: string[] } | { kind: "custom", name: string, slots: string[] }>}
 */
function collectWeekMeals(weekPlan, mealBank, days) {
  const dayList = days || (typeof DAYS !== "undefined" ? DAYS : []);
  const result = [];
  const bankIndexById = new Map(); // id -> index in result

  function slotLabel(dayLabel, slotName) {
    return `${dayLabel.slice(0, 3)} ${slotName}`;
  }

  function pushBank(id, dayLabel, slotName) {
    const meal = mealBank.find((m) => m.id === id);
    if (!meal) return; // deleted bank meals skipped
    const label = slotLabel(dayLabel, slotName);
    if (bankIndexById.has(id)) {
      result[bankIndexById.get(id)].slots.push(label);
    } else {
      bankIndexById.set(id, result.length);
      result.push({ kind: "bank", meal, slots: [label] });
    }
  }

  function pushCustom(name, dayLabel, slotName) {
    const label = slotLabel(dayLabel, slotName);
    result.push({ kind: "custom", name, slots: [label] });
  }

  dayList.forEach((day) => {
    const d = (weekPlan.days && weekPlan.days[day.key]) || {};
    SLOT_ORDER.forEach((slotName) => {
      const cell = d[slotName];
      if (!cell) return;
      if (cell.type === "bank") pushBank(cell.id, day.label, slotName);
      else if (cell.type === "custom") pushCustom(cell.name, day.label, slotName);
    });
    const snacks = d.snacks || [];
    snacks.forEach((cell) => {
      if (!cell) return;
      if (cell.type === "bank") pushBank(cell.id, day.label, "snack");
      else if (cell.type === "custom") pushCustom(cell.name, day.label, "snack");
    });
  });

  return result;
}

/**
 * Fill the empty slots of a week from the meal bank (never mutates its inputs).
 * Empty B/L/D slot = null/missing, or a bank cell whose id is not in mealBank.
 * Snacks are topped up to opts.snacksPerDay (default 1); existing snack entries
 * (even deleted-meal ones) count toward that total.
 * Within a category no meal repeats until every meal of that category was used
 * (meals already in the grid count as used).
 * @param {{ weekOf: string, days: object }} weekPlan
 * @param {Array<{ id: string, category: string }>} mealBank
 * @param {{ days?: Array<{key:string,label:string}>, rng?: () => number, snacksPerDay?: number }} [opts]
 * @returns {{ plan: object, filled: number, skippedCategories: string[] }}
 */
function autofillWeek(weekPlan, mealBank, opts) {
  const o = opts || {};
  const dayList = o.days || (typeof DAYS !== "undefined" ? DAYS : []);
  const rng = o.rng || Math.random;
  const snacksPerDay = Number.isFinite(o.snacksPerDay) ? o.snacksPerDay : 1;
  const categories = ["breakfast", "lunch", "dinner", "snack"];

  const plan = JSON.parse(JSON.stringify(weekPlan));
  if (!plan.days || typeof plan.days !== "object") plan.days = {};
  const bankIds = new Set(mealBank.map((m) => m.id));

  dayList.forEach((day) => {
    const d = plan.days[day.key] && typeof plan.days[day.key] === "object" ? plan.days[day.key] : {};
    SLOT_ORDER.forEach((slotName) => {
      if (d[slotName] === undefined) d[slotName] = null;
    });
    d.snacks = Array.isArray(d.snacks) ? d.snacks : [];
    plan.days[day.key] = d;
  });

  let filled = 0;
  const skippedCategories = [];

  categories.forEach((cat) => {
    const pool = mealBank.filter((m) => m.category === cat);
    const poolIds = new Set(pool.map((m) => m.id));

    // Collect the empty slots for this category, in grid order.
    const targets = []; // each is a function that places a cell
    const usedIds = new Set();
    dayList.forEach((day) => {
      const d = plan.days[day.key];
      if (cat === "snack") {
        d.snacks.forEach((c) => {
          if (c && c.type === "bank" && poolIds.has(c.id)) usedIds.add(c.id);
        });
        const need = Math.max(0, snacksPerDay - d.snacks.length);
        for (let i = 0; i < need; i++) targets.push((cell) => d.snacks.push(cell));
      } else {
        const c = d[cat];
        const isEmpty = !c || (c.type === "bank" && !bankIds.has(c.id));
        if (!isEmpty) {
          if (c.type === "bank" && poolIds.has(c.id)) usedIds.add(c.id);
        } else {
          targets.push((cell) => (d[cat] = cell));
        }
      }
    });

    if (targets.length === 0) return;
    if (pool.length === 0) {
      skippedCategories.push(cat);
      return;
    }

    function shuffled(list) {
      const a = list.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    }

    let bag = shuffled(pool.filter((m) => !usedIds.has(m.id)));
    targets.forEach((place) => {
      if (bag.length === 0) bag = shuffled(pool);
      place({ type: "bank", id: bag.pop().id });
      filled++;
    });
  });

  return { plan, filled, skippedCategories };
}

if (typeof module !== "undefined") module.exports = { collectWeekMeals, autofillWeek, SLOT_ORDER };
