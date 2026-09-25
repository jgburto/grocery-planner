# SPEC — Grocery Planner

Living specification. Contracts marked **FROZEN** may not change without a DECISIONS.md entry.
Status: **F1 COMPLETE & REVIEWED (2026-09-20) — uncommitted, awaiting user go-ahead to branch/PR. F2 contracts drafted (Q8: `.html` only). F3 drafted.**

## 0. Ratified answers (2026-09-20)

- Q1 Static shelf life only (no purchase-date countdown). ✅
- Q2 Range `{min, max}`, rendered "3–5 days" / "7 days". ✅
- Q3 Badge on grocery list + per-ingredient override in meal editor. ✅
- Q4 Imported recipes live in the existing Meal Bank. ✅
- Q5 **No local server.** Recipe import = user drags/drops (or picks) a file saved from the web; all parsing is client-side. ❌ server option rejected.
- Q7 F3 displays saved instructions; no AI generation. ✅
- Q8 Drop zone accepts `.html`/`.htm` only (browser "Save Page As"). Other formats are non-goals for now. ✅

## 1. Goal

Show, for each item on the generated grocery list, how many days after purchase it stays good to eat, so the user can plan which perishables to use first. Data comes from a built-in shelf-life table keyed by ingredient name, with an optional per-ingredient override stored on the meal.

## 2. Acceptance criteria

1. `shelfLifeFor(name, section, override)` returns `{min, max, storage}` for every ingredient name in `seed.js` (all ~95 unique names resolve without falling back to the section default).
2. Lookup is case-insensitive and whitespace-trimmed: `"greek yogurt "` and `"Greek Yogurt"` resolve identically.
3. Unknown names fall back to a per-section default (`produce` → 5–7d, `meat_seafood` → 2–3d, `dairy_eggs` → 7–14d, `pantry_grains` → 180d+, `canned_frozen` → 180d+, `condiments` → 90d+) and the result carries `source: "section"`.
4. An ingredient with an explicit `shelfLifeDays` override on the meal uses that value and the result carries `source: "override"`.
5. Every grocery-list item row renders a shelf-life badge (e.g. "good ~5–7 days") when `max` is < 30; items ≥ 30 days render no badge (pantry noise suppression).
6a. Tests pin the lookup order: a test exists for each step that fails if that step is removed or reordered (steps 2, 3, 3b, 4, the section gate on 4, and whole-word boundaries).
6. Grocery list items keep all existing behavior: dedup, checked-state persistence, section grouping, sort order — verified by existing manual flow and by unit tests for `generateGroceryList`'s pure core if extracted.
7. When a deduped item has multiple sources with different overrides, the *shortest* `max` wins (conservative).
8. The Meal Bank ingredient row has an optional "Good for (days)" numeric input; blank = no override; saved as `shelfLifeDays: number | undefined`.
9. Existing `gp_mealBank` data without `shelfLifeDays` loads unchanged (no migration required; field is optional).
10. `npm test` (or equivalent — see §5) runs the shelf-life unit tests in Node and exits 0.
11. `sw.js` `APP_SHELL` includes any new script file so offline mode still works; `CACHE_NAME` is bumped.

## 3. Non-goals

- Recording purchase dates or computing calendar expiry dates (Q1 default; future feature).
- Notifications / reminders.
- Per-storage-mode toggles (fridge vs. freezer vs. counter) in the UI — table stores a `storage` hint string only for display.
- Nutrition, pricing, or store integration.
- Any backend, sync, or build tooling beyond a Node test runner.

## 4. Interface contracts

### 4.1 Data model additions (FROZEN once delegated)

```js
// Ingredient (existing) — add optional field
{ name: string, section: SectionKey, quantity: string, shelfLifeDays?: number }

// Shelf-life table entry (new, in shelflife.js)
// key: normalized name (lowercase, trimmed)
{ min: number, max: number, storage: "fridge" | "freezer" | "pantry" | "counter" }

// Lookup result
{ min: number, max: number, storage: string, source: "override" | "table" | "section" }

// GroceryList item (existing) — add
{ ..., shelfLife: { min, max, storage, source } | null }
```

### 4.2 Functions (new file `shelflife.js`, global-script + Node compatible)

