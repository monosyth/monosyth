"use client";
import { useState, type FormEvent } from "react";
import {
  expenseCategories,
  formatMoney,
  moneyInput,
  parseMoney,
  summarizeExpenses,
  type ExpenseCategory,
  type MoveExpense,
} from "@/lib/move/budget";
import styles from "./planner.module.css";

type Command = Record<string, unknown>;
type Save = (command: Command) => Promise<boolean>;

export function BudgetPlanner({
  expenses,
  busy,
  onChange,
}: {
  expenses: MoveExpense[];
  busy: boolean;
  onChange: Save;
}) {
  const [adding, setAdding] = useState(false);
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const costs = expenses.filter((item) => item.kind === "cost");
  const deposits = expenses.filter((item) => item.kind === "deposit");
  return (
    <section aria-labelledby="budget-heading" className={styles.section}>
      <div className={styles.topline}>
        <div>
          <p className={styles.kicker}>Your moving budget / USD</p>
          <h2 id="budget-heading">
            Know what’s quoted, spent, and still to pay
          </h2>
          <p className={styles.muted}>
            Add your own amounts as you learn them. Blank amounts stay unknown;
            enter 0 only when you know there is no cost.
          </p>
        </div>
        <button
          className={styles.primary}
          disabled={busy || adding || expenses.length >= 100}
          onClick={() => setAdding(true)}
        >
          Add budget item
        </button>
      </div>
      <div className={styles.budgetColumns}>
        <BudgetSummary items={costs} title="Moving expenses" />
        <BudgetSummary items={deposits} title="Refundable deposits" deposits />
      </div>
      <p className={styles.fine}>
        Refundable deposits are shown separately because you may get them back.
        A mover’s advance payment toward its final bill belongs in that expense,
        not in refundable deposits. Paid means paid in full; partial payments
        and deposit refunds are not tracked yet.
      </p>
      {adding && (
        <div className={styles.section}>
          <ExpenseForm
            busy={busy}
            onCancel={() => setAdding(false)}
            onSave={async (patch) => {
              const saved = await onChange({
                type: "expense-add",
                id: `expense-${crypto.randomUUID()}`,
                patch,
              });
              if (saved) setAdding(false);
              return saved;
            }}
          />
        </div>
      )}
      <div className={`${styles.actions} ${styles.section}`}>
        <button
          aria-pressed={!unpaidOnly}
          className={!unpaidOnly ? styles.active : ""}
          onClick={() => setUnpaidOnly(false)}
        >
          All budget items
        </button>
        <button
          aria-pressed={unpaidOnly}
          className={unpaidOnly ? styles.active : ""}
          onClick={() => setUnpaidOnly(true)}
        >
          Unpaid only
        </button>
        <span className={styles.fine}>Totals above include all items.</span>
      </div>
      {[
        { title: "Moving expenses", items: costs },
        { title: "Refundable deposits", items: deposits },
      ].map((group) => {
        const visible = group.items
          .filter((item) => !unpaidOnly || !item.paid)
          .sort((a, b) => a.title.localeCompare(b.title));
        return (
          <section
            key={group.title}
            className={styles.section}
            aria-label={group.title}
          >
            <h3>{group.title}</h3>
            {visible.length ? (
              <ul className={styles.list}>
                {visible.map((item) => (
                  <li key={item.id}>
                    <ExpenseCard
                      expense={item}
                      busy={busy}
                      onChange={onChange}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>
                {group.items.length
                  ? "No unpaid items in this group."
                  : "No items added yet. Add an item when you have something to plan for—even if the amount is still unknown."}
              </p>
            )}
          </section>
        );
      })}
    </section>
  );
}
function BudgetSummary({
  items,
  title,
  deposits = false,
}: {
  items: MoveExpense[];
  title: string;
  deposits?: boolean;
}) {
  const summary = summarizeExpenses(items);
  return (
    <section className={styles.panel} aria-label={`${title} totals`}>
      <h3>{title}</h3>
      <dl className={styles.budgetStats}>
        <div>
          <dt>Estimates entered</dt>
          <dd>{formatMoney(summary.estimate.amount)}</dd>
          <small>
            {summary.estimate.missing
              ? `${summary.estimate.missing} without an estimate`
              : `${items.length} items`}
          </small>
        </div>
        <div>
          <dt>Actual amounts entered</dt>
          <dd>{formatMoney(summary.actual.amount)}</dd>
          <small>
            {summary.actual.missing
              ? `${summary.actual.missing} without an actual amount`
              : `${items.length} items`}
          </small>
        </div>
        <div>
          <dt>{deposits ? "Deposits paid" : "Paid in full"}</dt>
          <dd>{formatMoney(summary.paidCents)}</dd>
          <small>
            {deposits ? "Before any refunds" : "Actual amounts marked paid"}
          </small>
        </div>
        <div>
          <dt>Known unpaid amounts</dt>
          <dd>{formatMoney(summary.outstandingActual)}</dd>
          <small>
            Plus {formatMoney(summary.outstandingEstimate)} in unpaid estimates
            {summary.unknownUnpaid > 0
              ? `; ${summary.unknownUnpaid} unpaid with no amount yet`
              : ""}
          </small>
        </div>
      </dl>
      {summary.difference !== null && (
        <p className={styles.fine}>
          {summary.difference === 0
            ? "Actual matches estimates"
            : `Actual is ${formatMoney(Math.abs(summary.difference))} ${summary.difference > 0 ? "over" : "under"} estimates`}{" "}
          across {summary.comparedCount}{" "}
          {summary.comparedCount === 1 ? "item" : "items"} with both amounts
          entered.
        </p>
      )}
    </section>
  );
}
function ExpenseCard({
  expense,
  busy,
  onChange,
}: {
  expense: MoveExpense;
  busy: boolean;
  onChange: Save;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  if (editing)
    return (
      <ExpenseForm
        initial={expense}
        busy={busy}
        onCancel={() => setEditing(false)}
        onSave={async (patch) => {
          const saved = await onChange({
            type: "expense-update",
            id: expense.id,
            patch,
          });
          if (saved) setEditing(false);
          return saved;
        }}
      />
    );
  return (
    <article className={styles.task}>
      <div className={styles.topline}>
        <div>
          <h3 className={styles.taskTitle}>{expense.title}</h3>
          <p className={styles.muted}>
            {expenseCategories[expense.category]} ·{" "}
            {expense.paid ? "Paid in full" : "Unpaid"}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            disabled={busy}
            onClick={() => setEditing(true)}
            aria-label={`Edit ${expense.title}`}
          >
            Edit
          </button>
          <button
            disabled={busy || (!expense.paid && expense.actualCents === null)}
            onClick={() =>
              void onChange({
                type: "expense-update",
                id: expense.id,
                patch: { paid: !expense.paid },
              })
            }
            aria-label={`${expense.paid ? "Mark unpaid" : "Mark paid"}: ${expense.title}`}
          >
            {expense.paid ? "Mark unpaid" : "Mark paid"}
          </button>
        </div>
      </div>
      <dl className={styles.budgetStats}>
        <div>
          <dt>Estimate</dt>
          <dd>{formatMoney(expense.estimatedCents)}</dd>
        </div>
        <div>
          <dt>Actual</dt>
          <dd>{formatMoney(expense.actualCents)}</dd>
        </div>
      </dl>
      {expense.actualCents === null && (
        <p className={styles.fine}>
          Enter the actual amount before marking this item paid.
        </p>
      )}
      {expense.notes && <p className={styles.budgetNotes}>{expense.notes}</p>}
      {!removing ? (
        <button
          className={styles.removeItem}
          disabled={busy}
          onClick={() => setRemoving(true)}
          aria-label={`Remove ${expense.title}`}
        >
          Remove item
        </button>
      ) : (
        <div className={`${styles.banner} ${styles.section}`}>
          <p>
            Remove “{expense.title}” from this budget? This cannot be undone.
          </p>
          <div className={styles.actions}>
            <button
              className={styles.danger}
              disabled={busy}
              onClick={() =>
                void onChange({ type: "expense-delete", id: expense.id })
              }
            >
              Remove permanently
            </button>
            <button disabled={busy} onClick={() => setRemoving(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
function ExpenseForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial?: MoveExpense;
  busy: boolean;
  onSave: (patch: Command) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(
    initial?.category ?? "movers",
  );
  const [kind, setKind] = useState<"cost" | "deposit">(initial?.kind ?? "cost");
  const [estimate, setEstimate] = useState(
    moneyInput(initial?.estimatedCents ?? null),
  );
  const [actual, setActual] = useState(
    moneyInput(initial?.actualCents ?? null),
  );
  const [paid, setPaid] = useState(initial?.paid ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      parseMoney(estimate);
      const amount = parseMoney(actual);
      if (paid && amount === null)
        throw new Error(
          "Enter the actual amount before marking this item paid.",
        );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check your amounts.");
      return;
    }
    await onSave({ title, category, kind, estimate, actual, paid, notes });
  }
  return (
    <form
      className={`${styles.panel} ${styles.budgetEditor}`}
      onSubmit={submit}
    >
      <h3>{initial ? `Edit ${initial.title}` : "Add a budget item"}</h3>
      <p className={styles.fine}>
        Amounts in USD, with up to two decimal places. Leave unknown amounts
        blank.
      </p>
      {error && (
        <p className={`${styles.banner} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={busy}>
        <div className={styles.grid}>
          <label>
            Item name
            <input
              required
              maxLength={180}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="For example, moving company"
            />
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {Object.entries(expenseCategories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "cost" | "deposit")}
            >
              <option value="cost">Moving expense</option>
              <option value="deposit">Refundable deposit</option>
            </select>
          </label>
          <label>
            Estimate (USD)
            <input
              inputMode="decimal"
              maxLength={10}
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              placeholder="Not entered"
            />
          </label>
          <label>
            Actual amount (USD)
            <input
              inputMode="decimal"
              maxLength={10}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="Not entered"
            />
          </label>
        </div>
        <label className={styles.paidOption}>
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
          Paid in full
        </label>
        <label>
          Notes (optional)
          <textarea
            value={notes}
            maxLength={1500}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Quote details or a reminder"
          />
        </label>
        <div className={styles.actions}>
          <button className={styles.primary} disabled={!title.trim()}>
            {initial ? "Save changes" : "Save budget item"}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
