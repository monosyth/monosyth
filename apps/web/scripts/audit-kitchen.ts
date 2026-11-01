import assert from "node:assert/strict";
import { test } from "node:test";

import { buildShoppingList } from "../src/lib/kitchen/grocery";
import { parseIngredient, parseIngredientLine } from "../src/lib/kitchen/ingredients";
import { extractRecipeFromHtml } from "../src/lib/kitchen/extract";
import type { Recipe } from "../src/lib/kitchen/types";

test("parses common ingredient lines", () => {
  const cases: Array<[string, number | null, string | null, string]> = [
    ["2 cups all-purpose flour", 2, "cup", "flour"],
    ["1 ½ teaspoons kosher salt", 1.5, "tsp", "salt"],
    ["1/2 tsp. freshly ground black pepper", 0.5, "tsp", "black pepper"],
    ["3 cloves garlic, minced", 3, "clove", "garlic"],
    ["2 garlic cloves, minced", 2, "clove", "garlic"],
    ["1 (14.5 oz) can diced tomatoes", 1, "can", "canned tomatoes"],
    ["2 sprigs fresh rosemary", 2, "sprig", "rosemary"],
    ["1 tablespoon chopped fresh rosemary", 1, "tbsp", "rosemary"],
    ["1-2 jalapeños, seeded", 2, null, "jalapeno"],
    ["1 large yellow onion, diced", 1, null, "onion"],
        ["2 lbs boneless skinless chicken thighs", 2, "lb", "chicken thigh"],
    ["1 lb ground beef", 1, "lb", "ground beef"],
    ["1 teaspoon ground cumin", 1, "tsp", "cumin"],
    ["4 green onions, sliced", 4, null, "green onion"],
    ["½ cup heavy whipping cream", 0.5, "cup", "heavy cream"],
  ];
  for (const [line, qty, unit, key] of cases) {
    const parsed = parseIngredient(line);
    assert.equal(parsed.qty, qty, `qty for "${line}"`);
    assert.equal(parsed.unit, unit, `unit for "${line}"`);
    assert.equal(parsed.key, key, `key for "${line}"`);
  }
});

test("puts things in sensible aisles", () => {
  assert.equal(parseIngredient("1 red bell pepper").aisle, "produce");
  assert.equal(parseIngredient("1 tsp garlic powder").aisle, "spices");
  assert.equal(parseIngredient("2 sprigs fresh rosemary").aisle, "produce");
  assert.equal(parseIngredient("1 tsp dried thyme").aisle, "spices");
  assert.equal(parseIngredient("1 (14.5 oz) can diced tomatoes").aisle, "pantry");
  assert.equal(parseIngredient("2 tbsp peanut butter").aisle, "pantry");
  assert.equal(parseIngredient("1 cup shredded cheddar cheese").aisle, "dairy");
  assert.equal(parseIngredient("1 lb ground beef").aisle, "meat");
  assert.equal(parseIngredient("2 cups chicken broth").aisle, "pantry");
});

function recipe(id: string, title: string, lines: string[]): Recipe {
  return {
    id, title, url: null, image: null, servings: null, totalTime: null,
    ingredients: lines.map(parseIngredient), steps: [], storyWords: 0, source: "typed", addedAt: 0,
  };
}

test("combines shared ingredients and flags leftovers", () => {
  const chicken = recipe("a", "Rosemary Chicken", ["2 sprigs fresh rosemary", "1 tbsp olive oil", "3 cloves garlic", "1 tsp salt"]);
  const potatoes = recipe("b", "Roast Potatoes", ["1 tbsp chopped fresh rosemary", "2 tbsp olive oil", "2 garlic cloves", "2 lbs potatoes"]);
  const soup = recipe("c", "Tomato Soup", ["1/2 cup heavy cream", "1 (28 oz) can crushed tomatoes", "4 cups water"]);
  const list = buildShoppingList({
    recipes: [chicken, potatoes, soup],
    plan: [
      { id: "m1", recipeId: "a", day: "mon", scale: 1 },
      { id: "m2", recipeId: "b", day: "wed", scale: 1 },
      { id: "m3", recipeId: "c", day: null, scale: 2 },
    ],
  });
  const byKey = new Map(list.items.map(i => [i.key, i]));

  const rosemary = byKey.get("rosemary")!;
  assert.equal(rosemary.usedIn.length, 2);
  assert.equal(rosemary.buyTip, "1 package or bunch");
  assert.ok(list.leftovers.some(t => t.key === "rosemary" && t.shared && /Rosemary Chicken and Roast Potatoes/.test(t.message)));

  assert.equal(byKey.get("olive oil")!.amount, "3 tbsp");
  assert.equal(byKey.get("garlic")!.amount, "5 cloves");
  assert.match(byKey.get("garlic")!.buyTip!, /1 head/);
  assert.equal(byKey.get("heavy cream")!.amount, "1 cup");
  assert.ok(list.leftovers.some(t => t.key === "heavy cream" && !t.shared));
  assert.equal(byKey.get("salt")!.staple, true);
  assert.equal(byKey.has("water"), false);
  assert.equal(list.mealCount, 3);
});