```js
function normalizeIngredientName(name: string): string
//   lowercase; trim; collapse whitespace; drop parentheticals "(...)";
//   drop leading quantity tokens: digits, fractions (½, 1/2), ranges (2-3), units
//   (cup|cups|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|clove|cloves|can|cans|package|pkg|bunch|pinch|dash|slice|slices|piece|pieces);
//   drop prep/size words anywhere: diced|chopped|minced|sliced|fresh|frozen*|large|small|medium|ripe|boneless|skinless|shredded*|grated|peeled|cubed|thinly|finely|roughly|to taste|optional
//   (*"frozen" and "shredded" are NOT stripped when keeping them yields an exact table key — RATIFIED: normalizeIngredientName is table-aware for these two words only, so "Frozen mixed berries" -> freezer entry, not the fresh-berries entry)
//   e.g. "2 cups diced Onion" -> "onion"; "Greek Yogurt " -> "greek yogurt"
function shelfLifeFor(name: string, section: SectionKey, overrideDays?: number): ShelfLifeResult
//   lookup order (REVISED 2026-09-20 after review):
//   1. overrideDays is a finite number > 0  -> {min: n, max: n, storage: "fridge", source: "override"}
//   2. exact table key == lowercase(trim(collapse-ws(name)))  (PRE-strip; "diced tomatoes", "frozen mixed berries") -> "table"
//   3. exact table key == normalize(name) -> "table"
//   3b. exact table key == singularize(normalize(name)) ("onions"->"onion", "tomatoes"->"tomato";
//       rules: "ies"->"y", "oes"->"o", "es"->"", "s"->"") -> "table"
//   4. ONLY IF section is one of produce | meat_seafood | dairy_eggs:
//      longest table key that appears as a whole-word substring of normalize(name) or its singularized form -> "table"
//      (pantry_grains / canned_frozen / condiments skip this step: "chicken stock", "tomato paste", "bread crumbs"
//       must NOT inherit a perishable's short life)
//   5. SECTION_DEFAULT_SHELF_LIFE[section] -> source "section"; unknown section -> produce default
function formatShelfLife(result: ShelfLifeResult): string   // "good ~5–7 days" | "good ~7 days" | "" if max >= 30
const SHELF_LIFE_TABLE: Record<string, {min,max,storage}>
const SECTION_DEFAULT_SHELF_LIFE: Record<SectionKey, {min,max,storage}>
// Export shim at bottom:
// if (typeof module !== "undefined") module.exports = { ... };
```

Load order in `index.html`: `seed.js` → `shelflife.js` → `app.js`.

## 5. Verification command

None exists today. To be established as unit 0:

```
npm test   →   node --test tests/*.test.js
```
(Ratified 2026-09-20: `node --test tests/` fails on Node 26; the glob form works on 22 and 26.)

`package.json` with `"scripts": {"test": "node --test tests/*.test.js"}`, no dependencies. Tests `require("../shelflife.js")` and `require("../seed.js")` (seed.js needs the same export shim).

## 6. Module map

| Unit | Owns | Depends on |
|------|------|-----------|
| U0 test harness | `package.json`, `tests/`, export shims in `seed.js` | — |
| U1 shelf-life core | `shelflife.js`, `tests/shelflife.test.js` | U0 |
| U2 grocery list UI | `app.js` (generateGroceryList, renderListTab), `style.css` (badge), `index.html` script tag, `sw.js` | U1 |
| U3 meal editor override | `app.js` (addIngredientRow, form submit), `index.html` | U1 |

U2 and U3 both touch `app.js` → run sequentially with one implementer, not in parallel.

---

# ROADMAP (features 2–4; not yet decomposed)

## F2. Recipe import → Recipe bank

**Goal:** Paste a recipe URL, get a clean recipe (title, ingredients, steps, yield, source link — no blog filler) saved into the bank, schedulable in the weekly grid, and its ingredients flow into the grocery list like any other meal.

**Design direction (pending confirmation):**
- Extend the existing Meal model rather than adding a parallel "recipe bank":
  ```js
  Meal { ..., instructions?: string[], sourceUrl?: string, yield?: string, importedAt?: string }
  ```
  A recipe *is* a meal that happens to have instructions. One bank, one grid, one grocery generator.
