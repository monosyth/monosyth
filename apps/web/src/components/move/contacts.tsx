"use client";
import { useState, type FormEvent } from "react";
import {
  contactRoles,
  emailHref,
  phoneHref,
  patchContact,
  movingDayTasks,
  type MoveContact,
} from "@/lib/move/contacts";
import { formatDate, type MovePlan } from "@/lib/move/model";
import { TaskCard } from "./task-card";
import styles from "./planner.module.css";

type Command = Record<string, unknown>;
type Change = (command: Command) => Promise<boolean>;
export function ContactsPlanner({
  contacts,
  notes,
  busy,
  onChange,
}: {
  contacts: MoveContact[];
  notes: string;
  busy: boolean;
  onChange: Change;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <section className={styles.section} aria-labelledby="contacts-heading">
      <div className={styles.topline}>
        <div>
          <p className={styles.kicker}>People & details</p>
          <h2 id="contacts-heading">Keep the right people close.</h2>
          <p className={styles.muted}>
            Save the people and companies involved in your move. These contacts
            stay private to your account; adding someone does not invite or
            notify them.
          </p>
        </div>
        <button
          className={styles.primary}
          disabled={busy || adding || contacts.length >= 50}
          onClick={() => setAdding(true)}
        >
          Add contact
        </button>
      </div>
      {adding && (
        <div className={styles.section}>
          <ContactForm
            busy={busy}
            onCancel={() => setAdding(false)}
            onSave={async (patch) => {
              const saved = await onChange({
                type: "contact-add",
                id: `contact-${crypto.randomUUID()}`,
                patch,
              });
              if (saved) setAdding(false);
              return saved;
            }}
          />
        </div>
      )}
      {contacts.length ? (
        <ul className={`${styles.list} ${styles.section}`}>
          {[...contacts]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((contact) => (
              <li key={contact.id}>
                <ContactCard
                  contact={contact}
                  busy={busy}
                  onChange={onChange}
                />
              </li>
            ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          No contacts yet. Start with your mover, property manager, or someone
          helping on moving day.
        </p>
      )}
      <MoveNotes notes={notes} busy={busy} onChange={onChange} />
    </section>
  );
}
function ContactDetails({ contact }: { contact: MoveContact }) {
  const phone = phoneHref(contact.phone),
    email = emailHref(contact.email);
  return (
    <>
      <h3 className={styles.taskTitle}>{contact.name}</h3>
      <p className={styles.muted}>
        {contactRoles[contact.role]}
        {contact.company ? ` · ${contact.company}` : ""}
      </p>
      <div className={`${styles.actions} ${styles.contactLinks}`}>
        {phone && <a href={phone}>Call {contact.phone}</a>}
        {email && <a href={email}>Email {contact.email}</a>}
      </div>
      {!contact.phone && !contact.email && (
        <p className={styles.fine}>No phone or email entered yet.</p>
      )}
      {contact.notes && <p className={styles.budgetNotes}>{contact.notes}</p>}
    </>
  );
}
function ContactCard({
  contact,
  busy,
  onChange,
}: {
  contact: MoveContact;
  busy: boolean;
  onChange: Change;
}) {
  const [editing, setEditing] = useState(false),
    [removing, setRemoving] = useState(false);
  if (editing)
    return (
      <ContactForm
        initial={contact}
        busy={busy}
        onCancel={() => setEditing(false)}
        onSave={async (patch) => {
          const saved = await onChange({
            type: "contact-update",
            id: contact.id,
            patch,
          });
          if (saved) setEditing(false);
          return saved;
        }}
      />
    );
  return (
    <article className={styles.task}>
      <ContactDetails contact={contact} />
      <p className={styles.fine}>
        {contact.movingDay ? "Shown on moving day" : "Saved in contacts"}
      </p>
      <div className={styles.actions}>
        <button
          disabled={busy}
          onClick={() => setEditing(true)}
          aria-label={`Edit ${contact.name}`}
        >
          Edit
        </button>
        <button
          disabled={busy}
          onClick={() =>
            void onChange({
              type: "contact-update",
              id: contact.id,
              patch: { movingDay: !contact.movingDay },
            })
          }
        >
          {contact.movingDay ? "Hide from moving day" : "Show on moving day"}
        </button>
        <button
          className={styles.danger}
          disabled={busy}
          onClick={() => setRemoving(true)}
          aria-label={`Remove ${contact.name}`}
        >
          Remove
        </button>
      </div>
      {removing && (
        <div className={`${styles.banner} ${styles.section}`}>
          <p>Remove “{contact.name}” from this move? This cannot be undone.</p>
          <div className={styles.actions}>
            <button
              className={styles.danger}
              disabled={busy}
              onClick={() =>
                void onChange({ type: "contact-delete", id: contact.id })
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
function ContactForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial?: MoveContact;
  busy: boolean;
  onSave: (patch: Command) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState<MoveContact["role"]>(
    initial?.role ?? "mover",
  );
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [movingDay, setMovingDay] = useState(initial?.movingDay ?? true);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const patch = { name, company, role, phone, email, notes, movingDay };
    try {
      patchContact(
        {
          id: "preview",
          name: "",
          company: "",
          role: "other",
          phone: "",
          email: "",
          notes: "",
          movingDay: false,
          revision: 0,
        },
        patch,
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Check your contact details.",
      );
      return;
    }
    if (!(await onSave(patch)))
      setError(
        "Your changes were not saved. Review the message above and try again.",
      );
  }
  return (
    <form
      className={`${styles.panel} ${styles.budgetEditor}`}
      onSubmit={submit}
    >
      <h3>{initial ? `Edit ${initial.name}` : "Add a contact"}</h3>
      {error && (
        <p className={`${styles.banner} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={busy}>
        <div className={styles.grid}>
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              autoComplete="off"
            />
          </label>
          <label>
            Company (optional)
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              maxLength={120}
              autoComplete="off"
            />
          </label>
          <label>
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MoveContact["role"])}
            >
              {Object.entries(contactRoles).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phone (optional)
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={50}
              placeholder="Include country code if needed"
              autoComplete="off"
            />
          </label>
          <label>
            Email (optional)
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              autoComplete="off"
            />
          </label>
        </div>
        <label>
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1500}
            placeholder="Hours, arrival window, or what to ask"
          />
        </label>
        <label className={styles.paidOption}>
          <input
            type="checkbox"
            checked={movingDay}
            onChange={(e) => setMovingDay(e.target.checked)}
          />
          Show on moving day
        </label>
        <div className={styles.actions}>
          <button className={styles.primary} disabled={!name.trim()}>
            Save contact
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
function MoveNotes({
  notes,
  busy,
  onChange,
}: {
  notes: string;
  busy: boolean;
  onChange: Change;
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(notes),
    [error, setError] = useState("");
  return (
    <section
      className={`${styles.panel} ${styles.section}`}
      aria-labelledby="notes-heading"
    >
      <h2 id="notes-heading">Move notes</h2>
      <p className={styles.muted}>
        Arrival windows, parking instructions, and reminders. These notes also
        appear in Moving day.
      </p>
      {editing ? (
        <form
          className={styles.budgetEditor}
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (await onChange({ type: "notes", notes: draft }))
              setEditing(false);
            else setError("Notes were not saved. Your draft is still here.");
          }}
        >
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <fieldset disabled={busy}>
            <label>
              Your notes
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
              />
            </label>
            <p className={styles.fine}>
              {draft.length}/2,000 characters. Leave blank and save to clear
              your notes.
            </p>
            <div className={styles.actions}>
              <button className={styles.primary}>Save notes</button>
              <button type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          <p className={styles.budgetNotes}>{notes || "No notes saved yet."}</p>
          <button
            disabled={busy}
            onClick={() => {
              setDraft(notes);
              setError("");
              setEditing(true);
            }}
          >
            {notes ? "Edit notes" : "Add notes"}
          </button>
        </>
      )}
    </section>
  );
}
export function MovingDay({
  plan,
  today,
  busy,
  onChange,
  onContacts,
}: {
  plan: MovePlan;
  today: string;
  busy: boolean;
  onChange: Change;
  onContacts: () => void;
}) {
  const tasks = movingDayTasks(plan),
    contacts = (plan.contacts ?? [])
      .filter((contact) => contact.movingDay)
      .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <section className={styles.section} aria-labelledby="day-heading">
      <p className={styles.kicker}>
        Moving day / {formatDate(plan.setup.date)}
      </p>
      <h2 id="day-heading">Your essentials, in one place.</h2>
      <p className={styles.muted}>
        Tasks due on your move date, default final preparations, and tasks you
        pin here. Complete them here or in the checklist; both views stay in
        sync.
      </p>
      {!plan.setup.date && (
        <p className={styles.banner}>
          You haven’t chosen a move date yet. Default final preparations and
          pinned tasks still appear here. Set the date in Checklist & timeline
          when you know it.
        </p>
      )}
      <div className={styles.section}>
        {tasks.length ? (
          <ul className={styles.list}>
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  today={today}
                  editable
                  busy={busy}
                  onChange={(patch) =>
                    onChange({ type: "task", id: task.id, patch })
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>
            No tasks in this view. Open a task’s details in your checklist and
            choose Pin to moving day.
          </p>
        )}
      </div>
      <section className={styles.section} aria-labelledby="day-contacts">
        <div className={styles.topline}>
          <h2 id="day-contacts">People to reach</h2>
          <button onClick={onContacts}>Manage contacts</button>
        </div>
        {contacts.length ? (
          <ul className={styles.list}>
            {contacts.map((contact) => (
              <li key={contact.id} className={styles.task}>
                <ContactDetails contact={contact} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>
            Add a contact and choose Show on moving day to keep their details
            here.
          </p>
        )}
      </section>
      <section className={`${styles.panel} ${styles.section}`}>
        <h2>Move notes</h2>
        <p className={styles.budgetNotes}>
          {plan.notes || "No notes saved yet."}
        </p>
        <button onClick={onContacts}>Edit in Contacts & notes</button>
      </section>
      <p className={styles.fine}>
        Use Print this view above to keep a paper copy. This version needs an
        internet connection to load or save your plan.
      </p>
    </section>
  );
}