test("reads JSON-LD recipe data inside a long blog post", () => {
  const story = "My grandmother had a farm and every autumn we would gather apples. ".repeat(200);
  const html = `<!doctype html><html><head><title>Best Chili Ever | Some Blog</title>
    <meta property="og:image" content="/chili.jpg">
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "Best Chili Ever" },
        {
          "@type": "Recipe",
          name: "Best Chili Ever",
          image: ["https://example.com/chili-1x1.jpg"],
          recipeYield: ["6", "6 servings"],
          totalTime: "PT1H15M",
          recipeIngredient: ["2 lbs ground beef", "1 &amp; ½ cups diced onion", "2 tbsp chili powder"],
          recipeInstructions: [
            { "@type": "HowToStep", text: "Brown the beef." },
            { "@type": "HowToSection", name: "Simmer", itemListElement: [{ "@type": "HowToStep", text: "Add everything and simmer." }] },
          ],
        },
      ],
    })}</script></head><body><article><p>${story}</p></article></body></html>`;
  const result = extractRecipeFromHtml(html, "https://example.com/chili/");
  assert.ok(result);
  assert.equal(result.title, "Best Chili Ever");
  assert.equal(result.ingredientLines.length, 3);
  assert.equal(result.ingredientLines[1], "1 & 1/2 cups diced onion");
  assert.deepEqual(result.steps, ["Brown the beef.", "Add everything and simmer."]);
  assert.equal(result.servings, "6 servings");
  assert.equal(result.totalTime, "1 hr 15 min");
  assert.ok(result.storyWords > 2000);
});

test("falls back to recipe card markup", () => {
  const html = `<html><head><meta property="og:title" content="Simple Pancakes"></head><body>
    <div class="wprm-recipe"><h2 class="wprm-recipe-name">Simple Pancakes</h2>
    <ul><li class="wprm-recipe-ingredient">1 cup flour</li><li class="wprm-recipe-ingredient">1 egg</li>
    <li class="wprm-recipe-ingredient">1 cup milk</li></ul></div></body></html>`;
  const result = extractRecipeFromHtml(html, "https://example.com/pancakes");
  assert.ok(result);
  assert.equal(result.title, "Simple Pancakes");
  assert.deepEqual(result.ingredientLines, ["1 cup flour", "1 egg", "1 cup milk"]);
});

test("finds ingredients inside a whole pasted page", async () => {
  const { ingredientLinesFromText } = await import("../src/lib/kitchen/pasted");
  const story = Array.from({ length: 50 }, (_, i) => `Story paragraph ${i} about autumn leaves and my grandmother's kitchen.`).join("\n");
  const page = `Jump to Recipe\nIngredients\nWhy you'll love it\n${story}\nRosemary Potatoes\nServings: 4\nIngredients\nUS Customary\n2 lbs baby potatoes, halved\n2 tablespoons olive oil\nFor the topping:\n1 tablespoon chopped fresh rosemary\nSalt and pepper\nInstructions\n1. Heat the oven to 425°F.\n2. Toss and roast for 35 minutes.\nNotes\nKeeps 3 days.`;
  const result = ingredientLinesFromText(page);
  assert.deepEqual(result.lines, [
    "2 lbs baby potatoes, halved",
    "2 tablespoons olive oil",
    "1 tablespoon chopped fresh rosemary",
    "Salt and pepper",
  ]);
  assert.deepEqual(result.steps, ["Heat the oven to 425°F.", "Toss and roast for 35 minutes."]);
  assert.equal(result.looksLikeWholePage, true);
  assert.ok(result.storyWords > 300);
});

