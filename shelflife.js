// Shelf-life lookup core. Plain global script + Node/CommonJS compatible.
// See SPEC.md §4.2 for the frozen contract this file implements.

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SECTION_DEFAULT_SHELF_LIFE = {
  produce: { min: 5, max: 7, storage: "fridge" },
  meat_seafood: { min: 2, max: 3, storage: "fridge" },
  dairy_eggs: { min: 7, max: 14, storage: "fridge" },
  pantry_grains: { min: 180, max: 365, storage: "pantry" },
  canned_frozen: { min: 180, max: 365, storage: "pantry" },
  condiments: { min: 90, max: 180, storage: "fridge" },
};

const SHELF_LIFE_TABLE = {
  // ---- produce ----
  "apples": { min: 21, max: 35, storage: "fridge" },
  "avocado": { min: 3, max: 5, storage: "counter" },
  "baby carrots": { min: 14, max: 21, storage: "fridge" },
  "baby spinach": { min: 5, max: 7, storage: "fridge" },
  "banana": { min: 4, max: 7, storage: "counter" },
  "basil": { min: 5, max: 7, storage: "fridge" },
  "bell peppers": { min: 7, max: 10, storage: "fridge" },
  "broccoli": { min: 5, max: 7, storage: "fridge" },
  "brussels sprouts": { min: 7, max: 10, storage: "fridge" },
  "cabbage or coleslaw mix": { min: 7, max: 14, storage: "fridge" },
  "cucumber": { min: 5, max: 7, storage: "fridge" },
  "garlic": { min: 90, max: 180, storage: "pantry" },
  "grapes": { min: 5, max: 7, storage: "fridge" },
  "green beans": { min: 5, max: 7, storage: "fridge" },
  "lemon": { min: 14, max: 21, storage: "fridge" },
  "mango": { min: 3, max: 5, storage: "counter" },
  "mixed berries": { min: 3, max: 5, storage: "fridge" },
  "mixed greens/lettuce": { min: 5, max: 7, storage: "fridge" },
  "onion": { min: 30, max: 60, storage: "pantry" },
  "orange": { min: 14, max: 21, storage: "fridge" },
  "pear": { min: 3, max: 5, storage: "counter" },
  "pineapple": { min: 3, max: 5, storage: "counter" },
  "potatoes": { min: 30, max: 60, storage: "pantry" },
  "sweet potatoes": { min: 21, max: 35, storage: "pantry" },
  "tomatoes": { min: 5, max: 7, storage: "counter" },

  // ---- meat & seafood ----
  "chicken thighs": { min: 1, max: 2, storage: "fridge" },
  "deli turkey": { min: 3, max: 5, storage: "fridge" },
  "ground beef or steak strips": { min: 1, max: 2, storage: "fridge" },
  "ground turkey": { min: 1, max: 2, storage: "fridge" },
  "pork chops": { min: 2, max: 3, storage: "fridge" },
  "salmon fillets": { min: 1, max: 2, storage: "fridge" },
  "shrimp": { min: 1, max: 2, storage: "fridge" },
  "smoked salmon": { min: 5, max: 7, storage: "fridge" },
  "whole chicken": { min: 1, max: 2, storage: "fridge" },

  // ---- dairy & eggs ----
  "butter": { min: 30, max: 90, storage: "fridge" },
  "cottage cheese": { min: 7, max: 10, storage: "fridge" },
  "cream cheese": { min: 14, max: 21, storage: "fridge" },
  "cotija cheese": { min: 14, max: 21, storage: "fridge" },
  "eggs": { min: 21, max: 35, storage: "fridge" },
  "feta cheese": { min: 14, max: 21, storage: "fridge" },
  "greek yogurt": { min: 7, max: 14, storage: "fridge" },
  "heavy cream": { min: 7, max: 10, storage: "fridge" },
  "milk": { min: 7, max: 10, storage: "fridge" },
  "mozzarella": { min: 7, max: 14, storage: "fridge" },
  "parmesan": { min: 60, max: 90, storage: "fridge" },
  "shredded cheese": { min: 14, max: 21, storage: "fridge" },
  "string cheese": { min: 14, max: 21, storage: "fridge" },

  // ---- pantry & grains ----
  "almond butter": { min: 180, max: 365, storage: "pantry" },
  "almonds": { min: 180, max: 365, storage: "pantry" },
  "bagels": { min: 5, max: 7, storage: "pantry" },
  "balsamic vinegar": { min: 365, max: 730, storage: "pantry" },
  "burger buns": { min: 5, max: 7, storage: "pantry" },
  "chia seeds": { min: 365, max: 730, storage: "pantry" },
  "cinnamon": { min: 365, max: 730, storage: "pantry" },
  "cornbread mix": { min: 180, max: 365, storage: "pantry" },
  "curry powder": { min: 365, max: 730, storage: "pantry" },
  "dark chocolate": { min: 180, max: 365, storage: "pantry" },
  "granola": { min: 90, max: 180, storage: "pantry" },
  "honey": { min: 365, max: 1000, storage: "pantry" },
  "hummus": { min: 5, max: 7, storage: "fridge" },
  "jumbo pasta shells": { min: 365, max: 730, storage: "pantry" },
  "oats": { min: 180, max: 365, storage: "pantry" },
  "olive oil": { min: 180, max: 365, storage: "pantry" },
  "pancake or waffle mix": { min: 180, max: 365, storage: "pantry" },
  "pasta": { min: 365, max: 730, storage: "pantry" },
  "peanut butter": { min: 180, max: 365, storage: "pantry" },
  "pita bread": { min: 5, max: 7, storage: "pantry" },
  "pizza dough or crust": { min: 3, max: 5, storage: "fridge" },
  "popcorn": { min: 365, max: 730, storage: "pantry" },
  "protein powder": { min: 180, max: 365, storage: "pantry" },
  "quinoa": { min: 365, max: 730, storage: "pantry" },
  "rice": { min: 365, max: 730, storage: "pantry" },
  "rice cakes": { min: 90, max: 180, storage: "pantry" },
  "tortillas": { min: 7, max: 14, storage: "fridge" },
  "tortillas or taco shells": { min: 7, max: 14, storage: "fridge" },
  "trail mix": { min: 90, max: 180, storage: "pantry" },
  "whole-grain bread": { min: 5, max: 7, storage: "pantry" },
  "whole-grain crackers": { min: 90, max: 180, storage: "pantry" },

  // ---- canned & frozen ----
  "canned soup": { min: 365, max: 730, storage: "pantry" },
  "canned tuna": { min: 365, max: 730, storage: "pantry" },
  "chickpeas": { min: 365, max: 730, storage: "pantry" },
  "coconut milk": { min: 365, max: 730, storage: "pantry" },
  "diced tomatoes": { min: 365, max: 730, storage: "pantry" },
  "edamame": { min: 180, max: 365, storage: "freezer" },
  "enchilada sauce": { min: 365, max: 730, storage: "pantry" },
  "frozen mixed berries": { min: 180, max: 365, storage: "freezer" },
  "kidney or black beans": { min: 180, max: 365, storage: "pantry" },

  // ---- condiments ----
  "lime crema or sour cream + lime": { min: 7, max: 14, storage: "fridge" },
  "mayo": { min: 60, max: 90, storage: "fridge" },
  "olives": { min: 30, max: 60, storage: "fridge" },
  "salsa": { min: 14, max: 21, storage: "fridge" },
  "tzatziki": { min: 7, max: 10, storage: "fridge" },

  // ---- extra common ingredients likely in imported recipes ----
  "chicken breast": { min: 1, max: 2, storage: "fridge" },
  "chicken": { min: 1, max: 2, storage: "fridge" },
  "ground beef": { min: 1, max: 2, storage: "fridge" },
  "bacon": { min: 7, max: 14, storage: "fridge" },
  "carrots": { min: 21, max: 28, storage: "fridge" },
  "celery": { min: 14, max: 21, storage: "fridge" },
  "lettuce": { min: 5, max: 7, storage: "fridge" },
  "mushrooms": { min: 5, max: 7, storage: "fridge" },
  "zucchini": { min: 5, max: 7, storage: "fridge" },
  "lemons": { min: 14, max: 21, storage: "fridge" },
  "limes": { min: 14, max: 21, storage: "fridge" },
  "strawberries": { min: 3, max: 5, storage: "fridge" },
  "blueberries": { min: 7, max: 14, storage: "fridge" },
  "cilantro": { min: 5, max: 7, storage: "fridge" },
  "parsley": { min: 7, max: 10, storage: "fridge" },
  "green onions": { min: 5, max: 7, storage: "fridge" },
  "scallions": { min: 5, max: 7, storage: "fridge" },
  "sour cream": { min: 14, max: 21, storage: "fridge" },
  "cheddar": { min: 21, max: 28, storage: "fridge" },
  "yogurt": { min: 7, max: 14, storage: "fridge" },
  "tofu": { min: 7, max: 10, storage: "fridge" },
  "tomato": { min: 5, max: 7, storage: "counter" },
  "spinach": { min: 5, max: 7, storage: "fridge" },
  "kale": { min: 5, max: 7, storage: "fridge" },
  "bread": { min: 5, max: 7, storage: "pantry" },
};

