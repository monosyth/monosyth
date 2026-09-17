"use client";
import { useState, type FormEvent } from "react";
import { emptySetup, type MoveSetup } from "@/lib/move/model";
import { CityInput } from "./city-input";
import styles from "./planner.module.css";

export function SetupForm({
  onPreview,
  busy = false,
  initialSetup = emptySetup,
  editing = false,
  onCancel,
}: {
  initialSetup?: MoveSetup;
  editing?: boolean;
  onCancel?: () => void;
  onPreview: (setup: MoveSetup) => void;
  busy?: boolean;
}) {
  const [setup, setSetup] = useState<MoveSetup>(initialSetup);
  function field<K extends keyof MoveSetup>(key: K, value: MoveSetup[K]) {
    setSetup((s) => ({ ...s, [key]: value }));
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    onPreview(setup);
  }
  return (
    <form className={styles.panel} onSubmit={submit}>
      <fieldset className={styles.setupFields} disabled={busy}>
      <p className={styles.kicker}>{editing ? "Your move / Details" : "01 / Your move"}</p>
      <h1>{editing ? "Edit move details" : "Where does your next chapter begin?"}</h1>
      <p className={styles.muted}>
        {editing
          ? "Update what has changed, then review the effect on your checklist before saving. Leave cities or the date blank if you’re still deciding."
          : "A few details make the checklist yours. Leave cities or the date blank if you’re still deciding."}
      </p>
      <div className={styles.grid}>
        <CityInput label="Moving from" value={setup.origin} onChange={(value) => field("origin", value)} />
        <CityInput label="Moving to" value={setup.destination} onChange={(value) => field("destination", value)} />
        <label>
          Target move date
          <input
            type="date"
            value={setup.date}
            min="2000-01-01"
            max="2100-12-31"
            onChange={(e) => field("date", e.target.value)}
          />
          <small>Suggested dates can be changed later.</small>
        </label>
        <label>
          How will you move?
          <select
            value={setup.transport}
            onChange={(e) =>
              field("transport", e.target.value as MoveSetup["transport"])
            }
          >
            <option value="undecided">Still deciding</option>
            <option value="movers">Hire movers</option>
            <option value="diy">Move it myself</option>
          </select>
        </label>
        <label>
          Your current home
          <select
            value={setup.leaving}
            onChange={(e) =>
              field("leaving", e.target.value as MoveSetup["leaving"])
            }
          >
            <option value="undecided">Other / not sure</option>
            <option value="rent">I rent</option>
            <option value="own">I own</option>
          </select>
        </label>
        <label>
          Your next home
          <select
            value={setup.arriving}
            onChange={(e) =>
              field("arriving", e.target.value as MoveSetup["arriving"])
            }
          >
            <option value="undecided">Still deciding</option>
            <option value="rent">I’ll rent</option>
            <option value="own">I’ll own</option>
          </select>
        </label>
      </div>
      <fieldset className={styles.options}>
        <legend>Anything else to plan for?</legend>
        {(
          [
            ["pets", "Pets"],
            ["storage", "Storage"],
            ["temporary", "Temporary housing"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={setup[key]}
              onChange={(e) => field(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div className={styles.actions}>
        <button className={styles.primary} disabled={busy}>
          {editing ? "Review changes" : "Preview my plan"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>}
      </div>
      <p className={styles.fine}>
        {editing ? "Nothing changes until you review and save." : "No account needed to preview. Sign in when you’re ready to save."}
      </p>
      <p className={styles.fine}>
        City data from <a href="https://www.geonames.org/">GeoNames</a>, adapted under{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
      </p>
      </fieldset>
    </form>
  );
}