- Extraction: parse schema.org `Recipe` JSON-LD (`<script type="application/ld+json">`), which nearly every recipe site publishes. That is the "just the recipe" source of truth — ingredients and `recipeInstructions` come structured, no filler. Fallback: microdata / `itemprop` scan; final fallback: manual paste form.
- Imported ingredient strings ("2 cups diced onion") are stored as `quantity` + `name` with a **section guessed** from a keyword table (`onion` → produce). User confirms/edits in the existing meal modal before saving.
- Ingredient names from imports also feed shelf-life lookup (F1) — the normalized-name table must tolerate "diced onion" → "onion" (prefix/keyword match), which is a contract change to `normalizeIngredientName`. **F1 should be built with this in mind.**

**~~Architectural fork — fetching the URL~~ SUPERSEDED by Q5: no fetching. Input is a dropped file. Kept for the record:** The browser cannot fetch arbitrary recipe pages (CORS). Options:
| Option | Pros | Cons |
|---|---|---|
| A. Tiny local server (replace `python3 -m http.server` with a ~100-line Python script that also serves `/api/fetch?url=`) | No third party; same launcher script; **same server later hosts the F4 sync database** | Must be running (already true today) |
| B. Public CORS proxy | Zero code | Third-party dependency, privacy, rate limits, breaks offline |
| C. Paste page source / share-sheet | No network | Clunky on iPhone |
~~Recommended: A~~ Rejected 2026-09-20 — user wants file drag-and-drop, no server.

**Open questions:** see §Q4–Q6 below.

## F3. "Cook this week" view

**Goal:** From the current week (or a grocery list), show every dish's instructions in one scrollable/printable view so you can cook without hunting.

**Design direction:** Nearly free once F2 lands — meals carry `instructions[]`. New tab or a button on the Grocery List tab: "Show recipes for this week" → renders each bank meal in the grid with its ingredients + steps; meals without instructions show "no recipe saved — Edit meal to add steps". Custom one-off meals are listed by name only.

**Open question Q7:** does "generate recipes" mean *display saved instructions* (above), or *AI-write instructions* for dishes that have none? The latter needs an API key and a network call — different feature.

## F4. Cross-device sync (ON HOLD)

Not being built now. Recorded here only because it constrains F2: if the local server (Option A) is chosen, F4 becomes "add a SQLite/JSON store + `/api/state` GET/PUT to the same server, and the PWA polls it". Choosing Option B or C for F2 would mean building a server later anyway.

## Sequencing

1. **U0 test harness** (needed by everything)
2. **F1 shelf life** — smallest, exercises the harness, but design `normalizeIngredientName` for F2's messy imported names
3. **F2 recipe import** — highest risk (server + extraction); do before F3
4. **F3 cook-this-week view** — thin UI over F2's data
5. F4 — on hold

## Additional open questions

| # | Question | Default |
|---|---|---|
| Q4 | Imported recipes live in the existing Meal Bank (one bank) rather than a separate Recipe tab? | One bank; the Meal Bank row shows a 📖 marker + source link when a meal has instructions. |
| Q5 | ~~server~~ ANSWERED: no server; drag-and-drop a saved file. | — |
| Q8 | **Which file types must the drop zone accept?** Saved web page `.html` (Chrome/Safari "Save Page As"), Safari `.webarchive`, single-file `.mhtml`, PDF (iPhone "Save to Files" often produces PDF), plain text / Markdown? Each is a different parser; PDF needs a third-party library. | `.html`/`.htm` + `.txt`/`.md` first (JSON-LD parse via DOMParser; text via heuristic "Ingredients"/"Instructions" header split). `.webarchive`, `.mhtml`, PDF as follow-ups. |
| Q6 | Which category does an import default to? | Default dinner, editable in the modal before save. (ratified) |
| Q7 | F3 = show saved instructions (no AI)? | Yes, no AI. (ratified) |

---

# F2 CONTRACTS (U4 parser FROZEN 2026-09-20; U5 UI FROZEN 2026-09-20)

## F2 Acceptance criteria

