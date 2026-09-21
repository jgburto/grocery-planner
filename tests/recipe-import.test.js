const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  parseRecipeHtml,
  ingredientLineToItem,
  guessSection,
  SECTION_KEYWORDS,
} = require("../recipe-import.js");

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
}

// ---------------------------------------------------------------------------
// Minimal hand-written HTML tree + DOMParser shim, used ONLY to exercise the
// microdata fallback path under Node (which has no real DOMParser). It
// supports exactly the query forms recipe-import.js uses against the
// microdata fixture: querySelectorAll("*"), querySelectorAll('[itemprop="x"]'),
// and querySelectorAll("li"), plus getAttribute/textContent.
// ---------------------------------------------------------------------------

const VOID_TAGS = new Set(["br", "img", "meta", "link", "hr", "input"]);

function collectText(node) {
  let s = "";
  for (const c of node.children) {
    if (c.tagName === "#text") s += c.text;
    else s += collectText(c);
  }
  return s;
}

function matchesSelector(el, sel) {
  if (sel === "*") return true;
  const propMatch = sel.match(/^\[itemprop="([^"]+)"\]$/);
  if (propMatch) return el.attrs.itemprop === propMatch[1];
  return el.tagName === sel;
}

function queryAll(root, sel) {
  const out = [];
  (function walk(n) {
    for (const c of n.children) {
      if (c.tagName === "#text") continue;
      if (matchesSelector(c, sel)) out.push(c);
      walk(c);
    }
  })(root);
  return out;
}

function makeElement(tag, attrs, parent) {
  const el = {
    tagName: tag,
    attrs: attrs,
    children: [],
    parent: parent,
    getAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
    },
    querySelectorAll: function (sel) {
      return queryAll(this, sel);
    },
  };
  Object.defineProperty(el, "textContent", {
    get: function () {
      return collectText(this);
    },
  });
  return el;
}