const UNIT_TOKENS =
  "cups?|tbsp|tsp|oz|lbs?|g|kg|ml|l|clove|cloves|can|cans|package|pkg|bunch|pinch|dash|slices?|pieces?";
const QTY_TOKEN = new RegExp(
  "^(?:\\d+(?:\\/\\d+)?(?:-\\d+(?:\\/\\d+)?)?|[\\u00bc\\u00bd\\u00be\\u2153\\u2154\\u215b\\u215c\\u215d\\u215e]+|(?:" +
    UNIT_TOKENS +
    "))\\s+",
  "i"
);

// Prep/size words to drop anywhere in the name. "frozen" and "shredded" are
// kept out of the *default* strip list and handled specially below: they are
// only stripped if keeping them would NOT resolve to a table key (table keys
// containing those words, e.g. "frozen mixed berries", are matched first).
const PREP_WORDS_ALWAYS = [
  "diced",
  "chopped",
  "minced",
  "sliced",
  "fresh",
  "large",
  "small",
  "medium",
  "ripe",
  "boneless",
  "skinless",
  "grated",
  "peeled",
  "cubed",
  "thinly",
  "finely",
  "roughly",
  "to taste",
  "optional",
];
const PREP_WORDS_CONDITIONAL = ["frozen", "shredded"];

