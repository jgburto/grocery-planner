const test = require("node:test");
const assert = require("node:assert/strict");

const { collectWeekMeals, SLOT_ORDER } = require("../week-utils.js");

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

function emptyDay() {
  return { breakfast: null, lunch: null, dinner: null, snacks: [] };
}

function emptyWeek() {
  const days = {};
  DAYS.forEach((d) => (days[d.key] = emptyDay()));
  return { weekOf: "", days };
}

test("SLOT_ORDER is frozen breakfast, lunch, dinner", () => {
  assert.deepEqual(SLOT_ORDER, ["breakfast", "lunch", "dinner"]);
});

test("empty week returns []", () => {
  const week = emptyWeek();
  const bank = [];
  assert.deepEqual(collectWeekMeals(week, bank, DAYS), []);
});

test("single bank meal in one slot", () => {
  const week = emptyWeek();
  week.days.mon.dinner = { type: "bank", id: "m1" };
  const bank = [{ id: "m1", name: "Tacos" }];
  const result = collectWeekMeals(week, bank, DAYS);
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, "bank");
  assert.equal(result[0].meal.name, "Tacos");
  assert.deepEqual(result[0].slots, ["Mon dinner"]);
});

test("same meal in 3 slots produces one entry with 3 slots in grid order", () => {
  const week = emptyWeek();
  week.days.mon.dinner = { type: "bank", id: "m1" };
  week.days.wed.lunch = { type: "bank", id: "m1" };
  week.days.tue.breakfast = { type: "bank", id: "m1" };
  const bank = [{ id: "m1", name: "Tacos" }];
  const result = collectWeekMeals(week, bank, DAYS);
  assert.equal(result.length, 1);
  // grid order: Mon dinner comes before Tue breakfast comes before Wed lunch
  assert.deepEqual(result[0].slots, ["Mon dinner", "Tue breakfast", "Wed lunch"]);
});

test("custom meal in a main slot and a custom snack are separate entries", () => {
  const week = emptyWeek();
  week.days.mon.lunch = { type: "custom", name: "Leftovers" };
  week.days.mon.snacks.push({ type: "custom", name: "Leftovers" });
  const bank = [];
  const result = collectWeekMeals(week, bank, DAYS);
  assert.equal(result.length, 2);
  assert.equal(result[0].kind, "custom");
  assert.equal(result[0].name, "Leftovers");
  assert.deepEqual(result[0].slots, ["Mon lunch"]);
  assert.equal(result[1].kind, "custom");
  assert.deepEqual(result[1].slots, ["Mon snack"]);
});

test("deleted bank id is skipped", () => {
  const week = emptyWeek();
  week.days.mon.dinner = { type: "bank", id: "missing" };
  const bank = [{ id: "other", name: "Something" }];
  const result = collectWeekMeals(week, bank, DAYS);
  assert.deepEqual(result, []);
});

test("snacks ordered after the day's dinner", () => {
  const week = emptyWeek();
  week.days.mon.breakfast = { type: "bank", id: "b" };
  week.days.mon.dinner = { type: "bank", id: "d" };
  week.days.mon.snacks.push({ type: "bank", id: "s" });
  const bank = [
    { id: "b", name: "Breakfast meal" },
    { id: "d", name: "Dinner meal" },
    { id: "s", name: "Snack meal" },
  ];
  const result = collectWeekMeals(week, bank, DAYS);
  assert.deepEqual(
    result.map((r) => r.meal.name),
    ["Breakfast meal", "Dinner meal", "Snack meal"]
  );
});

test("two different custom meals with the same name are separate entries (no dedupe)", () => {
  const week = emptyWeek();
  week.days.mon.lunch = { type: "custom", name: "Leftovers" };
  week.days.tue.dinner = { type: "custom", name: "Leftovers" };
  const result = collectWeekMeals(week, [], DAYS);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].slots, ["Mon lunch"]);
  assert.deepEqual(result[1].slots, ["Tue dinner"]);
});

test("does not mutate inputs", () => {
  const week = emptyWeek();
  week.days.mon.dinner = { type: "bank", id: "m1" };
  const bank = [{ id: "m1", name: "Tacos" }];
  const weekCopy = JSON.parse(JSON.stringify(week));
  const bankCopy = JSON.parse(JSON.stringify(bank));
  collectWeekMeals(week, bank, DAYS);
  assert.deepEqual(week, weekCopy);
  assert.deepEqual(bank, bankCopy);
});

test("missing days[key] and missing snacks are treated as empty", () => {
  const week = { weekOf: "", days: { mon: { breakfast: null, lunch: null, dinner: null } } };
  const result = collectWeekMeals(week, [], DAYS);
  assert.deepEqual(result, []);
});

test("repeated bank meal keeps its first position and snacks stay inside their day", () => {
  const bank = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ];
  const wp = emptyWeek();
  wp.days.mon.lunch = { type: "bank", id: "a" };
  wp.days.mon.snacks = [{ type: "custom", name: "Apple" }];
  wp.days.tue.breakfast = { type: "bank", id: "b" };
  wp.days.tue.dinner = { type: "bank", id: "a" }; // re-seen after B was pushed
  const out = collectWeekMeals(wp, bank, DAYS);
  assert.deepEqual(
    out.map((e) => (e.kind === "bank" ? e.meal.id : "custom:" + e.name)),
    ["a", "custom:Apple", "b"]
  );
  assert.deepEqual(out[0].slots, ["Mon lunch", "Tue dinner"]);
  assert.deepEqual(out[1].slots, ["Mon snack"]);
});
