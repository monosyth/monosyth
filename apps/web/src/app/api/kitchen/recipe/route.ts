import { NextResponse } from "next/server";

import { requireKitchenUser } from "@/lib/kitchen/auth-server";
import { extractRecipeFromHtml } from "@/lib/kitchen/extract";
import { newId } from "@/lib/kitchen/ids";
import { parseIngredientLine } from "@/lib/kitchen/ingredients";
import { ingredientLinesFromText } from "@/lib/kitchen/pasted";
import type { Recipe, RecipeSource } from "@/lib/kitchen/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Many recipe sites turn away fake browsers but allow an honestly named app, and a few are the reverse.
const FETCH_ATTEMPTS: Array<Record<string, string>> = [
  {
    "User-Agent": "DallasKitchen/1.0 (+https://monosyth.com; recipe ingredient reader)",
    Accept: "text/html,application/xhtml+xml",
  },
  {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
];

async function fetchPage(url: string): Promise<string | null> {
  for (const headers of FETCH_ATTEMPTS) {
    try {
      const response = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(15_000) });
      if (response.ok) {
        return (await response.text()).slice(0, 6_000_000);
      }
    } catch {
      // Try the next approach.
    }
  }
  return null;
}

type Body = { url?: string; text?: string; title?: string };

export async function POST(request: Request) {
  const user = await requireKitchenUser(request);
  if (user instanceof NextResponse) return user;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("Something went wrong sending that. Try again.");
  }

  if (body.text?.trim()) {
    return NextResponse.json({ recipe: await fromTypedText(body.text, body.title ?? "") });
  }

  const url = normalizeUrl(body.url ?? "");
  if (!url) {
    return fail("That doesn't look like a web link. Copy the address from the recipe page and paste it here.");
  }

  const html = await fetchPage(url);
  if (!html) {
    return fail(
      "That website won't let apps read it. No problem: on the recipe page, select all the text, copy it, and paste it here instead.",
      "blocked",
    );
  }

  const found = extractRecipeFromHtml(html, url);
  if (found) {
    return NextResponse.json({
      recipe: toRecipe({
        title: found.title,
        url,
        image: found.image,
        servings: found.servings,
        totalTime: found.totalTime,
        lines: found.ingredientLines,
        steps: found.steps,
        storyWords: found.storyWords,
        source: found.method,
      }),
    });
  }

  return fail(
    "We couldn't find a recipe on that page. You can copy the ingredients from the page and paste them in instead.",
    "not-found",
  );
}

async function fromTypedText(text: string, title: string): Promise<Recipe> {
  const pasted = ingredientLinesFromText(text);
  const lines = pasted.lines;

  return toRecipe({
    title: title.trim() || pasted.title || "My recipe",
    url: null, image: null, servings: null, totalTime: null,
    lines, steps: pasted.steps, storyWords: pasted.storyWords, source: "typed",
  });
}

function toRecipe(input: {
  title: string;
  url: string | null;
  image: string | null;
  servings: string | null;
  totalTime: string | null;
  lines: string[];
  steps: string[];
  storyWords: number;
  source: RecipeSource;
}): Recipe {
  return {
    id: newId("r_"),
    title: input.title || "Untitled recipe",
    url: input.url,
    image: input.image,
    servings: input.servings,
    totalTime: input.totalTime,
    ingredients: input.lines.slice(0, 120).flatMap(parseIngredientLine),
    steps: input.steps.slice(0, 80),
    storyWords: input.storyWords,
    source: input.source,
    addedAt: Date.now(),
  };
}

function normalizeUrl(raw: string) {
  const match = raw.trim().match(/https?:\/\/\S+/i);
  const candidate = match ? match[0] : raw.trim() ? `https://${raw.trim()}` : "";
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
    // Keep the server from being pointed at private network addresses.
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/i.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function fail(message: string, reason = "error") {
  return NextResponse.json({ error: message, reason }, { status: 422 });
}
