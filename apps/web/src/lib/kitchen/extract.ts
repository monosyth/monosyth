import { parse, type HTMLElement } from "node-html-parser";

import { cleanLine } from "./ingredients";

export type ExtractedRecipe = {
  title: string;
  image: string | null;
  servings: string | null;
  totalTime: string | null;
  ingredientLines: string[];
  steps: string[];
  storyWords: number;
  method: "recipe-card" | "page";
};

type JsonObject = Record<string, unknown>;

/** Pulls the recipe out of a blog page: structured recipe data first, then common recipe-card markup. */
export function extractRecipeFromHtml(html: string, pageUrl: string): ExtractedRecipe | null {
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: false, noscript: false } });
  const pageWords = countWords(visibleText(root));

  const fromJson = fromJsonLd(root, pageUrl);
  if (fromJson && fromJson.ingredientLines.length) {
    return withStory(fromJson, pageWords);
  }

  const fromMarkup = fromRecipeCardMarkup(root, pageUrl);
  if (fromMarkup && fromMarkup.ingredientLines.length) {
    return withStory(fromMarkup, pageWords);
  }

  const fromHeading = fromIngredientsHeading(root, pageUrl);
  if (fromHeading && fromHeading.ingredientLines.length) {
    return withStory(fromHeading, pageWords);
  }

  return null;
}

/** Plain text of the page for the AI fallback. */
export function pageTextForAi(html: string) {
  const root = parse(html, { comment: false });
  return visibleText(root).slice(0, 200_000);
}

export function pageTitle(html: string) {
  const root = parse(html);
  return decodeEntities(
    root.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
      root.querySelector("title")?.text ??
      "",
  ).trim();
}

function withStory(recipe: Omit<ExtractedRecipe, "storyWords">, pageWords: number): ExtractedRecipe {
  const recipeWords = countWords([...recipe.ingredientLines, ...recipe.steps].join(" "));
  return { ...recipe, storyWords: Math.max(0, pageWords - recipeWords) };
}

function visibleText(root: HTMLElement) {
  const clone = parse(root.toString());
  clone.querySelectorAll("script, style, noscript, svg, nav, header, footer, form, iframe").forEach(el => el.remove());
  clone
    .querySelectorAll("#comments, #respond, .comments-area, .comment-list, .comments, aside, #sidebar, .sidebar")
    .forEach(el => el.remove());
  const body = clone.querySelector("body") ?? clone;
  return decodeEntities(body.structuredText ?? body.text).replace(/[ \t]+/g, " ");
}

function countWords(text: string) {
  return text.split(/\s+/).filter(word => /[a-z]/i.test(word)).length;
}

function fromJsonLd(root: HTMLElement, pageUrl: string): Omit<ExtractedRecipe, "storyWords"> | null {
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    let data: unknown;
    try {
      data = JSON.parse(script.textContent.trim().replace(/^\s*<!--|-->\s*$/g, ""));
    } catch {
      continue;
    }
    const recipe = findRecipeNode(data);
    if (!recipe) continue;
    const ingredients = asArray(recipe.recipeIngredient ?? recipe.ingredients)
      .map(v => (typeof v === "string" ? v : ""))
      .map(line => cleanLine(stripTags(decodeEntities(line))))
      .filter(Boolean);
    return {
      title: cleanTitle(stripTags(decodeEntities(String(recipe.name ?? "")))) || pageTitleFrom(root),
      image: absoluteUrl(imageFrom(recipe.image), pageUrl),
      servings: yieldFrom(recipe.recipeYield),
      totalTime: durationLabel(String(recipe.totalTime ?? recipe.cookTime ?? "")),
      ingredientLines: ingredients,
      steps: stepsFrom(recipe.recipeInstructions),
      method: "recipe-card",
    };
  }
  return null;
}

