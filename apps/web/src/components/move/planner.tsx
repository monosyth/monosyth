"use client";
import Link from "next/link";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getMoveAuth, moveGoogleProvider } from "@/lib/move/auth";
import {
  emptySetup,
  formatDate,
  generateTasks,
  progress,
  reschedule,
  shiftDate,
  todayLocal,
  type MovePlan,
  type MoveSetup,
  type MoveTask,
} from "@/lib/move/model";
import { BudgetPlanner } from "./budget";
import { SetupForm } from "./setup-form";
import styles from "./planner.module.css";

type Filter = "next" | "all" | "timeline" | "done" | "skipped";
type Command = Record<string, unknown>;
async function requestPlan(
  user: User,
  command?: Command,
): Promise<MovePlan | null> {
  const token = await user.getIdToken();
  const response = await fetch("/api/move", {
    method: command ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: command ? JSON.stringify(command) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error ?? "Your plan could not be saved. Try again.");
  return body.plan;
}

export function MovePlanner() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [plan, setPlan] = useState<MovePlan | null>(null);
  const [draft, setDraft] = useState<MoveSetup>(emptySetup);
  const [preview, setPreview] = useState<MoveSetup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"checklist" | "budget">("checklist");
  const [filter, setFilter] = useState<Filter>("next");
  const [today, setToday] = useState("");
  const [newDate, setNewDate] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const currentUid = useRef<string | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    const auth = getMoveAuth();
    startTransition(() => {
      setConfigured(Boolean(auth));
      setToday(todayLocal());
      if (!auth) setAuthReady(true);
    });
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      currentUid.current = next?.uid ?? null;
      setUser(next);
      setView("checklist");
      setAuthReady(true);
      setPlan(null);
      setError("");
      setMessage("");
      setLoadFailed(false);
      setCloudLoading(Boolean(next));
      setDeleteOpen(false);
      setDeleteText("");
    });
    const interval = window.setInterval(() => setToday(todayLocal()), 60000);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void requestPlan(user)
      .then((next) => {
        if (cancelled) return;
        setPlan(next);
        setNewDate(next?.setup.date ?? "");
        setCloudLoading(false);
        setLoadFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCloudLoading(false);
        setLoadFailed(true);
        setError(
          "We couldn’t load your saved move. Check your connection and try again. Your saved plan has not been replaced.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [user, reload]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (pending.current) event.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  async function login() {
    const auth = getMoveAuth();
    if (!auth) return;
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(auth, moveGoogleProvider());
    } catch {
      setError(
        "Sign-in wasn’t completed. Allow the Google sign-in window and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    const auth = getMoveAuth();
    if (!auth) return;
    setBusy(true);
    setError("");
    try {
      await signOut(auth);
      setPreview(null);
      setDraft(emptySetup);
    } catch {
      setError("Sign-out didn’t finish. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function refresh() {
    setCloudLoading(true);
    setError("");
    setMessage("");
    setReload((n) => n + 1);
  }
  async function change(command: Command): Promise<boolean> {
    if (!user || pending.current || cloudLoading || loadFailed) return false;
    const uid = user.uid;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await requestPlan(user, {
        ...command,
        planId: plan?.id,
        revision: plan?.revision,
      });
      if (currentUid.current !== uid) return false;
      setPlan(next);
      setNewDate(next?.setup.date ?? "");
      setPreview(null);
      setDraft(emptySetup);
      setMessage(
        next ? "Saved to your account." : "Your saved move was deleted.",
      );
      if (!next) {
        setDraft(emptySetup);
        setDeleteOpen(false);
        setDeleteText("");
      }
      return true;
    } catch (e) {
      if (currentUid.current === uid)
        setError(
          e instanceof Error && e.name !== "TimeoutError"
            ? e.message
            : "Saving took too long. Reload to check whether it completed before trying again.",
        );
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function exportPlan() {
    if (!plan) return;
    const blob = new Blob(
      [
        JSON.stringify(
          { product: "MoveMorrow", schemaVersion: 2, ...plan },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "movemorrow-plan.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const tasks = plan?.tasks ?? (preview ? generateTasks(preview) : []);
  const setup = plan?.setup ?? preview;
  const stats = progress(tasks);
  const overdue = tasks.filter(
    (t) => t.status === "todo" && t.due && today && t.due < today,
  );
  const upcoming = tasks.filter(
    (t) =>
      t.status === "todo" &&
      t.due &&
      today &&
      t.due >= today &&
      t.due <= shiftDate(today, 7),
  );
  const todo = tasks.filter((t) => t.status === "todo");
  const sorted = [...tasks].sort(
    (a, b) =>
      (a.due || "9999").localeCompare(b.due || "9999") ||
      a.offset - b.offset ||
      a.title.localeCompare(b.title),
  );
  let visible = sorted;
  if (plan) {
    if (filter === "next")
      visible = sorted.filter((t) => t.status === "todo").slice(0, 6);
    if (filter === "timeline")
      visible = sorted.filter((t) => t.status === "todo");
    if (filter === "done") visible = sorted.filter((t) => t.status === "done");
    if (filter === "skipped")
      visible = sorted.filter((t) => t.status === "skipped");
  }
  const shifted = plan
    ? reschedule(plan.tasks, newDate).filter(
        (t, i) => t.due !== plan.tasks[i].due,
      )
    : [];
  const locked = busy || cloudLoading || loadFailed;

  return (
    <main className={styles.shell}>
      <a className={styles.skip} href="#planner">
        Skip to your planner
      </a>
      <header className={styles.header}>
        <Link className={styles.brand} href="/move">
          Move<span>Morrow</span>
        </Link>
        <nav aria-label="MoveMorrow">
          <span>Early planner</span>
          <Link href="/move/privacy">Privacy</Link>
          {user ? (
            <>
              <span>{user.displayName?.split(" ")[0] ?? "Your account"}</span>
              <button onClick={() => void logout()} disabled={busy}>
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => void login()}
              disabled={busy || !configured || !authReady}
            >
              Sign in
            </button>
          )}
        </nav>
      </header>
      <div className={styles.content} id="planner">
        <p className={styles.fine}>
          Your checklist, timeline, and moving budget. Shared household planning
          is still to come.
        </p>
        {!configured && (
          <p className={`${styles.banner} ${styles.error}`}>
            Account saving is unavailable right now. You can still preview a
            checklist.
          </p>
        )}
        {error && (
          <div className={`${styles.banner} ${styles.error}`} role="alert">
            <p>{error}</p>
            {user && (
              <button onClick={refresh} disabled={busy || cloudLoading}>
                Reload saved plan
              </button>
            )}
          </div>
        )}
        <div role="status" aria-live="polite">
          {busy ? (
            <p className={styles.banner}>
              Working… Please keep this page open.
            </p>
          ) : message ? (
            <p className={`${styles.banner} ${styles.success}`}>{message}</p>
          ) : null}
        </div>
        {(cloudLoading || !authReady) && (
          <p role="status" className={styles.banner}>
            {cloudLoading
              ? "Loading your saved move…"
              : "Checking your sign-in…"}
          </p>
        )}
        {!cloudLoading && !loadFailed && !setup && (
          <SetupForm
            initialSetup={draft}
            onPreview={(setup) => {
              setDraft(setup);
              setPreview(setup);
            }}
            busy={busy}
          />
        )}
        {!cloudLoading && !loadFailed && setup && (
          <>
            <section className={styles.panel} aria-labelledby="plan-heading">
              <div className={styles.topline}>
                <div>
                  <p className={styles.kicker}>
                    {plan ? "Your move" : "02 / Your plan preview"}
                  </p>
                  <h1 id="plan-heading">
                    {setup.destination
                      ? `Next stop: ${setup.destination}`
                      : "Your next chapter"}
                  </h1>
                  <p className={styles.muted}>
                    {setup.origin || "Origin undecided"} →{" "}
                    {setup.destination || "Destination undecided"}
                    <br />
                    Target move: {formatDate(setup.date)}
                  </p>
                </div>
                {plan && (
                  <div className={styles.actions}>
                    <button onClick={refresh} disabled={locked}>
                      Refresh
                    </button>
                    <button onClick={exportPlan} disabled={locked}>
                      Export plan
                    </button>
                    <button onClick={() => window.print()} disabled={locked}>
                      Print this view
                    </button>
                  </div>
                )}
              </div>
              {!plan ? (
                <>
                  <p>
                    Your checklist includes {tasks.length} tasks based on your
                    move. Suggested dates are planning prompts; confirm lease,
                    building, and provider deadlines yourself.
                  </p>
                  <div className={styles.actions}>
                    {user ? (
                      <button
                        className={styles.primary}
                        disabled={locked}
                        onClick={() =>
                          void change({ type: "create", setup: preview })
                        }
                      >
                        Save my plan
                      </button>
                    ) : (
                      <button
                        className={styles.primary}
                        onClick={() => void login()}
                        disabled={busy || !configured || !authReady}
                      >
                        Sign in with Google to save
                      </button>
                    )}
                    <button onClick={() => setPreview(null)} disabled={busy}>
                      Change details
                    </button>
                  </div>
                  <p className={styles.fine}>
                    Preview only. Nothing is saved until you choose Save my
                    plan. Preview tasks can be edited after saving.{" "}
                    <Link href="/move/privacy">
                      How your information is used
                    </Link>
                  </p>
                </>
              ) : view === "checklist" ? (
                <>
                  <div className={styles.stats}>
                    <p>
                      <strong>
                        {stats.done}/{stats.total}
                      </strong>
                      <br />
                      tasks complete
                    </p>
                    <p>
                      <strong>{overdue.length}</strong>
                      <br />
                      past suggested date
                    </p>
                    <p>
                      <strong>{upcoming.length}</strong>
                      <br />
                      due in 7 days
                    </p>
                  </div>
                  <progress
                    className={styles.progress}
                    value={stats.done}
                    max={stats.total || 1}
                    aria-label={`${stats.done} of ${stats.total} applicable tasks complete`}
                  />
                  <p className={styles.fine}>
                    {todo.length === 0
                      ? "Your applicable tasks are all complete. You can add anything else below."
                      : "Skipped tasks are excluded from progress. Suggested dates can be adjusted."}{" "}
                    Last saved: {formatDate(plan.updatedAt.slice(0, 10))}.
                  </p>
                </>
              ) : (
                <p className={styles.fine}>
                  Last saved: {formatDate(plan.updatedAt.slice(0, 10))}.
                </p>
              )}
            </section>
            {plan && (
              <nav className={styles.tabs} aria-label="Planner sections">
                <button
                  className={view === "checklist" ? styles.active : ""}
                  aria-pressed={view === "checklist"}
                  onClick={() => setView("checklist")}
                >
                  Checklist & timeline
                </button>
                <button
                  className={view === "budget" ? styles.active : ""}
                  aria-pressed={view === "budget"}
                  onClick={() => setView("budget")}
                >
                  Budget
                </button>
              </nav>
            )}
            {plan && (
              <div hidden={view !== "budget"}>
                <BudgetPlanner
                  key={plan.id}
                  expenses={plan.expenses ?? []}
                  busy={locked}
                  onChange={change}
                />
              </div>
            )}
            <div hidden={Boolean(plan) && view !== "checklist"}>
              {plan && (
                <nav className={styles.tabs} aria-label="Checklist views">
                  {(
                    [
                      ["next", "Next up"],
                      ["all", "All tasks"],
                      ["timeline", "Timeline"],
                      ["done", "Completed"],
                      ["skipped", "Skipped"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      className={filter === value ? styles.active : ""}
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              )}
              {!plan && (
                <h2 className={styles.section}>Your tailored checklist</h2>
              )}
              {plan && filter === "next" && (
                <p className={styles.muted}>
                  The next six unfinished tasks, earliest dates first.
                </p>
              )}
              {visible.length ? (
                <ul className={styles.list}>
                  {visible.map((task, index) => (
                    <li key={task.id}>
                      {plan &&
                        filter === "timeline" &&
                        (index === 0 ||
                          task.due !== visible[index - 1].due) && (
                          <h2 className={styles.timelineDate}>
                            {formatDate(task.due)}
                          </h2>
                        )}
                      <TaskCard
                        task={task}
                        today={today}
                        editable={Boolean(plan)}
                        busy={locked}
                        onChange={(patch) =>
                          change({ type: "task", id: task.id, patch })
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.empty}>
                  <h2>
                    {filter === "next" || filter === "timeline"
                      ? "Nothing left in this view."
                      : "No tasks here yet."}
                  </h2>
                  <p>Use All tasks to review your whole checklist.</p>
                </div>
              )}
              {plan && (
                <>
                  <section className={styles.section}>
                    <AddTask
                      busy={locked}
                      onAdd={(patch) =>
                        change({
                          type: "add",
                          id: `custom-${crypto.randomUUID()}`,
                          patch,
                        })
                      }
                    />
                  </section>
                  <section className={`${styles.panel} ${styles.section}`}>
                    <h2>Move date changed?</h2>
                    <p className={styles.muted}>
                      Only unfinished tasks with suggested dates will move.
                      Completed tasks, custom tasks, and dates you edited stay
                      as they are.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void change({ type: "date", date: newDate });
                      }}
                    >
                      <label>
                        New target move date
                        <input
                          type="date"
                          min="2000-01-01"
                          max="2100-12-31"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          disabled={locked}
                        />
                      </label>
                      {newDate !== plan.setup.date && (
                        <div className={styles.datePreview}>
                          <strong>
                            {shifted.length} suggested task dates will change.
                          </strong>
                          <ul>
                            {shifted.map((t) => (
                              <li key={t.id}>
                                {t.title}: {formatDate(t.due)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className={styles.actions}>
                        <button
                          className={styles.primary}
                          disabled={locked || newDate === plan.setup.date}
                        >
                          Apply date change
                        </button>
                      </div>
                    </form>
                  </section>
                </>
              )}
            </div>
            {plan && (
              <>
                <section className={styles.section}>
                  <button
                    className={styles.danger}
                    onClick={() => setDeleteOpen(!deleteOpen)}
                    disabled={locked}
                  >
                    Delete this move
                  </button>
                  {deleteOpen && (
                    <form
                      className={`${styles.panel} ${styles.section}`}
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (deleteText === "DELETE")
                          void change({ type: "delete" });
                      }}
                    >
                      <h2>Delete your saved move?</h2>
                      <p>
                        This removes the move, all its tasks, and all budget
                        items from your account. Export a copy first if you want
                        to keep it. This cannot be undone.
                      </p>
                      <label>
                        Type DELETE to confirm
                        <input
                          value={deleteText}
                          onChange={(e) => setDeleteText(e.target.value)}
                          autoComplete="off"
                        />
                      </label>
                      <div className={styles.actions}>
                        <button
                          className={styles.danger}
                          disabled={locked || deleteText !== "DELETE"}
                        >
                          Permanently delete move
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
      <footer className={styles.footer}>
        <Link href="/move">About MoveMorrow</Link>
        <Link href="/move/privacy">Privacy & your data</Link>
        <Link href="/">By Monosyth Labs</Link>
      </footer>
    </main>
  );
}

function TaskCard({
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
            ? "Skipped"
            : task.manualDate
              ? "Your date"
              : "Suggested"}
        </span>
      </div>
      <details>
        <summary>Details{editable ? " & edit" : ""}</summary>
        <p>{task.detail}</p>
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={180}
              />
            </label>
            <label>
              Notes
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={1500}
              />
            </label>
            <label>
              Due date
              <input
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
function AddTask({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (patch: Command) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await onAdd({ title, due })) {
      setTitle("");
      setDue("");
    }
  }
  return (
    <form className={styles.panel} onSubmit={submit}>
      <h2>Something else to remember?</h2>
      <div className={styles.grid}>
        <label>
          New task
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={180}
            placeholder="Add a task for your move"
          />
        </label>
        <label>
          Due date (optional)
          <input
            type="date"
            value={due}
            min="2000-01-01"
            max="2100-12-31"
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
      </div>
      <button disabled={busy || !title.trim()}>Add task</button>
    </form>
  );
}