function stripQtyPrefix(s) {
  let prev;
  do {
    prev = s;
    s = s.replace(QTY_TOKEN, "").trim();
  } while (s !== prev && s.length);
  return s;
}

function stripWords(s, words) {
  if (!words.length) return s;
  const re = new RegExp("\\b(" + words.join("|") + ")\\b", "gi");
  return s.replace(re, " ").replace(/\s+/g, " ").trim();
}

function normalizeIngredientName(name) {
  if (typeof name !== "string") return "";
  const base = name.toLowerCase().replace(/\s+/g, " ").trim();
  if (!base) return base;

  // drop parentheticals
  let s = base.replace(/\([^)]*\)/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  s = stripQtyPrefix(s);

  // Try keeping "frozen"/"shredded" if that form is itself a known table key
  // (e.g. "frozen mixed berries"); otherwise strip them like other prep words.
  const keepingConditional = stripWords(s, PREP_WORDS_ALWAYS);
  let result;
  if (Object.prototype.hasOwnProperty.call(SHELF_LIFE_TABLE, keepingConditional)) {
    result = keepingConditional;
  } else {
    result = stripWords(keepingConditional, PREP_WORDS_CONDITIONAL);
  }

  if (!result || !/[a-z]/i.test(result)) {
    return base;
  }
  return result;
}

