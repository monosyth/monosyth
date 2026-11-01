"use client";

import { useEffect, useState } from "react";

import { parseIngredientLine } from "@/lib/kitchen/ingredients";
import type { Recipe } from "@/lib/kitchen/types";

type Props = {
  recipe: Recipe;
  onClose: () => void;
  onAddToWeek: () => void;
  onChange: (recipe: Recipe) => void;
  onDelete: () => void;
};

export function RecipeSheet({ recipe, onClose, onAddToWeek, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(recipe.title);
  const lines = [...new Set(recipe.ingredients.map(i => i.raw))];
  const [draftLines, setDraftLines] = useState(lines.join("\n"));
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function saveEdits() {
    const lines = draftLines.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    onChange({ ...recipe, title: draftTitle.trim() || recipe.title, ingredients: lines.flatMap(parseIngredientLine) });
    setEditing(false);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={recipe.title} onClick={event => event.stopPropagation()}>
        <div className="sheet-top">
          <button className="btn btn-ghost btn-small" onClick={onClose}>
            ← Back
          </button>
        </div>
        {recipe.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="preview-image" src={recipe.image} alt="" referrerPolicy="no-referrer" onError={e => (e.currentTarget.style.display = "none")} />
        ) : null}

        {editing ? (
          <div className="stack-tight">
            <label className="big-label" htmlFor="edit-title">
              Recipe name
            </label>
            <input id="edit-title" className="input" value={draftTitle} onChange={e => setDraftTitle(e.target.value)} />
            <label className="big-label" htmlFor="edit-lines">
              Ingredients (one per line)
            </label>
            <textarea
              id="edit-lines"
              className="input textarea"
              rows={Math.min(18, Math.max(6, draftLines.split("\n").length + 1))}
              value={draftLines}
              onChange={e => setDraftLines(e.target.value)}
            />
            <div className="button-row">
              <button className="btn btn-block" onClick={saveEdits}>
                Save changes
              </button>
              <button className="btn btn-ghost btn-block" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="preview-title">{recipe.title}</h2>
            <p className="muted small">
              {[recipe.servings, recipe.totalTime].filter(Boolean).join(" · ")}
            </p>
            <div className="button-row">
              <button
                className="btn btn-block"
                onClick={() => {
                  onAddToWeek();
                  setAdded(true);
                }}
              >
                {added ? "✓ Added to this week" : "Add to this week"}
              </button>
              {recipe.url ? (
                <a className="btn btn-ghost btn-block" href={recipe.url} target="_blank" rel="noreferrer">
                  Open original page
                </a>
              ) : null}
            </div>

            <h3>Ingredients</h3>
            <ul className="ingredient-full">
              {lines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
            <button className="link-button" onClick={() => setEditing(true)}>
              Something missing or wrong? Edit ingredients
            </button>

            {recipe.steps.length ? (
              <>
                <h3>Steps</h3>
                <ol className="steps">
                  {recipe.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </>
            ) : null}

            <hr />
            <button
              className="link-button danger"
              onClick={() => {
                if (window.confirm(`Remove “${recipe.title}” from your recipe box?`)) onDelete();
              }}
            >
              Remove from recipe box
            </button>
          </>
        )}
      </div>
    </div>
  );
}
