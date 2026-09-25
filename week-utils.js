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

if (typeof module !== "undefined") module.exports = { collectWeekMeals, SLOT_ORDER };
