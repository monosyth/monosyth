import type { Aisle, Ingredient } from "./types";

const FRACTIONS: Record<string, string> = {
  "½": " 1/2",
  "⅓": " 1/3",
  "⅔": " 2/3",
  "¼": " 1/4",
  "¾": " 3/4",
  "⅕": " 1/5",
  "⅖": " 2/5",
  "⅗": " 3/5",
  "⅘": " 4/5",
  "⅙": " 1/6",
  "⅚": " 5/6",
  "⅛": " 1/8",
  "⅜": " 3/8",
  "⅝": " 5/8",
  "⅞": " 7/8",
};

/** Canonical unit -> spellings found in recipes. */
const UNIT_SPELLINGS: Record<string, string[]> = {
  tsp: ["teaspoons", "teaspoon", "tsps", "tsp", "t"],
  tbsp: ["tablespoons", "tablespoon", "tbsps", "tbsp", "tbs", "tbl", "T"],
  cup: ["cups", "cup", "c"],
  "fl oz": ["fluid ounces", "fluid ounce", "fl. oz.", "fl. oz", "fl oz"],
  oz: ["ounces", "ounce", "oz.", "oz"],
  lb: ["pounds", "pound", "lbs.", "lbs", "lb.", "lb"],
  g: ["grams", "gram", "g"],
  kg: ["kilograms", "kilogram", "kg"],
  ml: ["milliliters", "millilitres", "milliliter", "millilitre", "ml"],
  l: ["liters", "litres", "liter", "litre", "l"],
  pint: ["pints", "pint", "pt"],
  quart: ["quarts", "quart", "qt"],
  gallon: ["gallons", "gallon", "gal"],
  pinch: ["pinches", "pinch"],
  dash: ["dashes", "dash"],
  clove: ["cloves", "clove"],
  can: ["cans", "can", "tins", "tin"],
  jar: ["jars", "jar"],
  package: ["packages", "package", "pkgs", "pkg", "packets", "packet", "boxes", "box", "bags", "bag"],
  bunch: ["bunches", "bunch"],
  sprig: ["sprigs", "sprig"],
  stalk: ["stalks", "stalk", "ribs", "rib"],
  head: ["heads", "head"],
  slice: ["slices", "slice"],
  stick: ["sticks", "stick"],
  handful: ["handfuls", "handful"],
  piece: ["pieces", "piece"],
  bottle: ["bottles", "bottle"],
  container: ["containers", "container", "tubs", "tub"],
  bulb: ["bulbs", "bulb"],
};

const UNIT_LOOKUP = new Map<string, string>();
for (const [unit, spellings] of Object.entries(UNIT_SPELLINGS)) {
  for (const spelling of spellings) {
    UNIT_LOOKUP.set(spelling, unit);
  }
}
// Longest spellings first so "fl oz" wins over "fl" and "tablespoons" over "t".
const UNIT_PATTERN = [...UNIT_LOOKUP.keys()]
  .sort((a, b) => b.length - a.length)
  .map(s => s.replace(/[.]/g, "\\."))
  .join("|");
const UNIT_RE = new RegExp(`^(${UNIT_PATTERN})(?=[\\s.,)/]|$)`, "");

/** Words that describe preparation or size rather than what to buy. */
const PREP_WORDS = new Set([
  "fresh", "freshly", "chopped", "finely", "roughly", "coarsely", "thinly", "thickly",
  "minced", "diced", "sliced", "grated", "shredded", "crushed", "peeled", "seeded",
  "trimmed", "halved", "quartered", "cubed", "julienned", "packed", "lightly", "loosely",
  "softened", "melted", "room", "temperature", "cold", "warm", "hot", "large", "small",
  "medium", "medium-sized", "big", "extra", "heaping", "level", "about", "approximately",
  "plus", "more", "to", "taste", "for", "serving", "garnish", "divided", "optional",
  "organic", "good", "quality", "good-quality", "high-quality", "store-bought", "homemade",
  "boneless", "skinless", "bone-in", "skin-on", "rinsed", "drained", "patted", "dry",
  "torn", "stemmed", "deveined", "cut", "into", "and", "or", "of", "a", "an", "the",
  "whole", "plain", "unsalted", "salted", "raw", "uncooked", "cooked", "leftover",
  "pitted", "toasted", "zested", "juiced", "squeezed", "beaten", "sifted", "ripe",
  "thawed", "canned", "jarred", "virgin", "light", "each", "your", "choice", "topping", "toppings",
]);

