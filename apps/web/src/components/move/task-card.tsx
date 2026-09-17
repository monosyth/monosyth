"use client";
import { useState, type FormEvent } from "react";
import { formatDate, type MoveTask } from "@/lib/move/model";
import styles from "./planner.module.css";
type Command = Record<string, unknown>;

export function TaskCard({
  task,
  today,
  editable,
  busy,
  onChange,
}: {
  task: MoveTask;
  today: string;
  editable: boolean;
  busy: boolean;
  onChange: (patch: Command) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(task.title);
  const [detail, setDetail] = useState(task.detail);
  const [due, setDue] = useState(task.due);
  const [editing, setEditing] = useState(false);
  function openEditor() {
    setTitle(task.title);
    setDetail(task.detail);
    setDue(task.due);
    setEditing(true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const patch: Command = { title, detail };
    if (due !== task.due) patch.due = due;
    if (await onChange(patch)) setEditing(false);
  }
  return (
    <article
      className={`${styles.task} ${task.status === "done" ? styles.complete : ""}`}
    >
      <div className={styles.taskTop}>
        <label>
          {editable && (
            <input
              type="checkbox"
              checked={task.status === "done"}
              disabled={busy}
              onChange={(e) =>
                void onChange({ status: e.target.checked ? "done" : "todo" })
              }
              aria-label={`Complete: ${task.title}`}
            />
          )}
          <span className={styles.taskTitle}>{task.title}</span>
        </label>
        {editable && (
          <button
            onClick={() =>
              void onChange({
                status: task.status === "skipped" ? "todo" : "skipped",
              })
            }
            disabled={busy}
          >
            {task.status === "skipped" ? "Restore" : "Skip"}
          </button>
        )}
      </div>
      <div className={styles.taskMeta}>
        <span>{task.category}</span>
        <span
          className={
            task.status === "todo" && task.due && today && task.due < today
              ? styles.overdue
              : ""
          }
        >
          {formatDate(task.due)}
          {task.status === "todo" && task.due && today && task.due < today
            ? " · past suggested date"
            : ""}
        </span>
        <span>
          {task.status === "skipped"
            ? task.setupSkipped ? "Skipped after details changed" : "Skipped"
            : task.manualDate
              ? "Your date"
              : "Suggested"}
        </span>
      </div>
      <details>
        <summary>Details{editable ? " & edit" : ""}</summary>
        <p>{task.detail}</p>
        {editable && (
          <label className={styles.paidOption}>
            <input
              type="checkbox"
              checked={Boolean(task.movingDay)}
              disabled={busy}
              onChange={(e) => void onChange({ movingDay: e.target.checked })}
            />
            Pin to moving day
          </label>
        )}
        {editable && !editing && (
          <button onClick={openEditor} disabled={busy}>
            Edit task
          </button>
        )}
        {editing && (
          <form onSubmit={save} className={styles.taskForm}>
            <label>
              Task name
              <input
                disabled={busy}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={180}
              />
            </label>
            <label>
              Notes
              <textarea
                disabled={busy}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={1500}
              />
            </label>
            <label>
              Due date
              <input
                disabled={busy}
                type="date"
                value={due}
                min="2000-01-01"
                max="2100-12-31"
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
            <div className={styles.actions}>
              <button className={styles.primary} disabled={busy}>
                Save task
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </details>
    </article>
  );
}