1. `parseRecipeHtml(htmlString)` returns `{ ok: true, recipe }` for a page containing a schema.org `Recipe` in JSON-LD, including when nested in `@graph`, when `@type` is an array (`["Recipe","NewsArticle"]`), and when instructions are `HowToSection` → `HowToStep` lists.
2. `recipe` shape: `{ name: string, ingredients: string[], instructions: string[], yield: string, sourceUrl: string, sourceTitle: string }` — strings are plain text (HTML entities decoded, tags stripped, whitespace collapsed), no empty entries.
3. `sourceUrl` comes from `<link rel="canonical">`, else JSON-LD `mainEntityOfPage`/`url`, else `<meta property="og:url">`, else `""`.
4. Pages with no JSON-LD but with microdata (`itemtype="…/Recipe"`, `itemprop="recipeIngredient"`, `itemprop="recipeInstructions"`) still parse (`source: "microdata"`).
5. Pages with neither return `{ ok: false, reason: "no-recipe" }`; malformed JSON-LD blocks are skipped, not fatal.
6. `ingredientLineToItem(line)` → `{ name, quantity, section }`. **Addendum 2026-09-20 (U5 must implement):** before normalizing, drop everything from the first comma onward (`"4 cloves garlic, minced"` → `"garlic"`) and strip trailing punctuation; test it. `"2 cups diced onion"` → `{ name: "onion", quantity: "2 cups", section: "produce" }`. Section is guessed via `guessSection(name)` keyword table; unknown → `"pantry_grains"`. `name` uses `normalizeIngredientName` from F1 but preserves title case? **No — stores normalized lowercase, then capitalizes first letter for display consistency with seed data.**
7. Meal Bank tab has an "Import recipe (.html)" button and a drop zone; dropping or picking a `.html`/`.htm` file opens the existing meal modal pre-filled with name, category `dinner`, ingredient rows (name/section/qty pre-filled, user can edit), and a new "Instructions" textarea (one step per line). Save creates a Meal with `instructions[]`, `sourceUrl`, `yield`, `importedAt`.
8. Non-`.html` files are rejected with an inline message; nothing else changes.
9. Meal Bank rows for meals with `instructions.length > 0` show a 📖 marker; if `sourceUrl` is set the marker links to it (`target="_blank" rel="noopener"`).
10. Editing any meal (imported or not) shows the Instructions textarea; existing meals without instructions show it empty. Saving preserves `sourceUrl`/`yield`/`importedAt` on edit.
11. `npm test` covers AC1–6 with fixture HTML files in `tests/fixtures/` (one JSON-LD `@graph` fixture, one array-type fixture, one microdata-only fixture, one no-recipe fixture). Fixtures are hand-written, not copied from real sites.
12. Existing meal banks in localStorage load unchanged (all new Meal fields optional).

## F2 Interface contracts

```js
// Meal (existing) — additions, all optional
{ ..., instructions?: string[], sourceUrl?: string, yield?: string, importedAt?: string }

// recipe-import.js (new; global script + CommonJS shim; depends on shelflife.js for normalizeIngredientName)
function parseRecipeHtml(html: string, opts?: { DOMParser?: any }): { ok: true, recipe: Recipe, source: "jsonld"|"microdata" } | { ok: false, reason: "no-recipe"|"empty" }
function ingredientLineToItem(line: string): { name: string, quantity: string, section: SectionKey }
function guessSection(normalizedName: string): SectionKey
const SECTION_KEYWORDS: Record<SectionKey, string[]>
```

Node has no `DOMParser`; tests pass a minimal parser via `opts.DOMParser` **or** the implementation must parse JSON-LD with a regex over `<script type="application/ld+json">` blocks first (works in Node without DOM) and only use `DOMParser` for the microdata fallback when available. **Decision: regex-first for JSON-LD; microdata fallback is skipped when `DOMParser` is unavailable (test asserts `ok:false` in that case only for the microdata fixture under Node, and a browser-manual check covers it).**

## F2 U5 details (frozen)