test("handles the tricky lines real blogs use", () => {
  const cases: Array<[string, number | null, string | null, string, string?]> = [
    ["1 cup chicken or vegetable broth", 1, "cup", "chicken broth", "pantry"],
    ["1/2 cup sour cream or full-fat Greek yogurt", 0.5, "cup", "sour cream", "dairy"],
    ["2 tbsp ghee or butter", 2, "tbsp", "ghee"],
    ["One 15.5-ounce can black beans, drained", 1, "can", "black beans", "pantry"],
    ["1 15-oz. can chickpeas", 1, "can", "chickpeas", "pantry"],
    ["1 10-oz. package frozen spinach", 1, "package", "frozen spinach", "frozen"],
    ["28-ounce can whole peeled tomatoes", 1, "can", "canned tomatoes", "pantry"],
    ["28 oz can crushed tomatoes", 1, "can", "canned tomatoes", "pantry"],
    ["Four 5-ounce salmon fillets", 4, null, "salmon fillet", "meat"],
    ["4 x 180g/6 oz salmon fillets", 4, null, "salmon fillet", "meat"],
    ["500g/ 1 lb potato gnocchi", 500, "g", "potato gnocchi", "pantry"],
    ["1 and 1/2 cups pretzel crumbs", 1.5, "cup", "pretzel crumb"],
    ["12- to 16-ounce bag frozen peas and carrots", 1, "package", "frozen peas carrot", "frozen"],
    ["1 1 1/4-ounce package onion soup mix", 1, "package", "onion soup mix"],
    ["1 cup plus 2 tablespoons granulated sugar", 1, "cup", "sugar"],
    ["5 medium cloves garlic, minced", 5, "clove", "garlic"],
    ["2 celery sticks, diced", 2, "stalk", "celery"],
    ["Juice of 2 limes", 2, null, "lime", "produce"],
    ["1.5 lbs boneless, skinless chicken thighs", 1.5, "lb", "chicken thigh", "meat"],
    ["1/2 cup freshly-grated parmesan cheese", 0.5, "cup", "parmesan", "dairy"],
    ["1/4 cup extra-virgin olive oil", 0.25, "cup", "olive oil"],
    ["2 cups shredded mozzarella cheese", 2, "cup", "mozzarella"],
    ["1/2 cup sun-dried tomatoes", 0.5, "cup", "sun-dried tomato", "pantry"],
    ["2 tbsp capers", 2, "tbsp", "capers", "pantry"],
    ["1/2 cup kalamata olives", 0.5, "cup", "kalamata olives", "pantry"],
    ["3 cups bread flour", 3, "cup", "bread flour", "pantry"],
    ["1 medium yellow or white onion, chopped", 1, null, "onion", "produce"],
    ["3/4 tsp cooking salt / kosher salt", 0.75, "tsp", "salt"],
    ["4 carrots cut into 2-inch chunks", 4, null, "carrot", "produce"],
    ["1 bulb of fennel, tops removed", 1, "bulb", "fennel", "produce"],
  ];
  for (const [line, qty, unit, key, aisle] of cases) {
    const parsed = parseIngredient(line);
    assert.equal(parsed.qty, qty, `qty for "${line}"`);
    assert.equal(parsed.unit, unit, `unit for "${line}"`);
    assert.equal(parsed.key, key, `key for "${line}"`);
    if (aisle) assert.equal(parsed.aisle, aisle, `aisle for "${line}"`);
  }
});

test("splits lines that hold two items", () => {
  const keys = (line: string) => parseIngredientLine(line).map(i => i.key);
  assert.deepEqual(keys("2 tsp each chili powder and cumin"), ["chili powder", "cumin"]);
  assert.deepEqual(parseIngredientLine("2 tsp each chili powder and cumin").map(i => i.qty), [2, 2]);
  assert.deepEqual(keys("Kosher salt and freshly ground black pepper, to taste"), ["salt", "black pepper"]);
  assert.deepEqual(keys("1/4 tsp each salt and pepper"), ["salt", "black pepper"]);
  assert.deepEqual(keys("1 red bell pepper"), ["red bell pepper"]);
});
