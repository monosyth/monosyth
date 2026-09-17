"use client";
import { useEffect, useRef, useState } from "react";
import { formatDate, parseSetup, reviewSetupChange, type MovePlan, type MoveSetup, type MoveTask } from "@/lib/move/model";
import { SetupForm } from "./setup-form";
import styles from "./planner.module.css";

const labels: Record<keyof MoveSetup, string> = {
  origin: "Moving from", destination: "Moving to", date: "Target move date",
  leaving: "Current home", arriving: "Next home", transport: "How you’ll move",
  pets: "Pets", storage: "Storage", temporary: "Temporary housing",
};
function displayValue(key: keyof MoveSetup, setup: MoveSetup): string {
  const value = setup[key];
  if (key === "date") return formatDate(value as string);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "leaving" || key === "arriving")
    return { rent: "Rent", own: "Own", undecided: "Not sure yet" }[value as MoveSetup["leaving"]];
  if (key === "transport")
    return { movers: "Hire movers", diy: "Move it myself", undecided: "Still deciding" }[value as MoveSetup["transport"]];
  return value || "Undecided";
}
function TaskChanges({ title, tasks, description }: { title: string; tasks: MoveTask[]; description: string }) {
  if (!tasks.length) return null;
  return <section className={styles.reviewGroup}>
    <h2>{title} <span className={styles.muted}>({tasks.length})</span></h2>
    <p className={styles.muted}>{description}</p>
    <ul>{tasks.map((task) => <li key={task.id}>{task.title}</li>)}</ul>
  </section>;
}

export function EditMoveDetails({ plan, busy, onCancel, onSave }: {
  plan: MovePlan;
  busy: boolean;
  onCancel: () => void;
  onSave: (setup: MoveSetup) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(plan.setup);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start" });
  }, [reviewing]);
  const changes = reviewSetupChange(plan, draft);
  const fields = (Object.keys(labels) as (keyof MoveSetup)[]).filter((key) => draft[key] !== plan.setup[key]);
  const overLimit = changes.tasks.length > 100;
  const noTaskChanges = !changes.added.length && !changes.skipped.length && !changes.restored.length && !changes.dates.length;

  return <div ref={heading} tabIndex={-1} aria-label={reviewing ? "Review your changes" : "Edit move details"} className={styles.detailsEditor}>
    {error && <p className={`${styles.banner} ${styles.error}`} role="alert">{error}</p>}
    {!reviewing ? <SetupForm
      initialSetup={draft}
      editing
      busy={busy}
      onCancel={onCancel}
      onPreview={(value) => {
        try {
          setDraft(parseSetup(value));
          setError("");
          setReviewing(true);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Check your move details and try again.");
        }
      }}
    /> : <section className={styles.panel} aria-labelledby="review-details-heading">
      <p className={styles.kicker}>Your move / Review</p>
      <h1 id="review-details-heading">Review your changes</h1>
      <p className={styles.muted}>Your saved move stays as it is until you choose Save changes.</p>
      {fields.length ? <dl className={styles.detailChanges}>
        {fields.map((key) => <div key={key}>
          <dt>{labels[key]}</dt>
          <dd><span className={styles.muted}>{displayValue(key, plan.setup)}</span><span aria-hidden="true"> → </span><span className={styles.visuallyHidden}> changes to </span><strong>{displayValue(key, draft)}</strong></dd>
        </div>)}
      </dl> : <p className={styles.banner}>No details have changed. Go back to edit, or cancel to return to your plan.</p>}
      <TaskChanges title="Add to your checklist" tasks={changes.added} description="Suggested tasks for your updated choices" />
      <TaskChanges title="Move to Skipped" tasks={changes.skipped} description="These unedited suggestions no longer fit. They stay in Skipped and can be restored." />
      <TaskChanges title="Bring back to your checklist" tasks={changes.restored} description="These tasks were skipped by an earlier details change and now apply again. Tasks you skipped yourself stay skipped." />
      <TaskChanges title="Keep your customized tasks" tasks={changes.kept} description="These no longer match your choices, but you edited or pinned them. They will stay as they are; you can skip them later if needed." />
      {!!changes.dates.length && <section className={styles.reviewGroup}>
        <h2>Adjust suggested dates <span className={styles.muted}>({changes.dates.length})</span></h2>
        <ul>{changes.dates.map((task) => <li key={task.id}><strong>{task.title}</strong><br />{formatDate(task.before)} → {formatDate(task.after)}</li>)}</ul>
      </section>}
      {fields.length > 0 && noTaskChanges && <p className={styles.banner}>Your details will change. No tasks or task dates need to change.</p>}
      <p className={styles.fine}>Completed tasks, custom tasks, manually edited deadlines, budget items, contacts, and notes are kept. No tasks are deleted.</p>
      {overLimit && <p className={`${styles.banner} ${styles.error}`} role="alert">These changes would exceed the 100-task limit. Go back and adjust your choices. Your saved move has not changed.</p>}
      <div className={`${styles.actions} ${styles.section}`}>
        <button className={styles.primary} disabled={busy || !fields.length || overLimit} onClick={() => void onSave(draft)}>{busy ? "Saving changes…" : "Save changes"}</button>
        <button disabled={busy} onClick={() => setReviewing(false)}>Back to editing</button>
        <button disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </section>}
  </div>;
}
