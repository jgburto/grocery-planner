const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeIngredientName,
  shelfLifeFor,
  formatShelfLife,
  SHELF_LIFE_TABLE,
  SECTION_DEFAULT_SHELF_LIFE,
} = require("../shelflife.js");

const { SEED_MEALS } = require("../seed.js");

function uniqueSeedNames() {
  const set = new Set();
  for (const meal of SEED_MEALS) {
    for (const ing of meal.ingredients) {
      set.add(ing.name.toLowerCase().trim());
    }
  }
  return Array.from(set);
}

test("AC1: every unique seed ingredient name resolves via the table (no section fallback)", () => {
  const names = uniqueSeedNames();
  assert.ok(names.length >= 85, `expected ~95 unique seed names, got ${names.length}`);
  for (const name of names) {
    const result = shelfLifeFor(name, "produce", undefined);
    assert.equal(
      result.source,
      "table",
      `expected "${name}" to resolve via table, got source="${result.source}"`
    );
    // Strengthened: when the seed name (lowercased/trimmed) is itself an
    // exact table key, the lookup must return THAT key's entry, not some
    // other key reached by normalization (catches the "diced tomatoes"
    // resolving to "tomatoes" class of bug).
    if (Object.prototype.hasOwnProperty.call(SHELF_LIFE_TABLE, name)) {
      const expected = SHELF_LIFE_TABLE[name];
      assert.deepEqual(
        { min: result.min, max: result.max, storage: result.storage },
        expected,
        `expected "${name}" to resolve to its own table entry, got ${JSON.stringify(result)}`
      );
    }
  }
});

test("AC2: lookup is case-insensitive and whitespace-trimmed", () => {
  const a = shelfLifeFor("greek yogurt ", "dairy_eggs");
  const b = shelfLifeFor("Greek Yogurt", "dairy_eggs");
  assert.deepEqual(a, b);
  assert.equal(a.source, "table");
});

test("AC3: unknown name falls back to per-section default with source 'section'", () => {
  const cases = [
    ["produce", { min: 5, max: 7, storage: "fridge" }],
    ["meat_seafood", { min: 2, max: 3, storage: "fridge" }],
    ["dairy_eggs", { min: 7, max: 14, storage: "fridge" }],
    ["pantry_grains", { min: 180, max: 365, storage: "pantry" }],
    ["canned_frozen", { min: 180, max: 365, storage: "pantry" }],
    ["condiments", { min: 90, max: 180, storage: "fridge" }],
  ];
  for (const [section, expected] of cases) {
    const result = shelfLifeFor("totally-made-up-ingredient-xyz", section);
    assert.equal(result.source, "section");
    assert.equal(result.min, expected.min);
    assert.equal(result.max, expected.max);
    assert.equal(result.storage, expected.storage);
  }
});

test("AC3b: unknown section falls back to produce default", () => {
  const result = shelfLifeFor("totally-made-up-ingredient-xyz", "not_a_real_section");
  assert.equal(result.source, "section");
  assert.equal(result.min, SECTION_DEFAULT_SHELF_LIFE.produce.min);
  assert.equal(result.max, SECTION_DEFAULT_SHELF_LIFE.produce.max);
});

test("AC4: explicit override wins with source 'override'", () => {
  const result = shelfLifeFor("Milk", "dairy_eggs", 4);
  assert.deepEqual(result, { min: 4, max: 4, storage: "fridge", source: "override" });
});

test("AC4b: invalid overrides (0, NaN, negative, undefined) are ignored", () => {
  for (const bad of [0, NaN, -1, undefined]) {
    const result = shelfLifeFor("Milk", "dairy_eggs", bad);
    assert.notEqual(result.source, "override");
  }
});

test("normalizeIngredientName: strips quantity + prep words", () => {
  assert.equal(normalizeIngredientName("2 cups diced Onion"), "onion");
  assert.equal(
    normalizeIngredientName("1/2 lb boneless skinless chicken breast"),
    "chicken breast"
  );
  assert.equal(normalizeIngredientName("salt (to taste)"), "salt");
});

test("normalizeIngredientName: never returns empty for letter-containing input", () => {
  assert.equal(normalizeIngredientName("frozen"), "frozen");
  assert.equal(normalizeIngredientName("Diced"), "diced");
});

test("shelfLifeFor: step 2 (pre-strip exact match) beats step 3 (normalized exact match) — 'Frozen mixed berries' keeps the freezer entry over the fresh 'mixed berries' entry", () => {
  const result = shelfLifeFor("Frozen mixed berries", "canned_frozen");
  assert.equal(result.source, "table");
  assert.deepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["frozen mixed berries"]
  );
  // Sanity: if step 2 were skipped/reordered, normalization would strip
  // "frozen" (it's only kept when the pre-strip form isn't checked first)
  // and this would incorrectly resolve to the fresh "mixed berries" entry.
  assert.notDeepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["mixed berries"]
  );
});

test("shelfLifeFor: step 2 (pre-strip exact match) runs BEFORE step 3 (normalized exact match) — 'Diced tomatoes' keeps the canned/pantry entry, not the fresh 'tomatoes' entry", () => {
  const result = shelfLifeFor("Diced tomatoes", "canned_frozen");
  assert.equal(result.source, "table");
  assert.deepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["diced tomatoes"]
  );
  assert.notDeepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["tomatoes"]
  );
});