function parseMiniHtml(html) {
  const root = { tagName: "#root", attrs: {}, children: [], parent: null };
  root.querySelectorAll = function (sel) {
    return queryAll(this, sel);
  };
  let current = root;
  const tokenRe = /<!DOCTYPE[^>]*>|<!--[\s\S]*?-->|<(\/?)([a-zA-Z0-9]+)((?:\s+[^<>]*?)?)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = tokenRe.exec(html))) {
    if (m[5] !== undefined) {
      current.children.push({ tagName: "#text", text: m[5], parent: current });
      continue;
    }
    if (m[2] === undefined) {
      // matched the <!DOCTYPE ...> or <!-- ... --> branch (no captures)
      continue;
    }
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const attrStr = m[3] || "";
    const selfClose = m[4] === "/";
    if (closing) {
      let node = current;
      while (node && node.tagName !== tag) node = node.parent;
      if (node) current = node.parent;
      continue;
    }
    const attrs = {};
    const attrRe =
      /([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"|([a-zA-Z0-9_-]+)\s*=\s*'([^']*)'|([a-zA-Z0-9_-]+)/g;
    let am;
    while ((am = attrRe.exec(attrStr))) {
      if (am[1] !== undefined) attrs[am[1].toLowerCase()] = am[2];
      else if (am[3] !== undefined) attrs[am[3].toLowerCase()] = am[4];
      else if (am[5] !== undefined) attrs[am[5].toLowerCase()] = "";
    }
    const el = makeElement(tag, attrs, current);
    current.children.push(el);
    if (!selfClose && !VOID_TAGS.has(tag)) current = el;
  }
  return root;
}

function FakeDOMParser() {}
FakeDOMParser.prototype.parseFromString = function (html) {
  return parseMiniHtml(html);
};

// ---------------------------------------------------------------------------
// AC1 — JSON-LD @graph fixture
// ---------------------------------------------------------------------------

test("AC1: jsonld @graph fixture parses name, ingredients, flattened instructions, entities, tags, yield, canonical url, title", () => {
  const html = fixture("jsonld-graph.html");
  const result = parseRecipeHtml(html);
  assert.equal(result.ok, true);
  assert.equal(result.source, "jsonld");

  const recipe = result.recipe;
  assert.equal(recipe.name, "Grandma's Chicken & Rice Soup");

  assert.deepEqual(recipe.ingredients, [
    "2 cups diced onion",
    "1 lb boneless skinless chicken breast",
    "3 cups chicken broth",
    "1 cup rice",
  ]);

  // 4 steps total, flattened from two HowToSections; no section headings
  // ("Prep"/"Cook") present anywhere in the output.
  assert.equal(recipe.instructions.length, 4);
  assert.deepEqual(recipe.instructions, [
    "Dice the onion & set aside.",
    "Trim the chicken breast.",
    "Simmer the broth and rice for 20 minutes.",
    "Add the chicken & onion, cook 10 more minutes.",
  ]);
  for (const step of recipe.instructions) {
    assert.ok(!/prep/i.test(step) || step.toLowerCase().indexOf("prep") === -1);
    assert.ok(step.indexOf("Prep") === -1);
    assert.ok(step.indexOf("Cook") === -1 || step.indexOf("cook") !== -1);
  }
  // tag stripped, entity decoded
  assert.ok(recipe.instructions.some((s) => s === "Simmer the broth and rice for 20 minutes."));
  assert.ok(recipe.instructions.every((s) => s.indexOf("<") === -1 && s.indexOf(">") === -1));

  assert.equal(recipe.yield, "6 servings");
  assert.equal(
    recipe.sourceUrl,
    "https://example-cozykitchen.test/recipes/grandmas-chicken-rice-soup"
  );
  assert.equal(recipe.sourceTitle, "Grandma's Chicken & Rice Soup - The Cozy Kitchen Blog");
});

// ---------------------------------------------------------------------------
// AC1 — array @type fixture
// ---------------------------------------------------------------------------

test("AC1: jsonld array-@type fixture parses ok, skips malformed block, sourceUrl from mainEntityOfPage.@id", () => {
  const html = fixture("jsonld-array-type.html");
  const result = parseRecipeHtml(html);
  assert.equal(result.ok, true);
  assert.equal(result.source, "jsonld");
  assert.equal(result.recipe.name, "Weeknight Beef Tacos");
  assert.equal(result.recipe.ingredients.length, 4);
  assert.deepEqual(result.recipe.instructions, [
    "Brown the ground beef in a skillet.",
    "Warm the tortillas.",
    "Assemble tacos with cheese and salsa.",
  ]);
  assert.equal(result.recipe.sourceUrl, "https://example-tastyfeed.test/beef-tacos");
});

// ---------------------------------------------------------------------------
// AC1 — string instructions fixture
// ---------------------------------------------------------------------------

test("AC1: jsonld string-instructions fixture splits numbered steps, yield '4', sourceUrl from og:url", () => {
  const html = fixture("jsonld-string-instructions.html");
  const result = parseRecipeHtml(html);
  assert.equal(result.ok, true);
  assert.equal(result.source, "jsonld");
  assert.deepEqual(result.recipe.instructions, [
    "Preheat the oven to 400F.",
    "Place salmon on a baking sheet and drizzle with olive oil.",
    "Season with salt, pepper, and lemon slices.",
    "Bake for 12 to 15 minutes until flaky.",
  ]);
  assert.equal(result.recipe.yield, "4");
  assert.equal(result.recipe.sourceUrl, "https://example-simplemeals.test/baked-salmon");
});

// ---------------------------------------------------------------------------
// AC4 — microdata fallback
// ---------------------------------------------------------------------------

test("AC4: microdata fixture with no DOMParser available in Node returns ok:false, reason 'no-recipe'", () => {
  const html = fixture("microdata.html");
  const result = parseRecipeHtml(html);
  assert.deepEqual(result, { ok: false, reason: "no-recipe" });
});

test("AC4: microdata fixture parses via a minimal hand-written DOMParser passed in opts", () => {
  const html = fixture("microdata.html");
  const result = parseRecipeHtml(html, { DOMParser: FakeDOMParser });
  assert.equal(result.ok, true);
  assert.equal(result.source, "microdata");
  assert.equal(result.recipe.name, "Old-School Microdata Chili");
  assert.deepEqual(result.recipe.ingredients, [
    "1 lb ground beef",
    "1 can kidney beans",
    "1 can diced tomatoes",
    "1 tbsp chili powder",
  ]);
  assert.deepEqual(result.recipe.instructions, [
    "Brown the ground beef in a large pot.",
    "Add the beans, tomatoes, and chili powder.",
    "Simmer for 30 minutes, stirring occasionally.",
  ]);
  assert.equal(result.recipe.yield, "6 servings");
});

// ---------------------------------------------------------------------------
// AC5 — no recipe / empty input
// ---------------------------------------------------------------------------

test("AC5: page with unrelated JSON-LD (NewsArticle) returns ok:false, reason 'no-recipe'", () => {
  const html = fixture("no-recipe.html");
  const result = parseRecipeHtml(html);
  assert.deepEqual(result, { ok: false, reason: "no-recipe" });
});

test("AC5: empty string input returns ok:false, reason 'empty'", () => {
  assert.deepEqual(parseRecipeHtml(""), { ok: false, reason: "empty" });
});

test("AC5: non-string input returns ok:false, reason 'empty'", () => {
  assert.deepEqual(parseRecipeHtml(null), { ok: false, reason: "empty" });
  assert.deepEqual(parseRecipeHtml(undefined), { ok: false, reason: "empty" });
  assert.deepEqual(parseRecipeHtml(42), { ok: false, reason: "empty" });
});

// ---------------------------------------------------------------------------
// AC6 — ingredientLineToItem
// ---------------------------------------------------------------------------

test("AC6: ingredientLineToItem — '2 cups diced onion'", () => {
  assert.deepEqual(ingredientLineToItem("2 cups diced onion"), {
    name: "Onion",
    quantity: "2 cups",
    section: "produce",
  });
});

test("AC6: ingredientLineToItem — '1/2 lb boneless skinless chicken breast'", () => {
  const result = ingredientLineToItem("1/2 lb boneless skinless chicken breast");
  assert.equal(result.section, "meat_seafood");
  assert.equal(result.quantity, "1/2 lb");
});

test("AC6: ingredientLineToItem — '½ cup coconut milk' -> canned_frozen", () => {
  const result = ingredientLineToItem("½ cup coconut milk");
  assert.equal(result.section, "canned_frozen");
});

test("AC6: ingredientLineToItem — '1 (15 oz) can black beans' -> canned_frozen", () => {
  // Quantity extraction choice (documented in report): the leading run
  // "1 (15 oz) can" is treated as the quantity, since "can" is itself a unit
  // token reconstructed from the original line.
  const result = ingredientLineToItem("1 (15 oz) can black beans");
  assert.equal(result.section, "canned_frozen");
  assert.equal(result.quantity, "1 (15 oz) can");
});

test("AC6: ingredientLineToItem — 'salt'", () => {
  assert.deepEqual(ingredientLineToItem("salt"), {
    name: "Salt",
    quantity: "",
    section: "pantry_grains",
  });
});

test("AC6: ingredientLineToItem — '2 tbsp tomato paste' -> canned_frozen", () => {
  const result = ingredientLineToItem("2 tbsp tomato paste");
  assert.equal(result.section, "canned_frozen");
});

test("AC6: ingredientLineToItem — '3 large eggs' -> dairy_eggs", () => {
  const result = ingredientLineToItem("3 large eggs");
  assert.equal(result.section, "dairy_eggs");
  assert.equal(result.name, "Eggs");
});

test("AC6: ingredientLineToItem — '1 bunch cilantro' -> produce", () => {
  const result = ingredientLineToItem("1 bunch cilantro");
  assert.equal(result.section, "produce");
  assert.equal(result.name, "Cilantro");
});

// ---------------------------------------------------------------------------
// guessSection
// ---------------------------------------------------------------------------

test("guessSection: longest matching keyword wins across sections", () => {
  assert.equal(guessSection("coconut milk"), "canned_frozen");
  assert.equal(guessSection("tomato paste"), "canned_frozen");
  assert.equal(guessSection("canned tomatoes"), "canned_frozen");
  assert.equal(guessSection("diced tomatoes"), "canned_frozen");
  assert.equal(guessSection("tomato"), "produce");
  assert.equal(guessSection("milk"), "dairy_eggs");
});

test("guessSection: unknown ingredient falls back to pantry_grains", () => {
  assert.equal(guessSection("totally-unknown-thing-xyz"), "pantry_grains");
});

test("SECTION_KEYWORDS: perishable sections are populated generously", () => {
  assert.ok(SECTION_KEYWORDS.produce.length >= 25);
  assert.ok(SECTION_KEYWORDS.meat_seafood.length >= 25);
  assert.ok(SECTION_KEYWORDS.dairy_eggs.length >= 25);
});
