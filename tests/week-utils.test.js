const test = require("node:test");
const assert = require("node:assert/strict");

const { collectWeekMeals, autofillWeek, SLOT_ORDER } = require("../week-utils.js");

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

// ---------- autofillWeek ----------

function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBank(counts) {
  const bank = [];
  Object.keys(counts).forEach((cat) => {
    for (let i = 0; i < counts[cat]; i++) bank.push({ id: `${cat}${i}`, name: `${cat} ${i}`, category: cat });
  });
  return bank;
}

const BIG = { breakfast: 8, lunch: 8, dinner: 8, snack: 8 };

function fill(week, bank, extra) {
  return autofillWeek(week, bank, { days: DAYS, rng: seededRng(1), ...(extra || {}) });
}

function idsIn(plan, cat) {
  const out = [];
  DAYS.forEach((d) => {
    const day = plan.days[d.key];
    if (cat === "snack") day.snacks.forEach((c) => c && c.type === "bank" && out.push(c.id));
    else if (day[cat] && day[cat].type === "bank") out.push(day[cat].id);
  });
  return out;
}

test("autofill: empty week fills 7*3 + 7 snacks with category-correct bank cells", () => {
  const bank = makeBank(BIG);
  const r = fill(emptyWeek(), bank);
  assert.equal(r.filled, 28);
  assert.deepEqual(r.skippedCategories, []);
  ["breakfast", "lunch", "dinner", "snack"].forEach((cat) => {
    const ids = idsIn(r.plan, cat);
    assert.equal(ids.length, 7);
    ids.forEach((id) => assert.ok(id.startsWith(cat)));
  });
  DAYS.forEach((d) => assert.equal(r.plan.days[d.key].snacks.length, 1));
});

test("autofill: keeps custom and valid bank picks, fills only empties", () => {
  const bank = makeBank(BIG);
  const week = emptyWeek();
  week.days.mon.breakfast = { type: "custom", name: "Leftovers" };
  week.days.tue.lunch = { type: "bank", id: "lunch3" };
  week.days.wed.snacks = [{ type: "custom", name: "Nuts" }];
  const r = fill(week, bank);
  assert.deepEqual(r.plan.days.mon.breakfast, { type: "custom", name: "Leftovers" });
  assert.deepEqual(r.plan.days.tue.lunch, { type: "bank", id: "lunch3" });
  assert.deepEqual(r.plan.days.wed.snacks, [{ type: "custom", name: "Nuts" }]);
  assert.equal(r.filled, 28 - 3);
});

test("autofill: deleted-meal B/L/D cell is refilled", () => {
  const bank = makeBank(BIG);
  const week = emptyWeek();
  week.days.mon.dinner = { type: "bank", id: "gone" };
  const r = fill(week, bank);
  assert.equal(r.plan.days.mon.dinner.type, "bank");
  assert.ok(r.plan.days.mon.dinner.id.startsWith("dinner"));
  assert.equal(r.filled, 28);
});

test("autofill: deleted-meal snack is left alone and counts toward snacksPerDay", () => {
  const bank = makeBank(BIG);
  const week = emptyWeek();
  week.days.mon.snacks = [{ type: "bank", id: "gone" }];
  const r = fill(week, bank);
  assert.deepEqual(r.plan.days.mon.snacks, [{ type: "bank", id: "gone" }]);
  assert.equal(r.filled, 27);
});

test("autofill: deleted-meal B/L/D cell stays untouched when category has no bank meals", () => {
  const bank = makeBank({ breakfast: 3, lunch: 3, snack: 3 });
  const week = emptyWeek();
  week.days.mon.dinner = { type: "bank", id: "gone" };
  const r = fill(week, bank);
  assert.deepEqual(r.plan.days.mon.dinner, { type: "bank", id: "gone" });
  assert.deepEqual(r.skippedCategories, ["dinner"]);
});

test("autofill: missing/null day objects and missing snacks arrays are treated as empty", () => {
  const bank = makeBank(BIG);
  const week = { weekOf: "x", days: { mon: null, tue: { breakfast: null, lunch: null, dinner: null }, wed: { snacks: null } } };
  const r = fill(week, bank);
  assert.equal(r.filled, 28);
  DAYS.forEach((d) => {
    const day = r.plan.days[d.key];
    ["breakfast", "lunch", "dinner"].forEach((c) => assert.equal(day[c].type, "bank"));
    assert.equal(day.snacks.length, 1);
  });
  assert.equal(r.plan.weekOf, "x");
});

