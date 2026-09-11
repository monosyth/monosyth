export type Housing = "rent" | "own" | "undecided";
export type MoveSetup = {
  origin: string;
  destination: string;
  date: string;
  leaving: Housing;
  arriving: Housing;
  transport: "movers" | "diy" | "undecided";
  pets: boolean;
  storage: boolean;
  temporary: boolean;
};
export type TaskStatus = "todo" | "done" | "skipped";
export type MoveTask = {
  id: string;
  title: string;
  category: string;
  detail: string;
  offset: number;
  due: string;
  manualDate: boolean;
  status: TaskStatus;
  custom: boolean;
  revision: number;
};
export type MovePlan = {
  id: string;
  setup: MoveSetup;
  tasks: MoveTask[];
  revision: number;
  updatedAt: string;
};
export const emptySetup: MoveSetup = {
  origin: "",
  destination: "",
  date: "",
  leaving: "undecided",
  arriving: "undecided",
  transport: "undecided",
  pets: false,
  storage: false,
  temporary: false,
};
export class MoveError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value >= "2000-01-01" &&
    value <= "2100-12-31"
  );
}
export function shiftDate(date: string, days: number) {
  if (!isDate(date)) return "";
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function formatDate(date: string) {
  return date
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00Z`))
    : "No date yet";
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new MoveError("Please provide valid move details.");
  return value as Record<string, unknown>;
}
export function text(value: unknown, max: number, required = false) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new MoveError(
      `Enter ${required ? "a value of " : ""}${max} characters or fewer.`,
    );
  return value.trim();
}
export function parseSetup(raw: unknown): MoveSetup {
  const v = object(raw);
  const housing = (key: string): Housing => {
    if (!["rent", "own", "undecided"].includes(v[key] as string))
      throw new MoveError("Choose your housing situation.");
    return v[key] as Housing;
  };
  if (v.date !== "" && !isDate(v.date))
    throw new MoveError("Choose a valid move date, or leave it blank.");
  if (!["movers", "diy", "undecided"].includes(v.transport as string))
    throw new MoveError("Choose how you plan to move.");
  for (const key of ["pets", "storage", "temporary"])
    if (typeof v[key] !== "boolean")
      throw new MoveError("Choose the options that apply to your move.");
  return {
    origin: text(v.origin, 100),
    destination: text(v.destination, 100),
    date: v.date as string,
    leaving: housing("leaving"),
    arriving: housing("arriving"),
    transport: v.transport as MoveSetup["transport"],
    pets: v.pets as boolean,
    storage: v.storage as boolean,
    temporary: v.temporary as boolean,
  };
}
type Template = {
  id: string;
  title: string;
  category: string;
  detail: string;
  offset: number;
  applies?: (s: MoveSetup) => boolean;
};
const templates: Template[] = [
  {
    id: "budget",
    title: "Set a moving budget",
    category: "Plan",
    detail: "List likely costs and get quotes before making commitments.",
    offset: -56,
  },
  {
    id: "inventory",
    title: "Decide what to take, sell, or donate",
    category: "Packing",
    detail: "Start with one room and the bulky items that affect moving costs.",
    offset: -42,
  },
  {
    id: "lease",
    title: "Check your current lease and notice requirements",
    category: "Current home",
    detail:
      "Confirm the actual notice date with your lease or property manager. This suggested date is not a legal deadline.",
    offset: -56,
    applies: (s) => s.leaving === "rent",
  },
  {
    id: "sale",
    title: "Plan what happens to your current home",
    category: "Current home",
    detail:
      "If selling, discuss preparation and timing with your agent. If keeping it, plan management and utilities.",
    offset: -56,
    applies: (s) => s.leaving === "own",
  },
  {
    id: "movers",
    title: "Compare movers and confirm a booking",
    category: "Transport",
    detail:
      "Get written quotes, review coverage, and confirm what is included.",
    offset: -42,
    applies: (s) => s.transport === "movers",
  },
  {
    id: "truck",
    title: "Arrange a truck and moving help",
    category: "Transport",
    detail: "Check vehicle size, pickup times, mileage, and who can help.",
    offset: -28,
    applies: (s) => s.transport === "diy",
  },
  {
    id: "transport",
    title: "Choose how you’ll move",
    category: "Transport",
    detail:
      "Compare hired movers, a rental truck, and portable storage options.",
    offset: -42,
    applies: (s) => s.transport === "undecided",
  },
  {
    id: "new-lease",
    title: "Confirm move-in details with your new property manager",
    category: "New home",
    detail:
      "Check the lease start, deposits, key pickup, and building requirements.",
    offset: -21,
    applies: (s) => s.arriving === "rent",
  },
  {
    id: "new-home",
    title: "Confirm possession and key handover",
    category: "New home",
    detail:
      "Coordinate the actual dates with the people handling your new home.",
    offset: -21,
    applies: (s) => s.arriving === "own",
  },
  {
    id: "pets",
    title: "Plan a comfortable trip for your pets",
    category: "Household",
    detail:
      "Arrange carriers, food, needed records, and a quiet place on moving day.",
    offset: -21,
    applies: (s) => s.pets,
  },
  {
    id: "storage",
    title: "Arrange storage and access",
    category: "Transport",
    detail:
      "Confirm space, access hours, transport, and coverage for stored items.",
    offset: -21,
    applies: (s) => s.storage,
  },
  {
    id: "temporary",
    title: "Book temporary housing",
    category: "New home",
    detail:
      "Confirm dates, parking, pet policies if relevant, and what to keep with you.",
    offset: -28,
    applies: (s) => s.temporary,
  },
  {
    id: "supplies",
    title: "Gather packing supplies",
    category: "Packing",
    detail: "Boxes, tape, labels, padding, and a marker for each packing area.",
    offset: -21,
  },
  {
    id: "pack",
    title: "Pack the things you use least",
    category: "Packing",
    detail:
      "Label boxes with their destination room and a short contents list.",
    offset: -14,
  },
  {
    id: "utilities",
    title: "Arrange utility and internet dates",
    category: "New home",
    detail: "Confirm start and stop dates directly with each provider.",
    offset: -14,
  },
  {
    id: "address",
    title: "Plan mail forwarding and address updates",
    category: "Household",
    detail:
      "Use official provider sites and update the organizations you rely on.",
    offset: -14,
  },
  {
    id: "access",
    title: "Confirm loading and building access",
    category: "Transport",
    detail:
      "Ask about elevators, parking, loading times, and any permits at both ends.",
    offset: -7,
  },
  {
    id: "essentials",
    title: "Pack a first-night bag",
    category: "Packing",
    detail:
      "Keep medications, chargers, toiletries, clothes, keys, and important papers with you.",
    offset: -2,
  },
  {
    id: "confirm",
    title: "Reconfirm the moving-day schedule",
    category: "Transport",
    detail:
      "Check arrival times, contact numbers, and the route with everyone helping.",
    offset: -2,
  },
  {
    id: "walkthrough",
    title: "Do a final walkthrough",
    category: "Moving day",
    detail:
      "Check cupboards, photograph the condition, take agreed meter readings, and return keys as arranged.",
    offset: 0,
  },
  {
    id: "arrival",
    title: "Check the new home and delivered belongings",
    category: "Moving day",
    detail:
      "Note any issues, locate shutoffs, and make sure essentials are accessible.",
    offset: 0,
  },
  {
    id: "unpack",
    title: "Set up the essentials first",
    category: "Settling in",
    detail:
      "Start with a place to sleep, a working bathroom, and basic kitchen supplies.",
    offset: 1,
  },
  {
    id: "followup",
    title: "Finish address updates and moving follow-ups",
    category: "Settling in",
    detail:
      "Review remaining accounts, receipts, deposits, and anything needing follow-up.",
    offset: 7,
  },
];
export function generateTasks(setup: MoveSetup): MoveTask[] {
  return templates
    .filter((t) => !t.applies || t.applies(setup))
    .map(({ id, title, category, detail, offset }) => ({
      id,
      title,
      category,
      detail,
      offset,
      due: shiftDate(setup.date, offset),
      manualDate: false,
      status: "todo",
      custom: false,
      revision: 1,
    }));
}
export function reschedule(tasks: MoveTask[], date: string): MoveTask[] {
  return tasks.map((task) =>
    task.manualDate || task.custom || task.status !== "todo"
      ? task
      : {
          ...task,
          due: shiftDate(date, task.offset),
          revision: task.revision + 1,
        },
  );
}
export function progress(tasks: MoveTask[]) {
  const active = tasks.filter((t) => t.status !== "skipped");
  const done = active.filter((t) => t.status === "done").length;
  return {
    done,
    total: active.length,
    percent: active.length ? Math.round((done / active.length) * 100) : 0,
  };
}
export function patchTask(task: MoveTask, raw: unknown): MoveTask {
  const value = object(raw);
  const next = { ...task, revision: task.revision + 1 };
  if (value.title !== undefined) next.title = text(value.title, 180, true);
  if (value.detail !== undefined) next.detail = text(value.detail, 1500);
  if (value.status !== undefined) {
    if (!["todo", "done", "skipped"].includes(value.status as string))
      throw new MoveError("Choose a valid task status.");
    next.status = value.status as TaskStatus;
  }
  if (value.due !== undefined) {
    if (value.due !== "" && !isDate(value.due))
      throw new MoveError("Choose a valid due date.");
    next.due = value.due as string;
    next.manualDate = true;
  }
  return next;
}
