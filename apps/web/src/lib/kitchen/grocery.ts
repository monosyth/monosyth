import type { Aisle, Day, Ingredient, KitchenState, PlannedMeal, Recipe } from "./types";

export const AISLE_LABELS: Record<Aisle, string> = {
  produce: "Fruits & veggies",
  meat: "Meat & seafood",
  dairy: "Dairy & eggs",
  bakery: "Bread & bakery",
  pantry: "Pantry & cans",
  spices: "Spices",
  frozen: "Frozen",
  drinks: "Drinks",
  other: "Everything else",
};

export const AISLE_ORDER: Aisle[] = [
  "produce", "meat", "dairy", "bakery", "pantry", "spices", "frozen", "drinks", "other",
];

export const DAY_LABELS: Record<Day, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

/** Things most kitchens already have; shown in a separate "check the cupboard" group. */
const STAPLES = new Set([
  "salt", "black pepper", "salt and pepper", "olive oil", "cooking oil", "cooking spray",
  "flour", "sugar", "brown sugar", "baking soda", "baking powder", "vanilla extract",
  "pure vanilla extract", "garlic powder", "onion powder", "red pepper flake",
  "italian seasoning", "dried oregano", "cinnamon", "paprika", "cumin", "chili powder",
]);
const SKIP = new Set(["water", "ice", "warm water", "cold water", "hot water", "boiling water", "ice water"]);

const VOLUME_TSP: Record<string, number> = {
  tsp: 1, tbsp: 3, "fl oz": 6, cup: 48, pint: 96, quart: 192, gallon: 768, ml: 0.2029, l: 202.9,
};
const WEIGHT_G: Record<string, number> = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };

type UsedIn = { mealId: string; recipeTitle: string; day: Day | null; amount: string };

export type ShoppingItem = {
  key: string;
  name: string;
  aisle: Aisle;
  amount: string;
  /** Plain-English buying tip, e.g. "1 bunch is plenty". */
  buyTip: string | null;
  usedIn: UsedIn[];
  staple: boolean;
  optional: boolean;
};

export type LeftoverTip = {
  key: string;
  name: string;
  message: string;
  shared: boolean;
};

/** Bundle items: you buy a whole bunch or container even when a recipe needs a little. */
const BUNDLES: Array<{ match: RegExp; buy: (need: Need) => string; perishable: boolean }> = [
  {
    match: /^(rosemary|thyme|sage|tarragon|oregano leaves|chives|mint|dill)$/,
    buy: () => "1 package or bunch",
    perishable: true,
  },
  { match: /^(parsley|cilantro|basil|green onion|kale|chard)$/, buy: () => "1 bunch", perishable: true },
  { match: /^celery$/, buy: () => "1 bunch", perishable: true },
  {
    match: /^garlic$/,
    buy: need => {
      const cloves = need.counts.get("clove") ?? need.counts.get("") ?? 0;
      const heads = Math.max(1, Math.ceil(cloves / 10));
      return `${heads} head${heads > 1 ? "s" : ""}${cloves ? ` (about ${Math.round(cloves)} cloves needed)` : ""}`;
    },
    perishable: false,
  },
  { match: /^ginger$/, buy: () => "1 small piece", perishable: false },
  {
    match: /^(heavy cream|buttermilk|sour cream|half and half|ricotta|mascarpone|cream cheese|creme fraiche|plain yogurt|greek yogurt|yogurt|coconut milk)$/,
    buy: () => "1 container",
    perishable: true,
  },
  { match: /^(spinach|arugula|baby spinach|mixed greens|lettuce)$/, buy: () => "1 bag or bunch", perishable: true },
];

type Need = {
  volumeTsp: number;
  weightG: number;
  counts: Map<string, number>;
  vague: boolean;
};

function describeNeed(need: Need) {
  const parts: string[] = [];
  if (need.weightG > 0) parts.push(formatWeight(need.weightG));
  if (need.volumeTsp > 0) parts.push(formatVolume(need.volumeTsp));
  for (const [unit, qty] of need.counts) {
    parts.push(formatCount(qty, unit));
  }
  if (!parts.length && need.vague) return "some";
  return parts.join(" + ");
}

function formatCount(qty: number, unit: string) {
  const amount = formatNumber(qty);
  if (!unit) return amount;
  return `${amount} ${pluralUnit(unit, qty)}`;
}

function pluralUnit(unit: string, qty: number) {
  if (qty <= 1) return unit;
  if (unit === "bunch") return "bunches";
  if (unit === "pinch") return "pinches";
  if (unit === "dash") return "dashes";
  if (unit === "fl oz" || unit === "oz" || unit === "lb" || unit === "g" || unit === "kg" || unit === "ml" || unit === "l") {
    return unit;
  }
  return `${unit}s`;
}

export function formatNumber(n: number) {
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  const nice: Array<[number, string]> = [
    [0, ""], [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""],
  ];
  let best = nice[0];
  for (const candidate of nice) {
    if (Math.abs(candidate[0] - frac) < Math.abs(best[0] - frac)) best = candidate;
  }
  if (Math.abs(best[0] - frac) > 0.07) {
    return String(Math.round(n * 10) / 10);
  }
  const w = best[0] === 1 ? whole + 1 : whole;
  if (!best[1]) return String(w);
  return w ? `${w}${best[1]}` : best[1];
}

function formatVolume(tsp: number) {
  if (tsp >= 12) return `${formatNumber(roundTo(tsp / 48, 0.125))} ${tsp / 48 > 1.06 ? "cups" : "cup"}`;
  if (tsp >= 3) return `${formatNumber(roundTo(tsp / 3, 0.5))} tbsp`;
  return `${formatNumber(roundTo(tsp, 0.125))} tsp`;
}