test("autofill: no in-category repeat while pool has unused meals", () => {
  const bank = makeBank({ breakfast: 7, lunch: 7, dinner: 7, snack: 7 });
  for (let seed = 1; seed <= 10; seed++) {
    const r = autofillWeek(emptyWeek(), bank, { days: DAYS, rng: seededRng(seed) });
    ["breakfast", "lunch", "dinner", "snack"].forEach((cat) => {
      const ids = idsIn(r.plan, cat);
      assert.equal(new Set(ids).size, 7, `${cat} seed ${seed}`);
    });
  }
});

test("autofill: pool smaller than slot count repeats only after exhaustion", () => {
  const bank = makeBank({ breakfast: 3, lunch: 3, dinner: 3, snack: 3 });
  const r = fill(emptyWeek(), bank);
  const ids = idsIn(r.plan, "dinner");
  assert.equal(ids.length, 7);
  // first 3 are a full cycle, next 3 another full cycle, last 1 any
  assert.equal(new Set(ids.slice(0, 3)).size, 3);
  assert.equal(new Set(ids.slice(3, 6)).size, 3);
});

test("autofill: meals already placed count as used", () => {
  const bank = makeBank({ breakfast: 7, lunch: 7, dinner: 7, snack: 7 });
  const week = emptyWeek();
  week.days.mon.dinner = { type: "bank", id: "dinner0" };
  week.days.tue.dinner = { type: "bank", id: "dinner1" };
  for (let seed = 1; seed <= 10; seed++) {
    const r = autofillWeek(week, bank, { days: DAYS, rng: seededRng(seed) });
    assert.equal(new Set(idsIn(r.plan, "dinner")).size, 7, `seed ${seed}`);
  }
});

test("autofill: empty category is skipped and reported in CATEGORIES order", () => {
  const bank = makeBank({ lunch: 4, dinner: 4 });
  const r = fill(emptyWeek(), bank);
  assert.deepEqual(r.skippedCategories, ["breakfast", "snack"]);
  assert.equal(r.filled, 14);
  DAYS.forEach((d) => {
    assert.equal(r.plan.days[d.key].breakfast, null);
    assert.deepEqual(r.plan.days[d.key].snacks, []);
  });
});

test("autofill: category with no empty slots is not reported as skipped", () => {
  const bank = makeBank({ lunch: 4, dinner: 4, snack: 4 });
  const week = emptyWeek();
  DAYS.forEach((d) => (week.days[d.key].breakfast = { type: "custom", name: "Oats" }));
  const r = fill(week, bank);
  assert.deepEqual(r.skippedCategories, []);
});

test("autofill: empty bank fills nothing and reports all categories", () => {
  const r = fill(emptyWeek(), []);
  assert.equal(r.filled, 0);
  assert.deepEqual(r.skippedCategories, ["breakfast", "lunch", "dinner", "snack"]);
  assert.deepEqual(r.plan, emptyWeek());
});

test("autofill: full week yields filled 0 and an equal plan", () => {
  const bank = makeBank(BIG);
  const full = fill(emptyWeek(), bank).plan;
  const r = fill(full, bank);
  assert.equal(r.filled, 0);
  assert.deepEqual(r.skippedCategories, []);
  assert.deepEqual(r.plan, full);
});

test("autofill: snacksPerDay 2 tops up to 2", () => {
  const bank = makeBank(BIG);
  const week = emptyWeek();
  week.days.mon.snacks = [{ type: "bank", id: "snack0" }];
  week.days.tue.snacks = [{ type: "custom", name: "a" }, { type: "custom", name: "b" }, { type: "custom", name: "c" }];
  const r = fill(week, bank, { snacksPerDay: 2 });
  assert.equal(r.plan.days.mon.snacks.length, 2);
  assert.equal(r.plan.days.tue.snacks.length, 3);
  assert.equal(r.plan.days.wed.snacks.length, 2);
  assert.equal(r.filled, 21 + 1 + 0 + 5 * 2);
});

test("autofill: does not mutate inputs", () => {
  const bank = makeBank(BIG);
  const week = emptyWeek();
  week.days.mon.dinner = { type: "bank", id: "gone" };
  delete week.days.tue.snacks;
  const weekCopy = JSON.parse(JSON.stringify(week));
  const bankCopy = JSON.parse(JSON.stringify(bank));
  const r = fill(week, bank);
  assert.deepEqual(week, weekCopy);
  assert.deepEqual(bank, bankCopy);
  assert.notEqual(r.plan, week);
  assert.notEqual(r.plan.days.mon, week.days.mon);
});

test("autofill: deterministic under a seeded rng, varies across seeds", () => {
  const bank = makeBank(BIG);
  const a = autofillWeek(emptyWeek(), bank, { days: DAYS, rng: seededRng(42) });
  const b = autofillWeek(emptyWeek(), bank, { days: DAYS, rng: seededRng(42) });
  const c = autofillWeek(emptyWeek(), bank, { days: DAYS, rng: seededRng(43) });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.plan, c.plan);
});