/** First halves of hyphenated words that are just modifiers: "freshly-grated", "low-sodium", "full-fat". */
const HYPHEN_MODIFIERS = new Set([
  "freshly", "roughly", "finely", "thinly", "coarsely", "lightly", "low", "full", "reduced", "high",
  "good", "store", "no", "fat", "extra", "whole", "room", "medium", "thick", "thin",
]);

const CONTAINERS = "cans?|jars?|packages?|pkgs?|bags?|box(?:es)?|containers?|bottles?|tins?|cartons?|tubs?";
const SIZE_UNITS = "ounces?|oz\\.?|fl\\.? oz\\.?|pounds?|lbs?\\.?|grams?|g|kg|ml|inch(?:es)?|\"|”";

/** Merge common synonyms so they combine on the list. */
const SYNONYMS: Array<[RegExp, string]> = [
  [/^(kosher |sea |table |fine |flaky |coarse |cooking |iodized )*salt$/, "salt"],
  [/^salt (& )?(black )?pepper$/, "salt and pepper"],
  [/^(mozzarella|cheddar|parmesan|feta|ricotta|gruyere|provolone|cotija|asiago|monterey jack|pepper jack|pecorino( romano)?|swiss) cheese$/, "$1"],
  [/^(ground )?(black )?pepper(corns)?$/, "black pepper"],
  [/^garlic( cloves?)?$|^cloves? (of )?garlic$/, "garlic"],
  [/^(scallions?|green onions?|spring onions?)$/, "green onion"],
  [/^cilantro( leaves)?$|^coriander leaves$/, "cilantro"],
  [/^(flat[- ]leaf |italian )?parsley( leaves)?$/, "parsley"],
  [/^basil( leaves)?$/, "basil"],
  [/^rosemary( sprigs?| leaves)?$/, "rosemary"],
  [/^thyme( sprigs?| leaves)?$/, "thyme"],
  [/^(extra[- ]virgin )?olive oil$/, "olive oil"],
  [/^(vegetable|canola|neutral|avocado) oil$/, "cooking oil"],
  [/^(all[- ]purpose |ap )?flour$/, "flour"],
  [/^(granulated |white |cane )?sugar$/, "sugar"],
  [/^(light |dark )?brown sugar$/, "brown sugar"],
  [/^(heavy |heavy whipping |whipping )cream$/, "heavy cream"],
  [/^(yellow |white |sweet )?onions?$/, "onion"],
  [/^lemons?( juice)?$/, "lemon"],
  [/^limes?( juice)?$/, "lime"],
  [/^eggs?$/, "egg"],
  [/^butter$/, "butter"],
  [/^parmesan( cheese)?$|^parmigiano[- ]reggiano( cheese)?$/, "parmesan"],
  [/^(chicken|vegetable|beef) (stock|broth)$/, "$1 broth"],
];

const IRREGULAR_SINGULARS: Record<string, string> = {
  leaves: "leaf",
  potatoes: "potato",
  tomatoes: "tomato",
  berries: "berry",
  cherries: "cherry",
  anchovies: "anchovy",
  chilies: "chili",
  chillies: "chili",
  radishes: "radish",
  peaches: "peach",
  loaves: "loaf",
  knives: "knife",
};