- Script order in `index.html`: `seed.js` → `shelflife.js` → `recipe-import.js` → `app.js`.
- `sw.js`: add `./recipe-import.js` to `APP_SHELL`; `CACHE_NAME = "grocery-planner-v3"`.
- File reading: `file.text()` (fallback `FileReader.readAsText`). Accept when `file.name` ends with `.html`/`.htm` (case-insensitive) — do not rely on `file.type`.
- Prefill: `openMealModal(null)` then set name = `recipe.name`, category `dinner`, cuisine `""`, one ingredient row per `ingredientLineToItem(line)` (name/section/quantity; shelf-life field blank), textarea = `recipe.instructions.join("\n")`. Pending import meta (`sourceUrl`, `yield`, `importedAt = new Date().toISOString()`) held in a module-level `pendingImportMeta` variable, cleared on modal close/cancel.
- Form submit: `instructions = textarea.split("\n").map(trim).filter(Boolean)`; key omitted when empty (same rule as `shelfLifeDays`). On edit, existing `sourceUrl`/`yield`/`importedAt` are spread/kept.
- `parseRecipeHtml` failure (`ok:false`) or wrong extension → message in a `#import-status` element (`role="status"`), auto-clears on next successful import; no modal opens.
- Drop zone: `#import-drop-zone` inside bank toolbar area; `dragover` adds `.drag-over` class; `drop` handles `dataTransfer.files[0]`. Hidden `<input type="file" id="import-file-input" accept=".html,.htm">` triggered by `#import-recipe-btn`.
- 📖 marker: `<a class="meal-source" href=… target="_blank" rel="noopener" title="Has instructions — open source">📖</a>` when `sourceUrl`, else `<span class="meal-source" title="Has instructions">📖</span>`. The marker is built with `createElement`/`setAttribute` (never innerHTML interpolation — `escapeHtml` does not escape `"` and is unsafe in attributes); the link form is only used when `sourceUrl` starts with `http://` or `https://`. Document-level `dragover`/`drop` `preventDefault` must not apply when the target is an `input`/`textarea`.

## F2 Module map

| Unit | Owns | Depends on |
|---|---|---|
| U4 recipe parser | `recipe-import.js`, `tests/recipe-import.test.js`, `tests/fixtures/*.html` | U1 (shelflife.js) |
| U5 import UI + instructions editing | `app.js` (bank tab, modal, form submit), `index.html` (textarea, drop zone, script tag), `style.css`, `sw.js` (APP_SHELL + CACHE_NAME) | U4, U2/U3 merged |

# F3 CONTRACTS (U6 FROZEN 2026-09-20)

## F3 Goal
From the Grocery List, open a "Cook this week" view that shows, for every meal planned in the current week, the saved recipe (ingredients + numbered instructions) — read directly from `mealBank`/`weekPlan`, no AI, no network. Printable.

