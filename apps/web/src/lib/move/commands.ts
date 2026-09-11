import { patchExpense, type MoveExpense } from "./budget";
import {
  MoveError,
  generateTasks,
  isDate,
  object,
  parseSetup,
  patchTask,
  reschedule,
  text,
  type MovePlan,
  type MoveTask,
} from "./model";

export function applyCommand(
  current: MovePlan | null,
  input: unknown,
  now = new Date().toISOString(),
): MovePlan | null {
  const command = object(input);
  if (command.type === "create") {
    if (current)
      throw new MoveError(
        "You already have a saved move. Reload to open it.",
        409,
      );
    const setup = parseSetup(command.setup);
    return {
      id: crypto.randomUUID(),
      setup,
      tasks: generateTasks(setup),
      expenses: [],
      revision: 1,
      updatedAt: now,
    };
  }
  if (!current)
    throw new MoveError("No saved move was found. Create a plan first.", 404);
  if (command.planId !== current.id || command.revision !== current.revision)
    throw new MoveError(
      "Your plan changed in another tab or device. Reload the latest plan before editing.",
      409,
    );
  if (command.type === "delete") return null;
  let expenses = current.expenses ?? [];
  let tasks = current.tasks;
  let setup = current.setup;
  if (command.type === "task") {
    const id = text(command.id, 100, true);
    if (!tasks.some((t) => t.id === id))
      throw new MoveError("That task no longer exists. Reload your plan.", 404);
    tasks = tasks.map((t) => (t.id === id ? patchTask(t, command.patch) : t));
  } else if (command.type === "add") {
    if (tasks.length >= 100)
      throw new MoveError(
        "This early version supports up to 100 tasks per move.",
      );
    const id = text(command.id, 100, true);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || tasks.some((t) => t.id === id))
      throw new MoveError("Please try adding this task again.");
    const patch = object(command.patch);
    const task: MoveTask = {
      id,
      title: "",
      detail: "",
      category: "Your tasks",
      offset: 0,
      due: "",
      manualDate: true,
      status: "todo",
      custom: true,
      revision: 0,
    };
    const next = patchTask(task, patch);
    if (!next.title) throw new MoveError("Give the task a name.");
    tasks = [...tasks, next];
  } else if (command.type === "date") {
    if (command.date !== "" && !isDate(command.date))
      throw new MoveError("Choose a valid date, or leave it blank.");
    setup = { ...setup, date: command.date as string };
    tasks = reschedule(tasks, setup.date);
  } else if (command.type === "expense-add") {
    if (expenses.length >= 100)
      throw new MoveError(
        "This version supports up to 100 budget items per move.",
      );
    const id = text(command.id, 100, true);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || expenses.some((item) => item.id === id))
      throw new MoveError("Please try adding this item again.");
    const initial: MoveExpense = {
      id,
      title: "",
      category: "other",
      kind: "cost",
      currency: "USD",
      estimatedCents: null,
      actualCents: null,
      paid: false,
      notes: "",
      revision: 0,
    };
    const expense = patchExpense(initial, command.patch);
    if (!expense.title) throw new MoveError("Give the budget item a name.");
    expenses = [...expenses, expense];
  } else if (
    command.type === "expense-update" ||
    command.type === "expense-delete"
  ) {
    const id = text(command.id, 100, true);
    if (!expenses.some((item) => item.id === id))
      throw new MoveError(
        "That budget item no longer exists. Reload your plan.",
        404,
      );
    expenses =
      command.type === "expense-delete"
        ? expenses.filter((item) => item.id !== id)
        : expenses.map((item) =>
            item.id === id ? patchExpense(item, command.patch) : item,
          );
  } else throw new MoveError("This change is not supported.");
  return {
    id: current.id,
    setup,
    tasks,
    expenses,
    revision: current.revision + 1,
    updatedAt: now,
  };
}
