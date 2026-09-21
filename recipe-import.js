// Recipe import parser. Plain global script + Node/CommonJS compatible.
// See SPEC.md "# F2 CONTRACTS" for the frozen contract this file implements.

// F1's normalizeIngredientName: in Node, pull it in via require; in the
// browser it is already a global (shelflife.js loads before this file).
var normalizeIngredientName =
  typeof require !== "undefined"
    ? require("./shelflife.js").normalizeIngredientName
    : normalizeIngredientName;

function regexEscape(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Plain-text helpers
// ---------------------------------------------------------------------------

function decodeHtmlEntities(str) {
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, function (_, d) {
      return String.fromCodePoint(parseInt(d, 10));
    })
    .replace(/&#x([0-9a-f]+);/gi, function (_, h) {
      return String.fromCodePoint(parseInt(h, 16));
    });
}

function stripHtmlTags(str) {
  return str.replace(/<[^>]*>/g, " ");
}

function toPlainText(value) {
  if (typeof value !== "string") return "";
  var s = stripHtmlTags(value);
  s = decodeHtmlEntities(s);
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function toArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" || typeof val === "number") return [val];
  return [];
}

// ---------------------------------------------------------------------------
// JSON-LD extraction (regex-based; works in Node with no DOM)
// ---------------------------------------------------------------------------

var JSONLD_SCRIPT_RE =
  /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function hasRecipeType(typeVal) {
  if (!typeVal) return false;
  if (Array.isArray(typeVal)) {
    return typeVal.some(function (v) {
      return typeof v === "string" && v.toLowerCase() === "recipe";
    });
  }
  return typeof typeVal === "string" && typeVal.toLowerCase() === "recipe";
}

function findRecipeNode(node, seen) {
  if (!node || typeof node !== "object") return null;
  if (seen.has(node)) return null;
  seen.add(node);

  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) {
      var found = findRecipeNode(node[i], seen);
      if (found) return found;
    }
    return null;
  }

  if (hasRecipeType(node["@type"])) return node;

  if (node["@graph"]) {
    var fromGraph = findRecipeNode(node["@graph"], seen);
    if (fromGraph) return fromGraph;
  }

  if (node.mainEntity) {
    var fromMain = findRecipeNode(node.mainEntity, seen);
    if (fromMain) return fromMain;
  }

  var keys = Object.keys(node);
  for (var j = 0; j < keys.length; j++) {
    var key = keys[j];
    if (key === "@graph" || key === "mainEntity") continue;
    var val = node[key];
    if (val && typeof val === "object") {
      var fromNested = findRecipeNode(val, seen);
      if (fromNested) return fromNested;
    }
  }

  return null;
}

