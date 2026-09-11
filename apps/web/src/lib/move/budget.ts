import { MoveError, object, text } from "./model";

export const expenseCategories = {
  movers: "Moving services",
  truck: "Truck rental",
  supplies: "Packing supplies",
  storage: "Storage",
  travel: "Travel",
  housing: "Housing & move-in",
  cleaning: "Cleaning",
  utilities: "Utilities",
  other: "Other",
} as const;
export type ExpenseCategory = keyof typeof expenseCategories;
export type MoveExpense = {
  id: string;
  title: string;
  category: ExpenseCategory;
  kind: "cost" | "deposit";
  currency: "USD";
  estimatedCents: number | null;
  actualCents: number | null;
  paid: boolean;
  notes: string;
  revision: number;
};

// Convert decimal input directly to integer cents. Blank means unknown, not zero.
export function parseMoney(value: unknown): number | null {
  if (typeof value !== "string")
    throw new MoveError("Enter an amount in dollars and cents.");
  const amount = value.trim();
  if (!amount) return null;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(amount))
    throw new MoveError(
      "Use a positive USD amount or zero, up to 9,999,999.99, with no commas or currency symbol.",
    );
  const [dollars, cents = ""] = amount.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}
export function moneyInput(cents: number | null) {
  return cents === null
    ? ""
    : `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
export function formatMoney(cents: number | null) {
  return cents === null
    ? "Not entered"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cents / 100);
}
export function patchExpense(expense: MoveExpense, raw: unknown): MoveExpense {
  const value = object(raw);
  const next = { ...expense, revision: expense.revision + 1 };
  if (value.title !== undefined) next.title = text(value.title, 180, true);
  if (value.notes !== undefined) next.notes = text(value.notes, 1500);
  if (value.category !== undefined) {
    if (
      typeof value.category !== "string" ||
      !Object.hasOwn(expenseCategories, value.category)
    )
      throw new MoveError("Choose a valid cost category.");
    next.category = value.category as ExpenseCategory;
  }
  if (value.kind !== undefined) {
    if (value.kind !== "cost" && value.kind !== "deposit")
      throw new MoveError("Choose an expense or a refundable deposit.");
    next.kind = value.kind;
  }
  if (value.currency !== undefined && value.currency !== "USD")
    throw new MoveError("This version supports USD only.");
  if (value.estimate !== undefined)
    next.estimatedCents = parseMoney(value.estimate);
  if (value.actual !== undefined) next.actualCents = parseMoney(value.actual);
  if (value.paid !== undefined) {
    if (typeof value.paid !== "boolean")
      throw new MoveError("Choose whether this item is paid.");
    next.paid = value.paid;
  }
  if (next.paid && next.actualCents === null)
    throw new MoveError("Enter the actual amount before marking an item paid.");
  return next;
}

export function summarizeExpenses(items: MoveExpense[]) {
  const entered = (field: "estimatedCents" | "actualCents") => {
    const values = items
      .map((item) => item[field])
      .filter((v): v is number => v !== null);
    return {
      amount: values.length
        ? values.reduce((sum, value) => sum + value, 0)
        : null,
      missing: items.length - values.length,
    };
  };
  const estimate = entered("estimatedCents"),
    actual = entered("actualCents");
  const paidCents = items.reduce(
    (sum, item) => sum + (item.paid ? (item.actualCents ?? 0) : 0),
    0,
  );
  let outstandingActual = 0,
    outstandingEstimate = 0,
    unknownUnpaid = 0;
  for (const item of items.filter((item) => !item.paid)) {
    if (item.actualCents !== null) outstandingActual += item.actualCents;
    else if (item.estimatedCents !== null)
      outstandingEstimate += item.estimatedCents;
    else unknownUnpaid += 1;
  }
  const comparable = items.filter(
    (item) => item.estimatedCents !== null && item.actualCents !== null,
  );
  const difference = comparable.length
    ? comparable.reduce(
        (sum, item) => sum + item.actualCents! - item.estimatedCents!,
        0,
      )
    : null;
  return {
    estimate,
    actual,
    paidCents,
    outstandingActual,
    outstandingEstimate,
    unknownUnpaid,
    difference,
    comparedCount: comparable.length,
  };
}