const NO_SINGULAR = new Set([
  "asparagus", "hummus", "couscous", "molasses", "swiss", "brussels", "grits", "oats",
  "peas", "greens", "noodles", "chips", "breadcrumbs", "sprinkles", "capers", "chickpeas",
  "lentils", "beans", "olives", "raisins", "walnuts", "pecans", "almonds", "cashews",
  "flakes", "seeds", "pickles", "oregano", "chives",
]);

function singularize(word: string) {
  if (IRREGULAR_SINGULARS[word]) return IRREGULAR_SINGULARS[word];
  if (NO_SINGULAR.has(word) || word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

/** Parses "1 1/2", "1/2", "1.5", "2-3" (uses the larger amount so you buy enough). */
function readQuantity(text: string): { qty: number | null; rest: string } {
  const range = /^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)(?![\d/])/;
  const single = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?![\d/])/;
  const rangeMatch = text.match(range);
  if (rangeMatch) {
    return { qty: toNumber(rangeMatch[2]), rest: text.slice(rangeMatch[0].length).trim() };
  }
  const singleMatch = text.match(single);
  if (singleMatch) {
    return { qty: toNumber(singleMatch[1]), rest: text.slice(singleMatch[0].length).trim() };
  }
  const word = text.match(/^(a|an|one|two|three|four|five|six|half a|half an|half)\b/i);
  if (word) {
    const values: Record<string, number> = {
      a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
      "half a": 0.5, "half an": 0.5, half: 0.5,
    };
    return { qty: values[word[1].toLowerCase()], rest: text.slice(word[0].length).trim() };
  }
  return { qty: null, rest: text };
}

function toNumber(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .reduce((sum, part) => {
      if (part.includes("/")) {
        const [n, d] = part.split("/").map(Number);
        return sum + (d ? n / d : 0);
      }
      return sum + Number(part);
    }, 0);
}