function findRecipeNode(data: unknown, depth = 0): JsonObject | null {
  if (!data || depth > 6) return null;
  if (Array.isArray(data)) {
    for (const entry of data) {
      const found = findRecipeNode(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof data !== "object") return null;
  const node = data as JsonObject;
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some(t => typeof t === "string" && t.toLowerCase() === "recipe")) {
    return node;
  }
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) {
    const found = findRecipeNode(node[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function stepsFrom(value: unknown): string[] {
  const steps: string[] = [];
  const walk = (entry: unknown) => {
    if (!entry) return;
    if (typeof entry === "string") {
      // Some sites put all steps in one string separated by newlines.
      entry
        .split(/\n+/)
        .map(s => stripTags(decodeEntities(s)).trim())
        .filter(Boolean)
        .forEach(s => steps.push(s));
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach(walk);
      return;
    }
    if (typeof entry === "object") {
      const node = entry as JsonObject;
      if (node.itemListElement) {
        walk(node.itemListElement);
        return;
      }
      const text = node.text ?? node.name;
      if (typeof text === "string") walk(text);
    }
  };
  walk(value);
  return steps;
}

function fromRecipeCardMarkup(root: HTMLElement, pageUrl: string): Omit<ExtractedRecipe, "storyWords"> | null {
  const ingredientSelectors = [
    '[itemprop="recipeIngredient"]',
    '[itemprop="ingredients"]',
    ".wprm-recipe-ingredient",
    ".tasty-recipes-ingredients li",
    ".tasty-recipe-ingredients li",
    ".mv-create-ingredients li",
    ".recipe-ingredients li",
    ".ingredients li",
    ".ingredient-list li",
    '[class*="ingredients-list"] li',
    '[class*="IngredientList"] li',
    '[data-ingredient-name]',
  ];
  for (const selector of ingredientSelectors) {
    const lines = root
      .querySelectorAll(selector)
      .map(el => cleanLine(decodeEntities(el.text)))
      .filter(line => line && line.length < 200);
    if (lines.length >= 2) {
      const stepEls = root.querySelectorAll(
        '[itemprop="recipeInstructions"] li, .wprm-recipe-instruction-text, .tasty-recipes-instructions li, .mv-create-instructions li, .recipe-instructions li, .instructions li',
      );
      return {
        title: cleanTitle(
          decodeEntities(
            root.querySelector('[itemprop="name"], .wprm-recipe-name, .tasty-recipes-title, h1')?.text ?? "",
          ).trim(),
        ) || pageTitleFrom(root),
        image: absoluteUrl(root.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null, pageUrl),
        servings: null,
        totalTime: null,
        ingredientLines: dedupe(lines),
        steps: stepEls.map(el => decodeEntities(el.text).trim()).filter(Boolean),
        method: "page",
      };
    }
  }
  return null;
}

function fromIngredientsHeading(root: HTMLElement, pageUrl: string): Omit<ExtractedRecipe, "storyWords"> | null {
  const headings = root.querySelectorAll("h2, h3, h4, strong, p");
  for (const heading of headings) {
    if (!/^\s*ingredients\s*:?\s*$/i.test(heading.text)) continue;
    let el: HTMLElement | null = heading.nextElementSibling;
    // The heading might be wrapped (e.g. <p><strong>Ingredients</strong></p>).
    if (!el && heading.parentNode) el = heading.parentNode.nextElementSibling;
    for (let hops = 0; el && hops < 4; hops += 1, el = el.nextElementSibling) {
      const items = el.querySelectorAll("li");
      if (items.length >= 2) {
        return {
          title: pageTitleFrom(root),
          image: absoluteUrl(root.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null, pageUrl),
          servings: null,
          totalTime: null,
          ingredientLines: dedupe(items.map(li => cleanLine(decodeEntities(li.text))).filter(Boolean)),
          steps: [],
          method: "page",
        };
      }
    }
  }
  return null;
}

function pageTitleFrom(root: HTMLElement) {
  return cleanTitle(
    decodeEntities(
      root.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
        root.querySelector("h1")?.text ??
        root.querySelector("title")?.text ??
        "Untitled recipe",
    ).trim(),
  );
}

function cleanTitle(title: string) {
  return title
    .replace(/\s+[|–—-]\s+[^|–—]{2,40}$/, "")
    .replace(/\s+recipe$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function imageFrom(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return imageFrom(value[value.length > 1 ? value.length - 1 : 0]) ?? imageFrom(value[0]);
  if (typeof value === "object") {
    const node = value as JsonObject;
    return typeof node.url === "string" ? node.url : typeof node.contentUrl === "string" ? node.contentUrl : null;
  }
  return null;
}

function yieldFrom(value: unknown): string | null {
  const values = asArray(value).map(v => String(v).trim()).filter(Boolean);
  if (!values.length) return null;
  const withWords = values.find(v => /[a-z]/i.test(v));
  const chosen = withWords ?? values[0];
  return /^\d+$/.test(chosen) ? `${chosen} servings` : chosen;
}

/** "PT1H15M" -> "1 hr 15 min" */
function durationLabel(iso: string): string | null {
  const match = iso.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match || (!match[1] && !match[2])) return null;
  let hours = Number(match[1] ?? 0);
  let minutes = Number(match[2] ?? 0);
  hours += Math.floor(minutes / 60);
  minutes %= 60;
  return [hours ? `${hours} hr` : "", minutes ? `${minutes} min` : ""].filter(Boolean).join(" ");
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function absoluteUrl(url: string | null, base: string) {
  if (!url) return null;
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

function dedupe(lines: string[]) {
  return [...new Set(lines)];
}

function stripTags(text: string) {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", deg: "°", frac12: "½",
  frac14: "¼", frac34: "¾", eacute: "é", egrave: "è", ntilde: "ñ", reg: "®", trade: "™",
};

export function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
  });
}
