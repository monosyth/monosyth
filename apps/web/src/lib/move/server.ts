import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { applyCommand } from "./commands";
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
    const data = snapshot.data();
    const current: MovePlan | null = data
      ? {
          id: data.id,
          setup: data.setup,
          revision: data.revision,
          updatedAt: data.updatedAt,
          tasks: taskDocs.docs
            .map((d) => d.data() as MoveTask)
            .sort((a, b) => a.offset - b.offset || a.id.localeCompare(b.id)),
        }
      : null;
    if (command === undefined) return current;
    const next = applyCommand(current, command);
    if (!next) {
      for (const task of taskDocs.docs) transaction.delete(task.ref);
      transaction.delete(ref);
      return null;
    }
    transaction.set(ref, {
      id: next.id,
      setup: next.setup,
      revision: next.revision,
      updatedAt: next.updatedAt,
      schemaVersion: 1,
    });
    const previous = new Map(current?.tasks.map((t) => [t.id, t]));
    for (const task of next.tasks) {
      if (task.revision !== previous.get(task.id)?.revision)
        transaction.set(ref.collection("tasks").doc(task.id), task);
    }
    return next;
  });
}