export function cleanLine(raw: string) {
  let text = raw.replace(/[   ]/g, " ");
  for (const [glyph, ascii] of Object.entries(FRACTIONS)) {
    text = text.split(glyph).join(ascii);
  }
  text = text.replace(/(\d)⁄(\d)/g, "$1/$2");
  // Budget blogs add prices like "($0.32)" or "(diced, $0.32)".
  text = text
    .replace(/\s*\(\$[\d.,]+\**\)/g, "")
    .replace(/,?\s*\$[\d.,]+\**(?=\))/g, "");
  return text
    .replace(/^[\s•*·▢☐□\-–—]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Some lines hold two things to buy: "1 tsp each cumin and chili powder", "salt and black pepper". */
export function parseIngredientLine(rawLine: string): Ingredient[] {
  const raw = cleanLine(rawLine);
  const each = raw.match(/^(.*?)\beach\s+(?:of\s+)?(.+?)\s+(?:and|&)\s+(.+)$/i);
  if (each) {
    return [`${each[1]}${each[2]}`, `${each[1]}${each[3]}`].map(line => ({ ...parseIngredient(line), raw }));
  }
  const saltPepper = raw.match(/^(.*\bsalt)\s*(?:and|&|,)\s*(.*\bpepper\b.*)$/i);
  if (saltPepper && !/\b(bell|chili|chile|jalape|red|green|yellow|orange)\b/i.test(saltPepper[2].split(",")[0])) {
    const tail = saltPepper[2].includes(",") ? saltPepper[2].slice(saltPepper[2].indexOf(",")) : "";
    return [`${saltPepper[1]}${tail}`, saltPepper[2]].map(line => ({ ...parseIngredient(line), raw }));
  }
  return [parseIngredient(raw)];
}

export function parseIngredient(rawLine: string): Ingredient {
  const raw = cleanLine(rawLine);
  const notes: string[] = [];
  let text = raw
    .replace(/^(\d+)\s+and\s+(\d+\/\d+)/, "$1 $2")
    .replace(/(\d)-\s*to\s+(\d)/, "$1 to $2")
    .replace(/\[([^\]]*)\]/g, (_, inner: string) => {
      notes.push(inner);
      return " ";
    })
    .trim();
  const optional = /\boptional\b/i.test(text);

  // "Juice of 2 limes", "zest and juice of 1 lemon"
  const juice = text.match(/^(?:the\s+)?((?:zest\s+and\s+)?(?:juice|zest))\s+(?:of|from)\s+(.+)$/i);
  if (juice) {
    notes.push(juice[1].toLowerCase());
    text = juice[2];
  }

  const quantity = readQuantity(text);
  let qty = quantity.qty;
  text = quantity.rest.replace(/^x\s+/i, "");

  // Package sizes: "1 (14.5 oz) can", "1 15-oz. can", "Four 5-ounce fillets", "28-ounce can", "4 x 180g/6 oz".
  let sizeNote = "";
  const paren = text.match(/^\(([^)]*)\)\s*/);
  if (paren) {
    sizeNote = paren[1];
    text = text.slice(paren[0].length);
  }
  const sizeAfterQty = new RegExp(`^-\\s*(${SIZE_UNITS})(?=[\\s.]|$)\\.?\\s*`, "i").exec(text);
  if (sizeAfterQty && qty !== null) {
    sizeNote = `${quantity.rest.match(/^[\d./\s]+(?:to\s+[\d./]+)?/)?.[0].trim() ?? qty} ${sizeAfterQty[1]}`;
    qty = null;
    text = text.slice(sizeAfterQty[0].length);
  } else {
    const secondNumber = new RegExp(
      `^((?:\\d+(?:\\.\\d+)?(?:\\s+\\d+\\/\\d+)?|\\d+\\/\\d+)(?:\\s*(?:-|to)\\s*\\d+(?:\\.\\d+)?)?)\\s*-?\\s*(${SIZE_UNITS})(?=[\\s./]|$)\\.?(?:\\s*\\/\\s*\\d+(?:\\.\\d+)?\\s*(?:oz|g|lbs?)\\.?)?\\s*`,
      "i",
    ).exec(text);
    if (secondNumber) {
      sizeNote = `${secondNumber[1]} ${secondNumber[2]}`;
      text = text.slice(secondNumber[0].length);
    }
  }
  if (sizeNote) {
    const container = new RegExp(`^(${CONTAINERS})\\b\\.?\\s*`, "i").exec(text);
    if (container) qty ??= 1;
  }

  // "5 medium cloves garlic", "2 large handfuls spinach"
  const sized = text.match(/^(small|medium|large|heaping|level|big|generous|scant)\s+/i);
  if (sized && UNIT_RE.test(text.slice(sized[0].length).toLowerCase())) {
    text = text.slice(sized[0].length);
  }

  let unit: string | null = null;
  const unitMatch = text.match(UNIT_RE);
  if (unitMatch) {
    const spelling = unitMatch[1];
    // A lone "t" or "c" is only a unit right after a number.
    const ambiguous = spelling === "t" || spelling === "c" || spelling === "l" || spelling === "g";
    if (!ambiguous || qty !== null) {
      unit = UNIT_LOOKUP.get(spelling) ?? UNIT_LOOKUP.get(spelling.toLowerCase()) ?? null;
      text = text.slice(unitMatch[0].length).replace(/^\.\s*/, "").trim();
    }
  } else {
    const lowerMatch = text.toLowerCase().match(UNIT_RE);
    if (lowerMatch && lowerMatch[1].length > 1) {
      unit = UNIT_LOOKUP.get(lowerMatch[1]) ?? null;
      text = text.slice(lowerMatch[0].length).trim();
    }
  }

  // "500g/ 1 lb gnocchi": drop the second measurement.
  text = text.replace(/^\/\s*\d+(?:[./]\d+)?\s*(?:oz|ounces?|lbs?|pounds?|g|grams?|kg|cups?|ml|tbsp|tsp)\.?\s*/i, "");
  // "1 cup plus 2 tablespoons sugar": keep the main amount, note the extra.
  text = text.replace(/^(plus|minus)\s+[\d/.\s]+\s*(?:tablespoons?|teaspoons?|tbsp|tsp|cups?)\.?\s+/i, match => {
    notes.push(match.trim());
    return "";
  });
  // "28 oz can crushed tomatoes": the weight is the can size.
  const weightThenContainer = new RegExp(`^(${CONTAINERS})\\b\\.?\\s*`, "i").exec(text);
  if (weightThenContainer && unit && ["oz", "g", "lb", "fl oz", "ml"].includes(unit) && qty !== null) {
    sizeNote ||= `${qty} ${unit}`;
    qty = 1;
    unit = UNIT_LOOKUP.get(weightThenContainer[1].toLowerCase()) ?? null;
    text = text.slice(weightThenContainer[0].length);
  } else if (sizeNote && weightThenContainer && !unit) {
    unit = UNIT_LOOKUP.get(weightThenContainer[1].toLowerCase()) ?? null;
    text = text.slice(weightThenContainer[0].length);
  }
  text = text.replace(/^of\s+/i, "");
  if (sizeNote) notes.unshift(sizeNote);

  // Pull out parentheses first (they often contain commas), then split prep notes after a comma.
  // Budget blogs list prices like "($0.32)"; those aren't useful on a shopping list.
  text = text.replace(/\$\d[\d.,]*\**/g, " ");
  // Innermost parentheses first, so "(boneless, (4-5 thighs))" comes out cleanly.
  for (let guard = 0; guard < 5 && /\([^()]*\)/.test(text); guard += 1) {
    text = text.replace(/\(([^()]*)\)/g, (_, inner: string) => {
      notes.push(inner.trim());
      return " ";
    });
  }
  text = text.replace(/\(.*$/, match => {
    notes.push(match.slice(1).trim());
    return " ";
  });
  // Split at the first comma that isn't between describing words ("boneless, skinless chicken").
  const parts = text.split(",");
  let head = parts.shift() ?? "";
  while (parts.length && head.trim().split(/\s+/).every(word => PREP_WORDS.has(word.toLowerCase()))) {
    head = `${head} ${parts.shift()}`;
  }
  if (parts.length) notes.push(parts.join(",").trim());
  text = head.replace(/\s+/g, " ").trim();
  const note = notes
    .flatMap(n => n.split(/\s*,\s*/))
    .filter(n => n && /[a-z0-9]/i.test(n))
    .join(", ");

  let name =
    text
      .replace(/\s+(to taste|for serving|for garnish|divided|optional)$/i, "")
      // "carrots cut into 2-inch chunks": cutting directions aren't part of the item.
      .replace(/\s+(?:cut\b|(?:sliced|chopped|diced|halved|quartered)\s+(?:into|in|lengthwise|crosswise|thin|thick|on|\d)).*$/i, "")
      .trim() || raw;

  // "2 garlic cloves" / "3 celery stalks": the unit comes after the item.
  if (!unit && qty !== null) {
    const trailing = name.match(/^(.+?)\s+(cloves?|sprigs?|stalks?|ribs?|sticks?|slices?|heads?|bunch(?:es)?|handfuls?)$/i);
    if (trailing) {
      unit = UNIT_LOOKUP.get(trailing[2].toLowerCase()) ?? null;
      name = trailing[1];
      if (unit === "stick" && /celery/i.test(name)) unit = "stalk";
    }
  }

  let key = normalizeKey(chooseFirstOption(name));
  let aisle: Aisle = unit === "can" || unit === "jar" ? "pantry" : aisleFor(key);

  // Canned tomatoes are their own thing, separate from fresh ones.
  if (
    /\btomato\b/.test(key) &&
    !/\b(paste|sauce|ketchup|sun-?dried|cherry|grape|roma|heirloom|plum)\b/.test(key) &&
    (unit === "can" ||
      unit === "jar" ||
      /\b(crushed|whole peeled|peeled whole|stewed|fire[- ]roasted|canned|tinned|san marzano|passata)\b/i.test(raw) ||
      (/\bdiced\b/i.test(raw) && (unit === "oz" || unit === "g" || /\b(oz|ounce)/i.test(note))))
  ) {
    key = /green chil/i.test(raw) ? "diced tomatoes with green chiles" : "canned tomatoes";
    aisle = "pantry";
  }

  return {
    raw,
    qty: qty !== null && Number.isFinite(qty) && qty > 0 ? round(qty) : null,
    unit,
    name,
    note,
    key,
    aisle,
    optional,
  };
}

