export type Aisle =
  | "produce"
  | "meat"
  | "dairy"
  | "bakery"
  | "pantry"
  | "spices"
  | "frozen"
  | "drinks"
  | "other";

export type Ingredient = {
  raw: string;
  qty: number | null;
  unit: string | null;
  /** Display name, e.g. "fresh rosemary". */
  name: string;
  /** Prep notes, e.g. "finely chopped". */
  note: string;
  /** Normalized name used to combine items across recipes, e.g. "rosemary". */
  key: string;
  aisle: Aisle;
  optional: boolean;
};

export type RecipeSource = "recipe-card" | "page" | "ai" | "typed";

export type Recipe = {
  id: string;
  title: string;
  url: string | null;
  image: string | null;
  servings: string | null;
  totalTime: string | null;
  ingredients: Ingredient[];
  steps: string[];
  storyWords: number;
  source: RecipeSource;
  addedAt: number;
};

export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Day = (typeof DAYS)[number];

export type PlannedMeal = {
  id: string;
  recipeId: string;
  day: Day | null;
  /** Batch multiplier: 0.5, 1, 1.5, 2, 3. */
  scale: number;
};

export type Store = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMiles: number | null;
  mapsUrl: string;
};

export type ExtraItem = {
  id: string;
  text: string;
};

export type KitchenState = {
  version: 1;
  recipes: Recipe[];
  plan: PlannedMeal[];
  /** Shopping list item key -> checked off. */
  checked: Record<string, boolean>;
  /** Shopping list item key -> already have it at home. */
  have: Record<string, boolean>;
  /** Shopping list item key -> favorite store id. */
  itemStore: Record<string, string>;
  extras: ExtraItem[];
  favoriteStores: Store[];
  home: { zip: string } | null;
  updatedAt: number;
};

export function emptyKitchen(): KitchenState {
  return {
    version: 1,
    recipes: [],
    plan: [],
    checked: {},
    have: {},
    itemStore: {},
    extras: [],
    favoriteStores: [],
    home: null,
    updatedAt: 0,
  };
}
