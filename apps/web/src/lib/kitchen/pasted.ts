import { cleanLine } from "./ingredients";

const INGREDIENTS_HEADING = /^ingredients\b\s*(\(.*\))?\s*:?$/i;
const STEPS_HEADING = /^(instructions|directions|method|steps|preparation|how to make( it)?)\s*:?$/i;
const STOP_HEADING = /^(notes?|recipe notes|nutrition( facts| information)?|equipment|video|did you make this|tried this recipe|course|cuisine|keyword)\b/i;
const NOISE = /^(cook mode|prevent your screen from going dark|\d+x(\s*\d+x)*|us customary|metric|print( recipe)?|pin( recipe)?|save( recipe)?|rate( this)? recipe|jump to recipe|scale|servings?:?.*|yield:?.*|prep time.*|cook time.*|total time.*|▢)$/i;
const LOOKS_LIKE_INGREDIENT = /^(\d|[¼½¾⅓⅔⅛]|a\s|an\s|one\s|two\s|three\s|half\s|pinch|dash|salt|pepper|kosher|fresh|olive oil)/i;

export type PastedRecipe = {
  lines: string[];
  steps: string[];
  title: string;
  storyWords: number;
  looksLikeWholePage: boolean;
};

/** Finds the ingredient list inside pasted text, whether it's a short list or a whole copied web page. */
export function ingredientLinesFromText(text: string): PastedRecipe {
  const all = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
  const looksLikeWholePage = all.length > 40 || text.length > 4000;

  // Use the last "Ingredients" heading that is followed by ingredient-looking lines;
  // earlier ones are often in a table of contents.
  let start = -1;
  for (let i = all.length - 1; i >= 0; i -= 1) {
    if (!INGREDIENTS_HEADING.test(all[i])) continue;
    const next = all.slice(i + 1, i + 8).filter(line => LOOKS_LIKE_INGREDIENT.test(line));
    if (next.length >= 2) {
      start = i;
      break;
    }
  }

  let lines: string[];
  let steps: string[] = [];
  if (start >= 0) {
    lines = [];
    let i = start + 1;
    for (; i < all.length; i += 1) {
      const line = all[i];
      if (STEPS_HEADING.test(line) || STOP_HEADING.test(line)) break;
      if (NOISE.test(line) || isSubheading(line)) continue;
      lines.push(line);
    }
    if (i < all.length && STEPS_HEADING.test(all[i])) {
      for (i += 1; i < all.length; i += 1) {
        const line = all[i];
        if (STOP_HEADING.test(line)) break;
        if (NOISE.test(line) || isSubheading(line)) continue;
        steps.push(line);
      }
    }
  } else if (looksLikeWholePage) {
    lines = all.filter(line => LOOKS_LIKE_INGREDIENT.test(line) && line.length < 120);
  } else {
    lines = all.filter(line => !INGREDIENTS_HEADING.test(line) && !isSubheading(line) && !NOISE.test(line));
  }

  steps = steps.map(step => step.replace(/^(step\s*)?\d+[.):]\s*/i, "")).filter(step => step.length > 3);
  const words = (list: string[]) => list.join(" ").split(/\s+/).filter(Boolean).length;
  return {
    lines: [...new Set(lines)].slice(0, 120),
    steps: steps.slice(0, 80),
    title: "",
    storyWords: looksLikeWholePage ? Math.max(0, words(all) - words(lines) - words(steps)) : 0,
    looksLikeWholePage,
  };
}

function isSubheading(line: string) {
  return (/:$/.test(line) && line.length < 50 && !/^\d/.test(line)) || /^for the [\w\s]+:?$/i.test(line);
}
