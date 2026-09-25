# DECISIONS — append-only

## 2026-09-20 — Shelf life as a name-keyed lookup table, not a per-ingredient required field
**Decision:** Ship a built-in `SHELF_LIFE_TABLE` keyed by normalized ingredient name, plus section-level fallback, plus an optional per-ingredient override.
**Alternatives:** (a) Require every ingredient to carry `shelfLifeDays` — forces the user to fill ~95 seed entries and every custom one. (b) Table only, no override — can't correct the table's guess for a specific product.
**Reason:** Zero-effort coverage of seed data; override handles the long tail; existing saved meal banks load without migration because the field is optional.

## 2026-09-20 — Separate `shelflife.js` file with a CommonJS export shim
**Decision:** New logic lives in `shelflife.js`, loaded as a global script (matching the app's no-build style) with `if (typeof module !== "undefined") module.exports = ...` at the bottom so `node --test` can import it.
**Alternatives:** (a) Put it in `app.js` — untestable without a DOM. (b) Convert the app to ES modules — touches every file, breaks `file://` double-click usage mentioned in README.
**Reason:** Keeps the app buildless and double-clickable while giving the project its first automated verification command.

## 2026-09-20 — Suppress badge for items with max ≥ 30 days
**Decision:** Shelf-life badge only renders when `max < 30`.
**Alternatives:** Show on everything.
**Reason:** Pantry/canned items would clutter the list with "good ~180 days"; the feature's value is in perishables.

## 2026-09-20 — Recipes extend Meal; no parallel Recipe bank (proposed, pending Q4)
**Decision:** Add optional `instructions[]`, `sourceUrl`, `yield` to Meal instead of introducing a second entity.
**Alternatives:** Separate `gp_recipeBank` with its own tab and a "convert to meal" step.
**Reason:** The grid, grocery generator, dedup, history snapshots and shelf-life lookup all key off Meal. A second entity would duplicate every one of those paths. F3 ("cook this week") then falls out of the grid for free.

## 2026-09-20 — Recipe fetching via a small local Python server (proposed, pending Q5)
**Decision:** Replace `python3 -m http.server` with a ~100-line stdlib-only Python server that serves static files and a `/api/fetch?url=` endpoint returning the page's schema.org Recipe JSON.
**Alternatives:** Public CORS proxy (third-party, privacy, no offline); paste-HTML-only (poor on iPhone).
**Reason:** The app already requires this server to be running; adding one endpoint costs nothing operationally and the same process is the natural home for the on-hold F4 sync store. Stdlib-only keeps the "no install" promise in the README.

## 2026-09-20 — F1 before F2, but F1's name normalization must anticipate F2
**Decision:** Build shelf life first (small, validates the test harness) but specify `normalizeIngredientName` to strip quantities/prep words ("2 cups diced onion" → "onion") so imported recipe ingredients resolve without a second rewrite.
**Reason:** Sequence-by-risk says F2 first, but F2 blocks on user answers to Q4–Q5 and F1 is self-contained; the only coupling is name normalization, which is cheap to get right up front.

## 2026-09-20 — SUPERSEDES "Recipe fetching via a small local Python server"
**Decision:** No server. Recipe import takes a file the user saved from the web and drops onto the app; parsing is 100% client-side (DOMParser for HTML → schema.org JSON-LD; heuristics for text).
**Reason:** User direction. Keeps the app a pure static PWA; also removes the CORS problem entirely since the bytes are already local. Cost: the user must save the page first; supported file types TBD (Q8).

## 2026-09-20 — F1 contracts frozen
Q1–Q3 answered (static / range / list badge + editor override). `normalizeIngredientName` and `shelfLifeFor` lookup order fixed in SPEC §4.2. Implementation delegated.

## 2026-09-20 — Recipe import accepts .html only
**Decision:** Drop zone / file picker accepts `.html`/`.htm`. Parse with `DOMParser`, extract schema.org `Recipe` from JSON-LD (handle `@graph`, arrays, `HowToStep`/`HowToSection`), fall back to microdata `itemprop`, else show "couldn't find a recipe" with a manual-paste path.
**Alternatives:** PDF / .webarchive / .mhtml / text.
**Reason:** User saves pages as .html. HTML carries structured recipe data, which is what makes "no filler" reliable. Other formats deferred until asked for.

## 2026-09-20 — Trunk-based development
**Decision:** Single trunk `main`, short-lived `feat/|fix/|chore/|spike/` branches, squash-merge via PR with CI (`npm test`) as the gate, releases as tags on `main`, feature flags (`FEATURES` const in app.js) for dark-shipping incomplete work. Documented in BRANCHING.md; CI in .github/workflows/ci.yml.
**Alternatives:** GitFlow (develop/release/hotfix branches); GitHub Flow without flags.
**Reason:** Solo static PWA with no build and a fast suite — nothing to stabilize on a release branch; GitFlow's ceremony would be pure overhead. Flags let SPEC units merge as soon as each verifies instead of piling up on a branch.

## 2026-09-20 — U0/U1 accepted; two assumptions ratified, one corrected
- Ratified: `npm test` = `node --test tests/*.test.js` (directory form broken on Node 26).
- Ratified: `normalizeIngredientName` keeps "frozen"/"shredded" when doing so hits an exact table key (so frozen berries ≠ fresh berries).
- Corrected: plural handling. Implementer chose none, so "onions" fell to the section default. Spec now adds lookup step 3b (singularize: ies→y, oes→o, es→"", s→""). Reason: imported recipe lines are overwhelmingly plural ("2 onions", "3 tomatoes"); a wrong badge is worse than no badge.
- Override `storage` is always "fridge" — accepted as-is; storage isn't rendered anywhere yet.
- Table numbers are the implementer's conservative estimates, unreviewed. Flag for user spot-check before release.

## 2026-09-20 — U2/U3 accepted (F1 code-complete pending review)
- Verified: 16/16 tests; headless-Chrome DOM check against real app.js (badges, `.short` at max≤3, no badge ≥30, override min-wins on merge, editor input round-trip).
- Ratified: `.item-shelf.short` threshold is `max <= 3`; `.item-shelf` is NOT hidden on mobile (it is the feature).
- Ratified: override candidates pooled only from ingredient-level `shelfLifeDays`; absent → normal lookup.
- Backlog (out of scope): mobile `.ingredient-row` remove button sits alone on its final row — cosmetic.

## 2026-09-20 — Lookup order revised after code review (contract change to §4.2)
**Decision:** (a) Pre-strip exact match now precedes normalized match. (b) Whole-word substring matching (step 4) is gated to perishable sections (produce, meat_seafood, dairy_eggs).
**Why:** Review found "Diced tomatoes" (canned) resolving to fresh tomatoes because "diced" was stripped before the exact-key check; and generic keys (chicken, milk, bread, tomato) over-matching compound pantry names ("chicken stock", "bread crumbs"). Section-gating uses information we already have (the user tagged the section) to reject implausible matches; pantry items falling to the ≥30-day section default correctly show no badge.
**Also:** test suite must pin lookup order (reviewer's mutation run showed five order-breaking mutants passing green).
**Deferred nits:** singularize mangles -ss/-us words (harmless, lookup-only); step 3b subsumed by step 4 for perishable sections (kept for pantry sections where 4 is skipped — now non-redundant); AC7 min-wins has no unit test because generateGroceryList isn't extracted (accepted; DOM-verified).

## 2026-09-20 — F1 accepted after review fixes
23/23 tests; review findings 1–3 resolved (lookup reorder, section gate, order-pinning tests with a passing mutation check). DOM seam check re-run green. Awaiting user approval to commit on `feat/shelf-life`.

## 2026-09-20 — U4 recipe parser accepted
42/42 tests. Ratified: quantity for "1 (15 oz) can black beans" is the full `"1 (15 oz) can"` (more useful on a list than "1"). Ratified: microdata path tested via a hand-rolled DOMParser shim in the test file. Gap found in my own spot-check: trailing ", minced"-style notes leak into names → spec addendum on AC6, assigned to U5. Committed on `feat/recipe-parser` stacked on `feat/shelf-life`; PR targets `feat/shelf-life` so GitHub retargets to `main` once #2 merges.

## 2026-09-20 — U5 import UI contract frozen
- **Decision:** Import reuses the existing meal modal (prefill) rather than a dedicated import screen; import metadata is held in a module-level `pendingImportMeta` until save. Instructions are edited as a plain textarea, one step per line.
- **Alternatives:** separate "Imported recipe" preview modal; storing instructions as a single string.
- **Reason:** one editing path means AC10 (edit instructions on any meal) falls out for free; `string[]` matches the parser output and is what F3's cook view renders per-step.
- **Also:** `sourceUrl` only rendered as a link when it is `http(s)://` — prevents `javascript:` from an untrusted file landing in an `href`.

## 2026-09-20 — U5 accepted (after one review fix)
- Review found an attribute-injection XSS: `escapeHtml` (textContent→innerHTML) does not escape `"`, and a saved page's canonical URL can carry one. Fixed by building the 📖 marker with `createElement`/`setAttribute`; SPEC corrected (it had wrongly prescribed `escapeHtml` in an `href`). Rule going forward: **`escapeHtml` is for text nodes only; never for attributes.**
- Also fixed: document-level drop `preventDefault` skipped for `input`/`textarea` targets (was blocking text drag into fields); import status re-queried after `await` (tab switch mid-read left a detached node).
- Ratified assumptions: import controls rendered by `renderBankTab` (not static HTML); `.visually-hidden` utility for the file input; status text styled as error since both messages are rejections.
- Deferred (out-of-scope observations): `guessSection` mis-sections "chicken broth" → meat_seafood and "salt and pepper" → produce (keyword table needs pantry entries for broth/stock/salt/black pepper); decimal-comma quantities ("1,5 kg") lose the name under the first-comma rule; imported meals store `sourceUrl:""`/`yield:""` rather than omitting; iPhone Safari has no native "save as .html" (iPad/desktop is the realistic path).

## 2026-09-20 — U6 cook-this-week contract frozen
- **Decision:** Cook view is derived live from `weekPlan` + `mealBank`, not from the `groceryList` snapshot. Alternatives: store recipes into `groceryList` at generation time (rejected: duplicates data, goes stale when a meal is edited). Consequence: button is also offered in the empty-list state.
- **Decision:** `activeTab = "cook"` is a sub-view of Grocery List (no nav button, nav highlight untouched, explicit back button). Alternative: a fifth nav tab (rejected: user framed it as "an option on the grocery list").
- **Decision:** `collectWeekMeals` lives in `week-utils.js` with an injectable `days` param so it is unit-testable under `node --test` without the DOM or global `DAYS`. Bank meals dedupe by id; custom meals never dedupe (two "leftovers" entries are legitimately separate).
- **Decision:** Slot labels use `label.slice(0,3)` ("Mon dinner") rather than the key, to be readable if DAYS labels change.

## 2026-09-20 — U6 accepted (PR #6)
- Verified: 55/55 tests; headless-Chrome seam harness through the real UI (both button branches, ordering/dedupe, hostile sourceUrl inert, back button, empty week). code-critic: no blockers; its two test gaps (keep-first-position with intervening entry; snacks stay inside their day) closed with one added test.
- Ratified assumption: `meal.yield` shown only when `trim() !== ""`.
- Deferred observation: `@media print` removes shadows only from `.cook-meal`; other tabs still print with card shadows. style.css section TOC comment now has an unnumbered "9b" section.
- Not exercised: real print preview and iOS PWA — needs a manual pass.