## F3 Acceptance criteria
1. `renderListTab` toolbar (the one with `#clear-checks-btn` / `#regenerate-btn`) gains `<button class="btn-secondary" id="show-recipes-btn">Show recipes for this week</button>`. The empty-state branch of `renderListTab` (no grocery list yet) ALSO gets the same button appended after the empty-state div, so a planned week can be cooked without generating a list. Clicking sets `activeTab = "cook"` and calls `render()`. Nav tab highlighting is left untouched (Grocery List stays highlighted).
2. `render()` routes `activeTab === "cook"` to `renderCookTab(app)`.
3. `renderCookTab` renders, in order: a `.toolbar` with `<button class="btn-secondary" id="cook-back-btn">← Back to grocery list</button>` (click → `activeTab = "list"; render()`), an `<h2>` "Cook this week" (+ ` · ${weekPlan.weekOf}` when non-empty), then a `<div id="cook-list">` containing one `<article class="cook-meal">` per entry of `collectWeekMeals(weekPlan, mealBank)`, in that order.
4. Each `.cook-meal` for `kind === "bank"`: `<h3>` meal name; `<p class="cook-slots">` slots joined with ", " (e.g. "Mon dinner, Wed lunch"); if `meal.yield` is a non-empty string, `<p class="cook-yield">` "Yield: …"; `<ul class="cook-ingredients">` one `<li>` per ingredient: `quantity + " " + name` trimmed (just name when quantity empty); then if `meal.instructions` is a non-empty array, `<ol class="cook-steps">` one `<li>` per step, else `<p class="cook-empty">No recipe saved — edit this meal in the Meal Bank to add steps.</p>`. If `meal.sourceUrl` starts with `http://`/`https://`, an `<a class="cook-source" target="_blank" rel="noopener">` "Source" built with `createElement`/`setAttribute` (never innerHTML).
5. Each `.cook-meal` for `kind === "custom"`: `<h3>` name + " (custom)"; `<p class="cook-slots">`; `<p class="cook-empty">Custom one-off meal — no recipe saved.</p>`.
6. Deleted bank meals (id not found in `mealBank`) are skipped by `collectWeekMeals`.
7. If `collectWeekMeals` returns `[]`, `#cook-list` contains only `<div class="empty-state">Nothing planned this week yet. Fill in the Weekly Menu first.</div>`.
8. All text goes through `textContent` (or `escapeHtml` for text nodes only); no attribute interpolation.
9. `@media print` in `style.css`: hide `header`, `.tabs`, `.toolbar`, `#import-drop-zone`, `#import-status`; `.cook-meal { break-inside: avoid; page-break-inside: avoid; }`; body background white, no shadows.
10. `sw.js`: add `./week-utils.js` to `APP_SHELL`; `CACHE_NAME = "grocery-planner-v4"`.
11. `index.html`: `<script src="week-utils.js"></script>` inserted immediately before `<script src="app.js"></script>`.
12. `npm test` passes; `tests/week-utils.test.js` covers: empty week → `[]`; single bank meal one slot; same meal in 3 slots → one entry with 3 slots in grid order; custom meal in a main slot and a custom snack; deleted id skipped; snacks ordered after the day's dinner; two different custom meals with the same name are separate entries (no dedupe of customs).

## F3 Interface contracts (frozen)

### `week-utils.js` (new; global script + CommonJS shim `if (typeof module !== "undefined") module.exports = { collectWeekMeals, SLOT_ORDER };`)
```js
const SLOT_ORDER = ["breakfast", "lunch", "dinner"]; // snacks follow dinner within a day

/**
 * @param {{ weekOf: string, days: Record<string, { breakfast, lunch, dinner, snacks: Array }> }} weekPlan
 * @param {Array<{ id: string, name: string, ... }>} mealBank
 * @param {Array<{ key: string, label: string }>} [days=DAYS]  // injectable for tests; defaults to global DAYS
 * @returns {Array<{ kind: "bank", meal: object, slots: string[] } | { kind: "custom", name: string, slots: string[] }>}
 *
 * Iterates days in `days` order; within a day: breakfast, lunch, dinner, then each snack in array order.
 * Slot label = `${dayLabel.slice(0,3)} ${slotName}` where slotName ∈ breakfast|lunch|dinner|snack  → "Mon dinner".
 * Cell shape: null | { type: "bank", id } | { type: "custom", name }.
 * bank cells: look up id in mealBank; missing → skip. Same id seen again → push slot onto the existing entry (keep first position).
 * custom cells: always a new entry (no dedupe).
 * Never mutates inputs. Missing `days[key]` or missing `snacks` treated as empty.
 */
function collectWeekMeals(weekPlan, mealBank, days) { ... }
```
- `days` default: `typeof DAYS !== "undefined" ? DAYS : []`. Tests must pass `days` explicitly (or `require("../seed.js").DAYS`).

### `app.js` additions
- `render()`: `else if (activeTab === "cook") renderCookTab(app);`
- `function renderCookTab(app)` per AC3–AC7, using `collectWeekMeals(weekPlan, mealBank)` (global).
- `#show-recipes-btn` listener in `renderListTab` (both branches).

## F3 Module map
| Unit | Owns | Depends on |
|---|---|---|
| U6 | `week-utils.js` (new), `tests/week-utils.test.js` (new), `app.js` (`renderCookTab`, `render` routing, `#show-recipes-btn`), `style.css` (`.cook-*`, `@media print`), `index.html` (script tag), `sw.js` (shell + v4) | U5 (`meal.instructions`, `meal.yield`, `meal.sourceUrl`) |

## F3 Non-goals
- No AI summarisation / rewriting of instructions. No scaling of quantities by servings. No per-day filtering UI. No new nav tab. No changes to `groceryList` shape.