function formatWeight(g: number) {
  const oz = g / 28.35;
  if (oz >= 16) return `${formatNumber(roundTo(oz / 16, 0.25))} lb`;
  return `${formatNumber(roundTo(oz, 0.5))} oz`;
}

function roundTo(n: number, step: number) {
  return Math.max(step, Math.round(n / step) * step);
}

function addToNeed(need: Need, ing: Ingredient, scale: number) {
  if (ing.qty === null) {
    need.vague = true;
    return;
  }
  const qty = ing.qty * scale;
  const unit = ing.unit ?? "";
  if (VOLUME_TSP[unit]) {
    need.volumeTsp += qty * VOLUME_TSP[unit];
  } else if (WEIGHT_G[unit]) {
    need.weightG += qty * WEIGHT_G[unit];
  } else {
    need.counts.set(unit, (need.counts.get(unit) ?? 0) + qty);
  }
}

function amountFor(ing: Ingredient, scale: number) {
  const need: Need = { volumeTsp: 0, weightG: 0, counts: new Map(), vague: false };
  addToNeed(need, ing, scale);
  if (ing.qty !== null && ing.unit && !VOLUME_TSP[ing.unit] && !WEIGHT_G[ing.unit]) {
    return formatCount(ing.qty * scale, ing.unit);
  }
  if (ing.qty !== null && ing.unit && scale === 1) {
    return `${formatNumber(ing.qty)} ${pluralUnit(ing.unit, ing.qty)}`;
  }
  return describeNeed(need);
}

export type ShoppingList = {
  items: ShoppingItem[];
  leftovers: LeftoverTip[];
  mealCount: number;
};

export function buildShoppingList(state: Pick<KitchenState, "plan" | "recipes">): ShoppingList {
  const recipes = new Map<string, Recipe>(state.recipes.map(r => [r.id, r]));
  const groups = new Map<string, { item: ShoppingItem; need: Need; names: Map<string, number> }>();
  let mealCount = 0;

  for (const meal of state.plan) {
    const recipe = recipes.get(meal.recipeId);
    if (!recipe) continue;
    mealCount += 1;
    for (const ing of recipe.ingredients) {
      if (SKIP.has(ing.key) || !ing.key) continue;
      let group = groups.get(ing.key);
      if (!group) {
        group = {
          item: {
            key: ing.key,
            name: ing.name,
            aisle: ing.aisle,
            amount: "",
            buyTip: null,
            usedIn: [],
            staple: STAPLES.has(ing.key),
            optional: true,
          },
          need: { volumeTsp: 0, weightG: 0, counts: new Map(), vague: false },
          names: new Map(),
        };
        groups.set(ing.key, group);
      }
      addToNeed(group.need, ing, meal.scale);
      group.item.optional = group.item.optional && ing.optional;
      group.names.set(ing.name, (group.names.get(ing.name) ?? 0) + 1);
      const already = group.item.usedIn.find(u => u.mealId === meal.id);
      const amount = amountFor(ing, meal.scale);
      if (already) {
        already.amount = [already.amount, amount].filter(Boolean).join(" + ");
      } else {
        group.item.usedIn.push({ mealId: meal.id, recipeTitle: recipe.title, day: meal.day, amount });
      }
    }
  }

  const items: ShoppingItem[] = [];
  const leftovers: LeftoverTip[] = [];
  for (const { item, need, names } of groups.values()) {
    item.name = displayName(item.key, names);
    item.amount = describeNeed(need);
    const bundle = BUNDLES.find(b => b.match.test(item.key));
    if (bundle) {
      item.buyTip = bundle.buy(need);
    }
    items.push(item);

    const recipeTitles = [...new Set(item.usedIn.map(u => u.recipeTitle))];
    if (bundle && recipeTitles.length > 1) {
      leftovers.push({
        key: item.key,
        name: item.name,
        shared: true,
        message: `One ${item.buyTip?.replace(/^1 /, "") ?? "purchase"} of ${item.name} covers ${joinTitles(recipeTitles)}.`,
      });
    } else if (bundle?.perishable) {
      leftovers.push({
        key: item.key,
        name: item.name,
        shared: false,
        message: `You'll have extra ${item.name} after ${recipeTitles[0]}. Try to plan another meal that uses it.`,
      });
    }
  }

  items.sort((a, b) => AISLE_ORDER.indexOf(a.aisle) - AISLE_ORDER.indexOf(b.aisle) || a.name.localeCompare(b.name));
  leftovers.sort((a, b) => Number(b.shared) - Number(a.shared));
  return { items, leftovers, mealCount };
}

/** Prefer the shortest wording a recipe used ("rosemary" over "fresh rosemary sprigs"). */
function displayName(key: string, names: Map<string, number>) {
  const options = [...names.keys()];
  if (options.length === 1) return tidy(options[0]);
  return tidy(key);
}

function tidy(name: string) {
  const trimmed = name.replace(/\s+/g, " ").trim();
  return trimmed.charAt(0).toLowerCase() === trimmed.charAt(0) ? trimmed : trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function joinTitles(titles: string[]) {
  if (titles.length <= 1) return titles[0] ?? "";
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

export function mealsByDay(plan: PlannedMeal[]) {
  const order: Array<Day | null> = ["sun", "mon", "tue", "wed", "thu", "fri", "sat", null];
  return [...plan].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
}
