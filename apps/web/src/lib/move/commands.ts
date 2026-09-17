import { patchContact, type MoveContact } from "./contacts";
import { patchExpense, type MoveExpense } from "./budget";
import {
  MoveError,
  generateTasks,
  isDate,
  object,
  parseSetup,
  patchTask,
  reschedule,
  reviewSetupChange,
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
      contacts: [],
      notes: "",
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
  let contacts = current.contacts ?? [];
  let notes = current.notes ?? "";
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
  } else if (command.type === "setup") {
    setup = parseSetup(command.setup);
    tasks = reviewSetupChange(current, setup).tasks;
    if (tasks.length > 100)
      throw new MoveError("These details would exceed the 100-task limit. Your saved move has not changed.");
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
  } else if (command.type === "contact-add") {
    if (contacts.length >= 50)
      throw new MoveError("This version supports up to 50 contacts per move.");
    const id = text(command.id, 100, true);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || contacts.some((item) => item.id === id))
      throw new MoveError("Please try adding this contact again.");
    const initial: MoveContact = {
      id,
      name: "",
      company: "",
      role: "other",
      phone: "",
      email: "",
      notes: "",
      movingDay: false,
      revision: 0,
    };
    const contact = patchContact(initial, command.patch);
    if (!contact.name) throw new MoveError("Give the contact a name.");
    contacts = [...contacts, contact];
  } else if (
    command.type === "contact-update" ||
    command.type === "contact-delete"
  ) {
    const id = text(command.id, 100, true);
    if (!contacts.some((item) => item.id === id))
      throw new MoveError(
        "That contact no longer exists. Reload your plan.",
        404,
      );
    contacts =
      command.type === "contact-delete"
        ? contacts.filter((item) => item.id !== id)
        : contacts.map((item) =>
            item.id === id ? patchContact(item, command.patch) : item,
          );
  } else if (command.type === "notes") {
    notes = text(command.notes, 2000);
  } else throw new MoveError("This change is not supported.");
  return {
    id: current.id,
    setup,
    tasks,
    expenses,
    contacts,
    notes,
    revision: current.revision + 1,
    updatedAt: now,
  };
}