/** "chicken or vegetable broth" -> "chicken broth"; "sour cream or Greek yogurt" -> "sour cream". */
function chooseFirstOption(name: string) {
  const options = name.split(/\s+or\s+|\s*\/\s*/i).map(o => o.trim()).filter(Boolean);
  if (options.length < 2) return name;
  const [first, second] = options;
  const firstWords = first.split(/\s+/).filter(word => !PREP_WORDS.has(word.toLowerCase()));
  const secondWords = second.split(/\s+/);
  if (firstWords.length === 1 && secondWords.length >= 2) {
    return [...firstWords, ...secondWords.slice(1)].join(" ");
  }
  return first;
}

export function normalizeKey(name: string) {
  let base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s&-]/g, " ")
    .replace(/\b(to taste|for serving|for garnish|for the \w+|at room temperature)\b/g, " ")
    .split(/\s+/)
    .filter(word => word && !PREP_WORDS.has(word))
    .filter(word => !(word.includes("-") && (HYPHEN_MODIFIERS.has(word.split("-")[0]) || PREP_WORDS.has(word.split("-")[0]))))
    .join(" ")
    .trim();

  // "black pepper" survives; drop a leading "ground" only for spices, not meat.
  if (/^ground /.test(base) && !/\b(beef|pork|turkey|chicken|lamb|sausage|meat|bison|veal|ginger)\b/.test(base)) {
    base = base.replace(/^ground /, "");
  }

  const words = base.split(" ");
  if (words.length) {
    words[words.length - 1] = singularize(words[words.length - 1]);
  }
  base = words.join(" ");

  for (const [pattern, replacement] of SYNONYMS) {
    if (pattern.test(base)) {
      return base.replace(pattern, replacement);
    }
  }
  return base || name.toLowerCase().trim();
}