function singularize(s) {
  if (/[a-z]ies$/i.test(s)) return s.replace(/ies$/i, "y");
  if (/[a-z]oes$/i.test(s)) return s.replace(/oes$/i, "o");
  if (/[a-z]es$/i.test(s)) return s.replace(/es$/i, "");
  if (/[a-z]s$/i.test(s)) return s.replace(/s$/i, "");
  return s;
}

function shelfLifeFor(name, section, overrideDays) {
  if (
    typeof overrideDays === "number" &&
    Number.isFinite(overrideDays) &&
    overrideDays > 0
  ) {
    return { min: overrideDays, max: overrideDays, storage: "fridge", source: "override" };
  }

  const sectionDefault =
    SECTION_DEFAULT_SHELF_LIFE[section] || SECTION_DEFAULT_SHELF_LIFE.produce;

  if (typeof name !== "string" || !name.trim()) {
    return { min: sectionDefault.min, max: sectionDefault.max, storage: sectionDefault.storage, source: "section" };
  }

  // Step 2: PRE-strip exact match (lowercase/trim/collapse-whitespace only,
  // no prep-word stripping). Runs BEFORE the normalized exact match so that
  // multi-word table keys like "diced tomatoes" or "frozen mixed berries"
  // are not shadowed by a shorter key ("tomatoes", "mixed berries") that
  // normalization would otherwise expose by stripping the prep word.
  const preStrip = name.toLowerCase().replace(/\s+/g, " ").trim();
  if (Object.prototype.hasOwnProperty.call(SHELF_LIFE_TABLE, preStrip)) {
    const entry = SHELF_LIFE_TABLE[preStrip];
    return { min: entry.min, max: entry.max, storage: entry.storage, source: "table" };
  }

  // Step 3: normalized exact match.
  const normalized = normalizeIngredientName(name);
  if (Object.prototype.hasOwnProperty.call(SHELF_LIFE_TABLE, normalized)) {
    const entry = SHELF_LIFE_TABLE[normalized];
    return { min: entry.min, max: entry.max, storage: entry.storage, source: "table" };
  }

  // Step 3b: singularized(normalized) exact match.
  const singularized = singularize(normalized);
  if (
    singularized !== normalized &&
    Object.prototype.hasOwnProperty.call(SHELF_LIFE_TABLE, singularized)
  ) {
    const entry = SHELF_LIFE_TABLE[singularized];
    return { min: entry.min, max: entry.max, storage: entry.storage, source: "table" };
  }

  // Step 4: ONLY for produce | meat_seafood | dairy_eggs — longest table key
  // that appears as a whole-word substring of the normalized or singularized
  // form. pantry_grains / canned_frozen / condiments skip this step so that
  // e.g. "chicken stock" does not inherit chicken's perishable shelf life.
  if (
    section === "produce" ||
    section === "meat_seafood" ||
    section === "dairy_eggs"
  ) {
    let bestKey = null;
    for (const key of Object.keys(SHELF_LIFE_TABLE)) {
      const re = new RegExp("\\b" + escapeRegExp(key) + "\\b", "i");
      if (
        (re.test(normalized) || re.test(singularized)) &&
        (!bestKey || key.length > bestKey.length)
      ) {
        bestKey = key;
      }
    }
    if (bestKey) {
      const entry = SHELF_LIFE_TABLE[bestKey];
      return { min: entry.min, max: entry.max, storage: entry.storage, source: "table" };
    }
  }

  return { min: sectionDefault.min, max: sectionDefault.max, storage: sectionDefault.storage, source: "section" };
}

function formatShelfLife(result) {
  if (!result || typeof result.max !== "number") return "";
  if (result.max >= 30) return "";
  if (result.min === result.max) {
    return "good ~" + result.max + " days";
  }
  return "good ~" + result.min + "–" + result.max + " days";
}

if (typeof module !== "undefined") {
  module.exports = {
    normalizeIngredientName,
    shelfLifeFor,
    formatShelfLife,
    SHELF_LIFE_TABLE,
    SECTION_DEFAULT_SHELF_LIFE,
  };
}
