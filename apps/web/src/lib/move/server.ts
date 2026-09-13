import type { MoveContact } from "./contacts";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { applyCommand } from "./commands";
import type { MoveExpense } from "./budget";
import type { MovePlan, MoveTask } from "./model";

// Clients have no Firestore access to this collection. Only this authenticated API uses it.
export async function accessPlan(
  uid: string,
  command?: unknown,
): Promise<MovePlan | null> {
  const db = getFirebaseAdminDb();
  const ref = db
    .collection("movemorrowUsers")
    .doc(uid)
    .collection("moves")
    .doc("current");
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const taskDocs = await transaction.get(ref.collection("tasks"));
    const expenseDocs = await transaction.get(ref.collection("expenses"));
    const contactDocs = await transaction.get(ref.collection("contacts"));
    const data = snapshot.data();
    const current: MovePlan | null = data
      ? {
          id: data.id,
          setup: data.setup,
          revision: data.revision,
          updatedAt: data.updatedAt,
          notes: data.notes ?? "",
          contacts: contactDocs.docs
            .map((d) => d.data() as MoveContact)
            .sort((a, b) => a.id.localeCompare(b.id)),
          expenses: expenseDocs.docs
            .map((d) => d.data() as MoveExpense)
            .sort((a, b) => a.id.localeCompare(b.id)),
          tasks: taskDocs.docs
            .map((d) => d.data() as MoveTask)
            .sort((a, b) => a.offset - b.offset || a.id.localeCompare(b.id)),
        }
      : null;
    if (command === undefined) return current;
    const next = applyCommand(current, command);
    if (!next) {
      for (const task of taskDocs.docs) transaction.delete(task.ref);
      for (const expense of expenseDocs.docs) transaction.delete(expense.ref);
      for (const contact of contactDocs.docs) transaction.delete(contact.ref);
      transaction.delete(ref);
      return null;
    }
    transaction.set(ref, {
      id: next.id,
      setup: next.setup,
      revision: next.revision,
      updatedAt: next.updatedAt,
      notes: next.notes,
      schemaVersion: 3,
    });
    const previous = new Map(current?.tasks.map((t) => [t.id, t]));
    for (const task of next.tasks) {
      if (task.revision !== previous.get(task.id)?.revision)
        transaction.set(ref.collection("tasks").doc(task.id), task);
    }
    const previousExpenses = new Map(
      current?.expenses.map((item) => [item.id, item]),
    );
    const nextIds = new Set(next.expenses.map((item) => item.id));
    for (const expense of expenseDocs.docs)
      if (!nextIds.has(expense.id)) transaction.delete(expense.ref);
    for (const expense of next.expenses)
      if (expense.revision !== previousExpenses.get(expense.id)?.revision)
        transaction.set(ref.collection("expenses").doc(expense.id), expense);
    const previousContacts = new Map(
      current?.contacts.map((item) => [item.id, item]),
    );
    const nextContactIds = new Set(next.contacts.map((item) => item.id));
    for (const contact of contactDocs.docs)
      if (!nextContactIds.has(contact.id)) transaction.delete(contact.ref);
    for (const contact of next.contacts)
      if (contact.revision !== previousContacts.get(contact.id)?.revision)
        transaction.set(ref.collection("contacts").doc(contact.id), contact);
    return next;
  });
}
