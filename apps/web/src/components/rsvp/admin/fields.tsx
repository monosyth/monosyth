"use client";

import type React from "react";

export function AdminField({
  label,
  hint,
  children,
}: Readonly<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="text-[0.72rem] text-[var(--rsvp-ink-dim)]">{hint}</span>
      ) : null}
    </label>
  );
}

export function AdminInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: Readonly<{
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}>) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rsvp-input"
    />
  );
}

export function AdminTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: Readonly<{
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}>) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="rsvp-textarea"
    />
  );
}

export function AdminSectionHeader({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--rsvp-border-soft)] pb-4">
      <div>
        <h2 className="font-[var(--font-bebas-neue)] text-2xl tracking-[0.22em] text-[var(--rsvp-teal)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-[var(--rsvp-ink-dim)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Renders an editable list of items. Each item gets a compact card with
 * reorder arrows, a delete button, and whatever children the caller renders.
 */
export function AdminItemList<T extends { id: string }>({
  items,
  onItemsChange,
  createItem,
  renderItem,
  addLabel = "Add item",
  emptyMessage = "No items yet.",
}: Readonly<{
  items: T[];
  onItemsChange: (next: T[]) => void;
  createItem: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  addLabel?: string;
  emptyMessage?: string;
}>) {
  const setItem = (index: number, patch: Partial<T>) => {
    onItemsChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const remove = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [m] = next.splice(index, 1);
    next.splice(target, 0, m);
    onItemsChange(next);
  };
  const add = () => {
    onItemsChange([...items, createItem()]);
  };

  return (
    <div className="grid gap-3">
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--rsvp-border-soft)] bg-black/20 px-4 py-5 text-center text-sm text-[var(--rsvp-ink-dim)]">
          {emptyMessage}
        </p>
      ) : null}
      {items.map((item, i) => (
        <div
          key={item.id}
          className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
              #{i + 1}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="rsvp-btn rsvp-btn-ghost px-2 py-1 text-xs disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className="rsvp-btn rsvp-btn-ghost px-2 py-1 text-xs disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="rsvp-btn rsvp-btn-danger px-2 py-1 text-xs"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          </div>
          {renderItem(item, (patch) => setItem(i, patch))}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rsvp-btn rsvp-btn-neon w-full text-sm"
      >
        + {addLabel}
      </button>
    </div>
  );
}

/** Stable id helper for new list items. */
export function adminId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}