const SPICE_WORDS = /\b(salt|(black|white|cayenne|lemon) pepper|peppercorns?|paprika|cumin|cinnamon|nutmeg|oregano|chili powder|chile powder|cayenne|turmeric|curry|garam masala|bay lea(f|ves)|clove|allspice|cardamom|coriander|fennel seed|mustard seed|red pepper flake|seasoning|italian seasoning|garlic powder|onion powder|smoked paprika|vanilla|extract|za.?atar|sumac|five spice|herbes de provence|old bay|dried|ground|powder|flakes?|herb mix|dried herbs)(?:e?s)?\b/;

const AISLE_WORDS: Array<[Aisle, RegExp]> = [
  ["produce", /\b(onion|garlic|shallot|leek|scallion|green onion|ginger|potato|sweet potato|yam|carrot|celery|tomato|tomatillo|lettuce|spinach|kale|arugula|chard|cabbage|broccoli|cauliflower|zucchini|squash|pumpkin|cucumber|bell pepper|jalape.?o|serrano|poblano|habanero|chile|chili pepper|mushroom|eggplant|corn on|avocado|lemon|lime|orange|apple|pear|banana|berry|berries|strawberr|blueberr|raspberr|grape|peach|mango|pineapple|melon|cherry|rosemary|thyme|sage|basil|parsley|cilantro|dill|mint|chive|tarragon|oregano leaves|herb|asparagus|green bean|snap pea|radish|beet|fennel|bok choy|sprout|greens|microgreen|turnip|parsnip|rutabaga|okra|artichoke|red pepper|green pepper|yellow pepper|orange pepper)(?:e?s)?\b/],
  ["meat", /\b(chicken|beef|steak|pork|bacon|sausage|ham|turkey|lamb|veal|bison|chorizo|prosciutto|pancetta|salami|pepperoni|ribs?|brisket|roast|chuck|sirloin|tenderloin|loin|thigh|breast|drumstick|wing|ground meat|shrimp|prawn|salmon|tuna steak|cod|halibut|tilapia|fish|scallop|crab|lobster|clam|mussel|oyster|anchov)(?:e?s)?\b/],
  ["dairy", /\b(milk|cream|half and half|half-and-half|butter|buttermilk|yogurt|yoghurt|sour cream|cream cheese|cheese|cheddar|mozzarella|parmesan|ricotta|feta|goat cheese|gruyere|swiss|provolone|monterey jack|cotija|queso|mascarpone|egg|ghee|creme fraiche|crème fraîche)(?:e?s)?\b/],
  ["bakery", /\b(bread|baguette|bun|roll|tortilla|pita|naan|bagel|croissant|english muffin|brioche|ciabatta|sourdough|flatbread|pizza dough|pie crust)(?:e?s)?\b/],
  ["frozen", /\b(frozen|ice cream|puff pastry|phyllo|filo)(?:e?s)?\b/],
  ["pantry", /\b(flour|sugar|oil|vinegar|broth|stock|rice|pasta|spaghetti|penne|noodle|macaroni|lasagna|orzo|quinoa|couscous|oats|bean|chickpea|lentil|can|canned|tomato paste|tomato sauce|crushed tomatoes|diced tomatoes|salsa|soy sauce|tamari|fish sauce|worcestershire|hot sauce|sriracha|ketchup|mustard|mayo|mayonnaise|honey|maple syrup|molasses|syrup|jam|peanut butter|tahini|nut|almond|walnut|pecan|cashew|peanut|pine nut|seed|raisin|cranberr|chocolate|cocoa|baking soda|baking powder|yeast|cornstarch|cornmeal|breadcrumb|panko|cracker|chip|olive|caper|pickle|coconut milk|evaporated milk|condensed milk|gelatin|bouillon|stock cube|curry paste|miso|gochujang|harissa|pesto|marinara|pastina|gnocchi|ditalini|rigatoni|fusilli|farfalle|linguine|fettuccine|tortellini|ravioli|shortening|kalamata)(?:e?s)?\b/],
  ["drinks", /\b(wine|beer|vodka|rum|bourbon|whiskey|tequila|brandy|sake|mirin|sparkling water|club soda|soda|juice|coffee|espresso|tea)(?:e?s)?\b/],
];