function findJsonLdRecipe(html) {
  var re = new RegExp(JSONLD_SCRIPT_RE.source, "gi");
  var match;
  while ((match = re.exec(html))) {
    var data;
    try {
      data = JSON.parse(match[1]);
    } catch (e) {
      continue; // malformed block: skip, never fatal
    }
    var found = findRecipeNode(data, new Set());
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Instructions flattening
// ---------------------------------------------------------------------------

function stripLeadingStepNumber(line) {
  return line.replace(/^\s*\d+[.)]\s*/, "");
}

function splitInstructionString(raw) {
  var text = raw.replace(/\r\n/g, "\n");
  var lines = text
    .split("\n")
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);

  if (lines.length <= 1) {
    var parts = text
      .split(/(?=\d+\.\s)/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (parts.length > 1) lines = parts;
  }

  return lines
    .map(function (l) {
      return toPlainText(stripLeadingStepNumber(l));
    })
    .filter(Boolean);
}

function flattenInstructionItem(item) {
  if (item == null) return [];
  if (typeof item === "string") {
    var text = toPlainText(item);
    return text ? [text] : [];
  }
  if (typeof item === "object") {
    if (Array.isArray(item.itemListElement)) {
      // HowToSection (or anything with a step list): flatten the steps,
      // do NOT include the section's own name/heading.
      var out = [];
      item.itemListElement.forEach(function (sub) {
        out = out.concat(flattenInstructionItem(sub));
      });
      return out;
    }
    if (typeof item.text === "string") {
      var t = toPlainText(item.text);
      return t ? [t] : [];
    }
    if (typeof item.name === "string") {
      var n = toPlainText(item.name);
      return n ? [n] : [];
    }
  }
  return [];
}

function flattenInstructions(raw) {
  if (raw == null) return [];
  if (typeof raw === "string") return splitInstructionString(raw);
  if (Array.isArray(raw)) {
    var out = [];
    raw.forEach(function (item) {
      out = out.concat(flattenInstructionItem(item));
    });
    return out;
  }
  return flattenInstructionItem(raw);
}

// ---------------------------------------------------------------------------
// Field extraction helpers
// ---------------------------------------------------------------------------

function getIngredients(recipe) {
  var raw = recipe.recipeIngredient;
  if (raw === undefined) raw = recipe.ingredients;
  return toArray(raw)
    .map(function (v) {
      return toPlainText(String(v));
    })
    .filter(Boolean);
}

function getYield(recipe) {
  var y = recipe.recipeYield;
  if (Array.isArray(y)) y = y[0];
  if (y === undefined || y === null || y === "") return "";
  return toPlainText(String(y));
}

function getMainEntityOfPageUrl(recipe) {
  var m = recipe.mainEntityOfPage;
  if (!m) return "";
  if (typeof m === "string") return m;
  if (typeof m === "object") return m["@id"] || m.url || "";
  return "";
}

function getRecipeUrlField(recipe) {
  return typeof recipe.url === "string" ? recipe.url : "";
}

function extractLinkCanonical(html) {
  var re = /<link\b[^>]*>/gi;
  var m;
  while ((m = re.exec(html))) {
    var tag = m[0];
    if (/rel\s*=\s*["']canonical["']/i.test(tag)) {
      var href = tag.match(/href\s*=\s*["']([^"']*)["']/i);
      if (href) return decodeHtmlEntities(href[1]);
    }
  }
  return "";
}

function extractMetaOgUrl(html) {
  var re = /<meta\b[^>]*>/gi;
  var m;
  while ((m = re.exec(html))) {
    var tag = m[0];
    if (/property\s*=\s*["']og:url["']/i.test(tag)) {
      var content = tag.match(/content\s*=\s*["']([^"']*)["']/i);
      if (content) return decodeHtmlEntities(content[1]);
    }
  }
  return "";
}

function extractDocTitle(html) {
  var m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? toPlainText(m[1]) : "";
}

function buildRecipeFromJsonLd(recipe, html) {
  var name = typeof recipe.name === "string" ? toPlainText(recipe.name) : "";
  var ingredients = getIngredients(recipe);
  var instructions = flattenInstructions(recipe.recipeInstructions);
  var yieldStr = getYield(recipe);

  var canonical = extractLinkCanonical(html);
  var mainEntityUrl = getMainEntityOfPageUrl(recipe);
  var recipeUrlField = getRecipeUrlField(recipe);
  var ogUrl = extractMetaOgUrl(html);
  var sourceUrl = canonical || mainEntityUrl || recipeUrlField || ogUrl || "";
  var sourceTitle = extractDocTitle(html);

  return {
    name: name,
    ingredients: ingredients,
    instructions: instructions,
    yield: yieldStr,
    sourceUrl: sourceUrl,
    sourceTitle: sourceTitle,
  };
}

// ---------------------------------------------------------------------------
// Microdata fallback (requires DOMParser)
// ---------------------------------------------------------------------------

function parseMicrodata(html, DOMParserCtor) {
  var parser = new DOMParserCtor();
  var doc = parser.parseFromString(html, "text/html");

  var candidates = doc.querySelectorAll("*");
  var recipeEl = null;
  for (var i = 0; i < candidates.length; i++) {
    var el = candidates[i];
    var itemtype = el.getAttribute && el.getAttribute("itemtype");
    if (itemtype && /schema\.org\/recipe/i.test(itemtype)) {
      recipeEl = el;
      break;
    }
  }
  if (!recipeEl) return null;

  function queryFirst(propNames) {
    for (var p = 0; p < propNames.length; p++) {
      var els = recipeEl.querySelectorAll('[itemprop="' + propNames[p] + '"]');
      if (els && els.length) return els;
    }
    return [];
  }

  var nameEls = queryFirst(["name"]);
  var name = nameEls.length ? toPlainText(nameEls[0].textContent) : "";

  var ingredientEls = queryFirst(["recipeIngredient", "ingredients"]);
  var ingredients = Array.prototype.map
    .call(ingredientEls, function (el) {
      return toPlainText(el.textContent);
    })
    .filter(Boolean);

  var instructionEls = queryFirst(["recipeInstructions"]);
  var instructions = [];
  Array.prototype.forEach.call(instructionEls, function (el) {
    var lis = el.querySelectorAll ? el.querySelectorAll("li") : [];
    if (lis && lis.length) {
      Array.prototype.forEach.call(lis, function (li) {
        instructions.push(toPlainText(li.textContent));
      });
    } else {
      instructions.push(toPlainText(el.textContent));
    }
  });
  instructions = instructions.filter(Boolean);

  var yieldEls = queryFirst(["recipeYield"]);
  var yieldStr = yieldEls.length ? toPlainText(yieldEls[0].textContent) : "";

  var canonical = extractLinkCanonical(html);
  var ogUrl = extractMetaOgUrl(html);
  var sourceUrl = canonical || ogUrl || "";
  var sourceTitle = extractDocTitle(html);

  return {
    name: name,
    ingredients: ingredients,
    instructions: instructions,
    yield: yieldStr,
    sourceUrl: sourceUrl,
    sourceTitle: sourceTitle,
  };
}

// ---------------------------------------------------------------------------
// Public: parseRecipeHtml
// ---------------------------------------------------------------------------

function parseRecipeHtml(html, opts) {
  opts = opts || {};

  if (typeof html !== "string" || !html) {
    return { ok: false, reason: "empty" };
  }

  var jsonLdRecipe = findJsonLdRecipe(html);
  if (jsonLdRecipe) {
    var recipe = buildRecipeFromJsonLd(jsonLdRecipe, html);
    if (recipe.name && recipe.ingredients.length > 0) {
      return { ok: true, recipe: recipe, source: "jsonld" };
    }
  }

  var DOMParserCtor =
    opts.DOMParser || (typeof DOMParser !== "undefined" ? DOMParser : undefined);
  if (DOMParserCtor) {
    var micro = parseMicrodata(html, DOMParserCtor);
    if (micro && micro.name && micro.ingredients.length > 0) {
      return { ok: true, recipe: micro, source: "microdata" };
    }
  }

  return { ok: false, reason: "no-recipe" };
}

// ---------------------------------------------------------------------------
// Public: ingredientLineToItem / guessSection
// ---------------------------------------------------------------------------

var UNIT_WORD_LIST =
  "cups?|tbsp|tsp|oz|lbs?|g|kg|ml|l|clove|cloves|can|cans|package|pkg|bunch|pinch|dash|slices?|pieces?";
var UNIT_WORD_RE = new RegExp("^(?:" + UNIT_WORD_LIST + ")\\b", "i");
var QTY_NUM_RE = new RegExp(
  "^(?:\\d+(?:\\.\\d+)?(?:\\/\\d+)?(?:\\s*(?:-|to)\\s*\\d+(?:\\.\\d+)?(?:\\/\\d+)?)?" +
    "|[\\u00bc\\u00bd\\u00be\\u2153\\u2154\\u215b\\u215c\\u215d\\u215e]+)"
);

// Reconstructs, from the ORIGINAL line (preserving casing/spacing), the
// leading quantity/unit run that normalizeIngredientName would strip: a
// number/fraction/range, an optional parenthetical ("(15 oz)"), and a unit
// word, repeated for as long as such tokens keep appearing at the front.
function extractQuantity(line) {
  var s = line;
  var parts = [];
  for (;;) {
    var leadingWs = s.match(/^\s+/);
    if (leadingWs) s = s.slice(leadingWs[0].length);

    var paren = s.match(/^\(([^)]*)\)/);
    if (paren) {
      parts.push(paren[0]);
      s = s.slice(paren[0].length);
      continue;
    }

    var qty = s.match(QTY_NUM_RE);
    if (qty) {
      parts.push(qty[0]);
      s = s.slice(qty[0].length);
      continue;
    }

    var unit = s.match(UNIT_WORD_RE);
    if (unit) {
      parts.push(unit[0]);
      s = s.slice(unit[0].length);
      continue;
    }

    break;
  }
  return parts.join(" ").trim();
}

var SECTION_KEYWORDS = {
  produce: [
    "onion",
    "onions",
    "garlic",
    "tomato",
    "tomatoes",
    "potato",
    "potatoes",
    "carrot",
    "carrots",
    "celery",
    "lettuce",
    "spinach",
    "kale",
    "broccoli",
    "cauliflower",
    "cabbage",
    "cucumber",
    "zucchini",
    "squash",
    "pepper",
    "peppers",
    "bell pepper",
    "jalapeno",
    "jalapeño",
    "avocado",
    "lemon",
    "lemons",
    "lime",
    "limes",
    "apple",
    "apples",
    "banana",
    "bananas",
    "orange",
    "oranges",
    "grape",
    "grapes",
    "berry",
    "berries",
    "strawberry",
    "strawberries",
    "blueberry",
    "blueberries",
    "raspberry",
    "raspberries",
    "mango",
    "pineapple",
    "pear",
    "peach",
    "cilantro",
    "parsley",
    "basil",
    "mint",
    "thyme",
    "rosemary",
    "dill",
    "scallion",
    "scallions",
    "green onion",
    "shallot",
    "ginger",
    "mushroom",
    "mushrooms",
    "corn",
    "peas",
    "green beans",
    "asparagus",
    "beet",
    "beets",
    "radish",
    "herbs",
    "bunch cilantro",
  ],
  meat_seafood: [
    "chicken",
    "beef",
    "pork",
    "turkey",
    "bacon",
    "sausage",
    "ham",
    "steak",
    "ground beef",
    "ground turkey",
    "ground pork",
    "ground chicken",
    "shrimp",
    "salmon",
    "fish",
    "tuna",
    "cod",
    "tilapia",
    "crab",
    "lobster",
    "scallop",
    "scallops",
    "meat",
    "chop",
    "chops",
    "thigh",
    "thighs",
    "breast",
    "breasts",
    "wing",
    "wings",
    "drumstick",
    "drumsticks",
    "ribs",
    "veal",
    "lamb",
    "chorizo",
    "pepperoni",
    "hot dog",
    "brisket",
    "pancetta",
    "prosciutto",
  ],
  dairy_eggs: [
    "milk",
    "butter",
    "cheese",
    "cheddar",
    "mozzarella",
    "parmesan",
    "feta",
    "cream cheese",
    "cottage cheese",
    "yogurt",
    "cream",
    "egg",
    "eggs",
    "sour cream",
    "half and half",
    "heavy cream",
    "buttermilk",
    "ricotta",
    "provolone",
    "gouda",
    "brie",
    "swiss cheese",
    "goat cheese",
    "whipped cream",
    "ice cream",
    "custard",
  ],
  canned_frozen: [
    "canned",
    "can of",
    "frozen",
    "broth",
    "stock",
    "coconut milk",
    "beans",
    "chickpeas",
    "diced tomatoes",
    "canned tomatoes",
    "tomato paste",
    "tomato sauce",
    "frozen peas",
    "frozen corn",
    "frozen vegetables",
    "frozen fruit",
    "canned beans",
    "canned corn",
    "canned soup",
    "black beans",
    "kidney beans",
    "edamame",
    "sauce",
    "paste",
  ],
  condiments: [
    "salsa",
    "mayo",
    "mayonnaise",
    "mustard",
    "ketchup",
    "soy sauce",
    "hot sauce",
    "vinegar",
    "dressing",
    "olives",
    "pickles",
    "relish",
    "bbq sauce",
    "worcestershire",
    "sriracha",
    "teriyaki",
    "honey mustard",
    "ranch",
    "vinaigrette",
    "hoisin",
  ],
  pantry_grains: [
    "flour",
    "sugar",
    "rice",
    "pasta",
    "oil",
    "spice",
    "spices",
    "salt",
    "pepper flakes",
    "bread",
    "cereal",
    "oats",
    "quinoa",
    "noodle",
    "noodles",
    "cracker",
    "crackers",
    "bread crumbs",
    "breadcrumbs",
    "baking powder",
    "baking soda",
    "yeast",
    "cornstarch",
    "vanilla",
    "cinnamon",
    "paprika",
    "cumin",
    "chili powder",
    "garlic powder",
    "onion powder",
    "olive oil",
    "vegetable oil",
    "canola oil",
    "honey",
    "syrup",
    "peanut butter",
    "almond butter",
    "nuts",
    "almonds",
    "walnuts",
    "cashews",
    "tortilla",
    "tortillas",
    "bun",
    "buns",
    "bagel",
    "bagels",
    "dried",
  ],
};

function guessSection(normalizedName) {
  var name = (typeof normalizedName === "string" ? normalizedName : "").toLowerCase();
  var bestSection = null;
  var bestLen = -1;

  Object.keys(SECTION_KEYWORDS).forEach(function (section) {
    SECTION_KEYWORDS[section].forEach(function (keyword) {
      var re = new RegExp("\\b" + regexEscape(keyword) + "\\b", "i");
      if (re.test(name) && keyword.length > bestLen) {
        bestSection = section;
        bestLen = keyword.length;
      }
    });
  });

  return bestSection || "pantry_grains";
}

function ingredientLineToItem(line) {
  var raw = typeof line === "string" ? line : "";
  var quantity = extractQuantity(raw);

  var normalized = normalizeIngredientName(raw);
  if (!normalized) normalized = raw.trim().toLowerCase();

  var name = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  var section = guessSection(normalized);

  return { name: name, quantity: quantity, section: section };
}

if (typeof module !== "undefined") {
  module.exports = {
    parseRecipeHtml: parseRecipeHtml,
    ingredientLineToItem: ingredientLineToItem,
    guessSection: guessSection,
    SECTION_KEYWORDS: SECTION_KEYWORDS,
  };
}