test("shelfLifeFor: step 3b (singularization) applies regardless of section, and is not subsumed by the gated step 4", () => {
  const produceResult = shelfLifeFor("onions", "produce");
  assert.equal(produceResult.source, "table");
  assert.deepEqual(
    { min: produceResult.min, max: produceResult.max, storage: produceResult.storage },
    SHELF_LIFE_TABLE["onion"]
  );

  // pantry_grains skips the gated step-4 substring match entirely, so if
  // this still resolves to the onion entry it must be via step 3b.
  const pantryResult = shelfLifeFor("onions", "pantry_grains");
  assert.equal(pantryResult.source, "table");
  assert.deepEqual(
    { min: pantryResult.min, max: pantryResult.max, storage: pantryResult.storage },
    SHELF_LIFE_TABLE["onion"]
  );
});

test("shelfLifeFor: step 4 (gated substring match) is required for '2 red onions' in produce — not reachable via steps 2/3/3b", () => {
  const result = shelfLifeFor("2 red onions", "produce");
  assert.equal(result.source, "table");
  assert.deepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["onion"]
  );
});

test("shelfLifeFor: the section gate on step 4 excludes non-perishable sections", () => {
  const chickenStock = shelfLifeFor("chicken stock", "pantry_grains");
  assert.equal(chickenStock.source, "section");
  assert.deepEqual(
    { min: chickenStock.min, max: chickenStock.max, storage: chickenStock.storage },
    SECTION_DEFAULT_SHELF_LIFE.pantry_grains
  );

  const tomatoPaste = shelfLifeFor("tomato paste", "canned_frozen");
  assert.equal(tomatoPaste.source, "section");
  assert.deepEqual(
    { min: tomatoPaste.min, max: tomatoPaste.max, storage: tomatoPaste.storage },
    SECTION_DEFAULT_SHELF_LIFE.canned_frozen
  );

  const breadCrumbs = shelfLifeFor("bread crumbs", "pantry_grains");
  assert.equal(breadCrumbs.source, "section");
  assert.deepEqual(
    { min: breadCrumbs.min, max: breadCrumbs.max, storage: breadCrumbs.storage },
    SECTION_DEFAULT_SHELF_LIFE.pantry_grains
  );
});

test("shelfLifeFor: the section gate on step 4 allows perishable sections — 'chicken stock' in meat_seafood resolves to the chicken entry", () => {
  // Documented, not hidden: the gate is a section allowlist, not a keyword
  // blocklist, so "chicken stock" filed under meat_seafood still matches
  // "chicken" via the substring step. Only pantry_grains/canned_frozen/
  // condiments are excluded.
  const result = shelfLifeFor("chicken stock", "meat_seafood");
  assert.equal(result.source, "table");
  assert.deepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["chicken"]
  );
});

test("shelfLifeFor: longest-key-wins in the gated substring step — 'roasted sweet potatoes' matches 'sweet potatoes', not the shorter 'potatoes'", () => {
  assert.ok(SHELF_LIFE_TABLE["sweet potatoes"], "expected a 'sweet potatoes' table entry to exist");
  assert.ok(SHELF_LIFE_TABLE["potatoes"], "expected a 'potatoes' table entry to exist");
  assert.notDeepEqual(
    SHELF_LIFE_TABLE["sweet potatoes"],
    SHELF_LIFE_TABLE["potatoes"],
    "test fixture requires the two entries to differ so longest-key-wins is observable"
  );
  const result = shelfLifeFor("roasted sweet potatoes", "produce");
  assert.equal(result.source, "table");
  assert.deepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["sweet potatoes"]
  );
  assert.notDeepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["potatoes"]
  );
});

test("shelfLifeFor: word-boundary check — 'onionsoup' (no boundary) does NOT match the onion entry", () => {
  const result = shelfLifeFor("onionsoup", "produce");
  assert.equal(result.source, "section");
  assert.deepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SECTION_DEFAULT_SHELF_LIFE.produce
  );
});

test("shelfLifeFor: '3 large eggs' resolves to the eggs entry", () => {
  const result = shelfLifeFor("3 large eggs", "dairy_eggs");
  assert.equal(result.source, "table");
  assert.equal(result.min, SHELF_LIFE_TABLE["eggs"].min);
  assert.equal(result.max, SHELF_LIFE_TABLE["eggs"].max);
});

test("shelfLifeFor: whole-word substring match ('red onion' -> onion)", () => {
  const result = shelfLifeFor("red onion", "produce");
  assert.equal(result.source, "table");
  assert.deepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["onion"]
  );
});

test("shelfLifeFor: plural 'onions' resolves via singularization to the onion entry", () => {
  const result = shelfLifeFor("onions", "produce");
  assert.equal(result.source, "table");
  assert.deepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["onion"]
  );
});

test("shelfLifeFor: '3 tomatoes' resolves to the tomato/tomatoes entry", () => {
  const result = shelfLifeFor("3 tomatoes", "produce");
  assert.equal(result.source, "table");
  const expected = SHELF_LIFE_TABLE["tomatoes"] || SHELF_LIFE_TABLE["tomato"];
  assert.deepEqual({ min: result.min, max: result.max, storage: result.storage }, expected);
});

test("shelfLifeFor: '2 red onions' resolves to onion via substring of singularized form", () => {
  const result = shelfLifeFor("2 red onions", "produce");
  assert.equal(result.source, "table");
  assert.deepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["onion"]
  );
});

test("shelfLifeFor: 'grapes' (a seed key itself) still resolves directly", () => {
  const result = shelfLifeFor("grapes", "produce");
  assert.equal(result.source, "table");
  assert.deepEqual(
    { min: result.min, max: result.max, storage: result.storage },
    SHELF_LIFE_TABLE["grapes"]
  );
});

test("formatShelfLife: range, equal, and >=30 branches", () => {
  assert.equal(formatShelfLife({ min: 5, max: 7 }), "good ~5–7 days");
  assert.equal(formatShelfLife({ min: 7, max: 7 }), "good ~7 days");
  assert.equal(formatShelfLife({ min: 180, max: 365 }), "");
  assert.equal(formatShelfLife(null), "");
});