export function aisleFor(key: string): Aisle {
  // Fresh herbs live in produce even though dried versions are spices.
  if (/^(rosemary|thyme|sage|basil|parsley|cilantro|dill|mint|chives|tarragon|oregano leaves)$/.test(key)) {
    return "produce";
  }
  if (/\b((peanut|almond|cashew|nut|apple|cookie) butter|coconut milk|coconut cream|evaporated milk|condensed milk|egg noodles?|cream of \w+)\b/.test(key)) {
    return "pantry";
  }
  if (/\bfrozen\b/.test(key)) return "frozen";
  if (/\bsun-?dried\b/.test(key)) return "pantry";
  if (/\b(flour|baking powder|baking soda|yeast|cornstarch|shortening|gnocchi|pasta|spaghetti|noodles?|rice)\b/.test(key)) return "pantry";
  if (/\b(oil|vinegar|broth|stock|paste|sauce|bouillon)\b/.test(key)) return "pantry";
  if (/\b(chicken|beef|steak|pork|bacon|sausage|ham|turkey|lamb|veal|bison|chorizo|shrimp|salmon|fish)\b/.test(key)) {
    return "meat";
  }
  if (SPICE_WORDS.test(key)) return "spices";
  for (const [aisle, pattern] of AISLE_WORDS) {
    if (pattern.test(key)) return aisle;
  }
  return "other";
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
