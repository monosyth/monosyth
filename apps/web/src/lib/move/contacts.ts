import { MoveError, object, text, type MovePlan } from "./model";

export const contactRoles = {
  mover: "Moving company",
  truck: "Truck rental",
  property: "Property manager / landlord",
  agent: "Real estate agent",
  utility: "Utility / internet",
  storage: "Storage",
  helper: "Friend / helper",
  other: "Other",
} as const;
export type MoveContact = {
  id: string;
  name: string;
  company: string;
  role: keyof typeof contactRoles;
  phone: string;
  email: string;
  notes: string;
  movingDay: boolean;
  revision: number;
};

export function phoneHref(phone: string): string | null {
  const match = /^(\+?[\d ().-]+?)(?:\s*(?:ext\.?|x)\s*(\d{1,8}))?$/i.exec(
    phone.trim(),
  );
  if (!match) return null;
  const number = match[1].replace(/[ ().-]/g, "");
  if (!/^\+?\d{7,15}$/.test(number)) return null;
  return `tel:${number}${match[2] ? `;ext=${match[2]}` : ""}`;
}
export function emailHref(email: string): string | null {
  if (!/^[^\s@<>]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/.test(email)) return null;
  return `mailto:${encodeURIComponent(email)}`;
}
export function patchContact(contact: MoveContact, raw: unknown): MoveContact {
  const value = object(raw),
    next = { ...contact, revision: contact.revision + 1 };
  if (value.name !== undefined) next.name = text(value.name, 120, true);
  if (value.company !== undefined) next.company = text(value.company, 120);
  if (value.notes !== undefined) next.notes = text(value.notes, 1500);
  if (value.role !== undefined) {
    if (
      typeof value.role !== "string" ||
      !Object.hasOwn(contactRoles, value.role)
    )
      throw new MoveError("Choose a valid contact role.");
    next.role = value.role as MoveContact["role"];
  }
  if (value.phone !== undefined) {
    next.phone = text(value.phone, 50);
    if (next.phone && !phoneHref(next.phone))
      throw new MoveError(
        "Enter a phone number with 7–15 digits, an optional country code, and an optional extension (for example, x123).",
      );
  }
  if (value.email !== undefined) {
    next.email = text(value.email, 254);
    if (next.email && !emailHref(next.email))
      throw new MoveError("Enter a valid email address, or leave it blank.");
  }
  if (value.movingDay !== undefined) {
    if (typeof value.movingDay !== "boolean")
      throw new MoveError("Choose whether to show this contact on moving day.");
    next.movingDay = value.movingDay;
  }
  return next;
}
export function movingDayTasks(plan: MovePlan) {
  return plan.tasks
    .filter(
      (task) =>
        task.status !== "skipped" &&
        (task.movingDay === true ||
          (Boolean(plan.setup.date) && task.due === plan.setup.date) ||
          (!task.custom &&
            !task.manualDate &&
            task.offset >= -2 &&
            task.offset <= 0)),
    )
    .sort(
      (a, b) =>
        Number(a.status === "done") - Number(b.status === "done") ||
        (a.due || "9999").localeCompare(b.due || "9999") ||
        a.offset - b.offset ||
        a.title.localeCompare(b.title),
    );
}
