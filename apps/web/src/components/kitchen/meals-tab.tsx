"use client";

import { useState } from "react";

import { DAY_LABELS, mealsByDay } from "@/lib/kitchen/grocery";
import { newId } from "@/lib/kitchen/ids";
import { DAYS, type Day, type KitchenState, type Recipe } from "@/lib/kitchen/types";
import { RecipeSheet } from "./recipe-sheet";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

type Props = {
  state: KitchenState;
  update: (change: (draft: KitchenState) => KitchenState) => void;
  authFetch: AuthFetch;
  toBuy: number;
  goToList: () => void;
};

const SCALES: Array<[number, string]> = [
  [0.5, "Half batch"],
  [1, "Normal batch"],
  [1.5, "1½ batches"],
  [2, "Double batch"],
  [3, "Triple batch"],
];

export function MealsTab({ state, update, authFetch, toBuy, goToList }: Props) {
  const [preview, setPreview] = useState<Recipe | null>(null);
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);
  const [showBox, setShowBox] = useState(false);
  const recipes = new Map(state.recipes.map(r => [r.id, r]));
  const plan = mealsByDay(state.plan).filter(meal => recipes.has(meal.recipeId));
  const openRecipe = openRecipeId ? recipes.get(openRecipeId) ?? null : null;

  function addToWeek(recipe: Recipe) {
    update(s => ({
      ...s,
      recipes: s.recipes.some(r => r.id === recipe.id) ? s.recipes : [recipe, ...s.recipes],
      plan: [...s.plan, { id: newId("m_"), recipeId: recipe.id, day: null, scale: 1 }],
    }));
  }

  function saveOnly(recipe: Recipe) {
    update(s => ({ ...s, recipes: s.recipes.some(r => r.id === recipe.id) ? s.recipes : [recipe, ...s.recipes] }));
  }

  function startNewWeek() {
    if (!window.confirm("Start a new week? This clears this week's meals and checkmarks. Your saved recipes stay in your recipe box.")) {
      return;
    }
    update(s => ({ ...s, plan: [], checked: {}, have: {}, extras: [] }));
  }

  return (
    <div className="stack">
      {preview ? (
        <PreviewCard
          recipe={preview}
          onAdd={() => {
            addToWeek(preview);
            setPreview(null);
          }}
          onSave={() => {
            saveOnly(preview);
            setPreview(null);
          }}
          onCancel={() => setPreview(null)}
        />
      ) : (
        <AddRecipeCard onFound={setPreview} authFetch={authFetch} />
      )}

      <section className="stack-tight">
        <div className="section-head">
          <h2>This week&rsquo;s meals</h2>
          {plan.length ? <span className="count">{plan.length}</span> : null}
        </div>

        {plan.length === 0 ? (
          <div className="empty">
            <p className="empty-title">No meals planned yet</p>
            <p className="muted">Paste a recipe link above. You can plan one meal or a whole week.</p>
          </div>
        ) : (
          <ul className="meal-list">
            {plan.map(meal => {
              const recipe = recipes.get(meal.recipeId)!;
              return (
                <li key={meal.id} className="meal">
                  <button className="meal-main" onClick={() => setOpenRecipeId(recipe.id)}>
                    <Thumb recipe={recipe} />
                    <span className="meal-text">
                      <span className="meal-title">{recipe.title}</span>
                      <span className="muted small">
                        {recipe.ingredients.length} ingredients
                        {recipe.totalTime ? ` · ${recipe.totalTime}` : ""}
                      </span>
                    </span>
                  </button>
                  <div className="meal-controls">
                    <label className="select-chip">
                      <span className="sr-only">Day</span>
                      <select
                        value={meal.day ?? ""}
                        onChange={event =>
                          update(s => ({
                            ...s,
                            plan: s.plan.map(m => (m.id === meal.id ? { ...m, day: (event.target.value || null) as Day | null } : m)),
                          }))
                        }
                      >
                        <option value="">Any day</option>
                        {DAYS.map(day => (
                          <option key={day} value={day}>
                            {DAY_LABELS[day]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="select-chip">
                      <span className="sr-only">Batch size</span>
                      <select
                        value={meal.scale}
                        onChange={event =>
                          update(s => ({
                            ...s,
                            plan: s.plan.map(m => (m.id === meal.id ? { ...m, scale: Number(event.target.value) } : m)),
                          }))
                        }
                      >
                        {SCALES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="link-button danger"
                      onClick={() => update(s => ({ ...s, plan: s.plan.filter(m => m.id !== meal.id) }))}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {plan.length ? (
          <>
            <button className="btn btn-block" onClick={goToList}>
              See my shopping list{toBuy ? ` (${toBuy} items)` : ""} →
            </button>
            <button className="link-button center" onClick={startNewWeek}>
              Start a new week
            </button>
          </>
        ) : null}
      </section>

      {state.recipes.length ? (
        <section className="stack-tight">
          <button className="section-toggle" onClick={() => setShowBox(open => !open)} aria-expanded={showBox}>
            <h2>Recipe box</h2>
            <span className="count">{state.recipes.length}</span>
            <span className="chevron" aria-hidden>
              {showBox ? "▲" : "▼"}
            </span>
          </button>
          {showBox ? (
            <ul className="box-list">
              {state.recipes.map(recipe => {
                const timesPlanned = state.plan.filter(m => m.recipeId === recipe.id).length;
                return (
                  <li key={recipe.id} className="box-item">
                    <button className="meal-main" onClick={() => setOpenRecipeId(recipe.id)}>
                      <Thumb recipe={recipe} />
                      <span className="meal-text">
                        <span className="meal-title">{recipe.title}</span>
                        {timesPlanned ? <span className="muted small">On this week&rsquo;s plan</span> : null}
                      </span>
                    </button>
                    <button className="btn btn-small btn-ghost" onClick={() => addToWeek(recipe)}>
                      + Add to week
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted small">Every recipe you add is saved here so you can plan it again later.</p>
          )}
        </section>
      ) : null}

      {openRecipe ? (
        <RecipeSheet
          recipe={openRecipe}
          onClose={() => setOpenRecipeId(null)}
          onAddToWeek={() => addToWeek(openRecipe)}
          onChange={next => update(s => ({ ...s, recipes: s.recipes.map(r => (r.id === next.id ? next : r)) }))}
          onDelete={() => {
            update(s => ({
              ...s,
              recipes: s.recipes.filter(r => r.id !== openRecipe.id),
              plan: s.plan.filter(m => m.recipeId !== openRecipe.id),
            }));
            setOpenRecipeId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Thumb({ recipe }: { recipe: Recipe }) {
  const [broken, setBroken] = useState(false);
  if (recipe.image && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="thumb"
        src={recipe.image}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="thumb thumb-empty" aria-hidden>
      🥘
    </span>
  );
}

function AddRecipeCard({ onFound, authFetch }: { onFound: (recipe: Recipe) => void; authFetch: AuthFetch }) {
  const [mode, setMode] = useState<"link" | "text">("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerPaste, setOfferPaste] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setOfferPaste(false);
    if (mode === "link" && !url.trim()) {
      setError("Paste a recipe link first.");
      return;
    }
    if (mode === "text" && !text.trim()) {
      setError("Type or paste the ingredients first, one per line.");
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch("/api/kitchen/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "link" ? { url } : { text, title }),
      });
      const data = (await res.json()) as { recipe?: Recipe; error?: string; reason?: string };
      if (data.recipe) {
        onFound(data.recipe);
        setUrl("");
        setText("");
        setTitle("");
      } else {
        setError(data.error ?? "Something went wrong. Try again.");
        setOfferPaste(mode === "link");
      }
    } catch {
      setError("We couldn't connect. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card add-card" onSubmit={submit}>
      {mode === "link" ? (
        <>
          <label htmlFor="recipe-url" className="big-label">
            Paste a recipe link
          </label>
          <input
            id="recipe-url"
            className="input"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://www.someblog.com/best-ever-chili"
            value={url}
            onChange={event => setUrl(event.target.value)}
            disabled={busy}
          />
          <button className="btn btn-block" disabled={busy}>
            {busy ? "Skipping the life story…" : "Get the ingredients"}
          </button>
          <button
            type="button"
            className="link-button center"
            onClick={() => {
              setMode("text");
              setError(null);
            }}
          >
            No link, or the site won&rsquo;t open? Paste the recipe instead
          </button>
        </>
      ) : (
        <>
          <label htmlFor="recipe-text" className="big-label">
            Paste the recipe
          </label>
          <p className="muted small help">
            Copy just the ingredients, or the whole recipe page, and paste it below. We&rsquo;ll find the ingredients.
          </p>
          <textarea
            id="recipe-text"
            className="input textarea"
            rows={7}
            placeholder={"For example:\n2 cups rice\n1 onion, chopped\n3 sprigs rosemary"}
            value={text}
            onChange={event => setText(event.target.value)}
            disabled={busy}
          />
          <input
            id="recipe-title"
            className="input"
            placeholder="Give it a name (optional), like “Grandma’s chili”"
            value={title}
            onChange={event => setTitle(event.target.value)}
            disabled={busy}
            aria-label="Recipe name"
          />
          <button className="btn btn-block" disabled={busy}>
            {busy ? "Reading…" : "Use these ingredients"}
          </button>
          <button
            type="button"
            className="link-button center"
            onClick={() => {
              setMode("link");
              setError(null);
            }}
          >
            ← Back to pasting a link
          </button>
        </>
      )}
      {error ? (
        <div className="form-error" role="alert">
          <p>{error}</p>
          {offerPaste ? (
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setMode("text")}>
              Paste the recipe instead
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function PreviewCard(props: { recipe: Recipe; onAdd: () => void; onSave: () => void; onCancel: () => void }) {
  const { recipe } = props;
  return (
    <section className="card preview">
      {recipe.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="preview-image" src={recipe.image} alt="" referrerPolicy="no-referrer" onError={e => (e.currentTarget.style.display = "none")} />
      ) : null}
      <h2 className="preview-title">{recipe.title}</h2>
      {recipe.storyWords > 150 ? (
        <p className="story-badge">
          ✂️ We skipped about {roundStory(recipe.storyWords)} words of life story for you.
        </p>
      ) : null}
      <p className="muted small">
        {new Set(recipe.ingredients.map(ing => ing.raw)).size} ingredients
        {recipe.servings ? ` · ${recipe.servings}` : ""}
        {recipe.totalTime ? ` · ${recipe.totalTime}` : ""}
      </p>
      <ul className="ingredient-preview">
        {[...new Set(recipe.ingredients.map(ing => ing.raw))].map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
      <div className="button-row">
        <button className="btn btn-block" onClick={props.onAdd}>
          Add to this week
        </button>
        <button className="btn btn-ghost btn-block" onClick={props.onSave}>
          Save for later
        </button>
      </div>
      <button className="link-button center" onClick={props.onCancel}>
        Never mind
      </button>
    </section>
  );
}

function roundStory(words: number) {
  const rounded = words >= 1000 ? Math.round(words / 100) * 100 : Math.round(words / 10) * 10;
  return rounded.toLocaleString();
}
