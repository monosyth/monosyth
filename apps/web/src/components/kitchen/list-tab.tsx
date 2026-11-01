"use client";

import { useState } from "react";

import { AISLE_LABELS, AISLE_ORDER, DAY_LABELS, type ShoppingItem, type ShoppingList } from "@/lib/kitchen/grocery";
import { newId } from "@/lib/kitchen/ids";
import type { KitchenState, Store } from "@/lib/kitchen/types";

type Props = {
  state: KitchenState;
  update: (change: (draft: KitchenState) => KitchenState) => void;
  list: ShoppingList;
  goToMeals: () => void;
  goToStores: () => void;
};

export function ListTab({ state, update, list, goToMeals, goToStores }: Props) {
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [showTips, setShowTips] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [copied, setCopied] = useState(false);
  // Splitting by store only makes sense once there are at least two to choose from.
  const stores = state.favoriteStores.length >= 2 ? state.favoriteStores : [];
  const activeFilter = stores.some(s => s.id === storeFilter) ? storeFilter : "all";

  const visible = (key: string) => {
    if (activeFilter === "all") return true;
    const assigned = state.itemStore[key];
    return !assigned || assigned === activeFilter || !stores.some(s => s.id === assigned);
  };

  const items = list.items.filter(item => visible(item.key));
  const extras = state.extras.filter(extra => visible(extra.id));
  const open = items.filter(item => !state.checked[item.key]);
  const done = items.filter(item => state.checked[item.key]);
  const openExtras = extras.filter(extra => !state.checked[extra.id]);
  const doneExtras = extras.filter(extra => state.checked[extra.id]);
  const total = items.length + extras.length;
  const doneCount = done.length + doneExtras.length;

  const toggle = (key: string) =>
    update(s => {
      const checked = { ...s.checked };
      if (checked[key]) delete checked[key];
      else checked[key] = true;
      return { ...s, checked };
    });

  const assignStore = (key: string, storeId: string) =>
    update(s => {
      const itemStore = { ...s.itemStore };
      if (storeId) itemStore[key] = storeId;
      else delete itemStore[key];
      return { ...s, itemStore };
    });

  if (list.mealCount === 0 && state.extras.length === 0) {
    return (
      <div className="stack">
        <div className="empty">
          <p className="empty-title">Your shopping list is empty</p>
          <p className="muted">Add meals to this week and everything you need shows up here, sorted by aisle.</p>
          <button className="btn" onClick={goToMeals}>
            Plan some meals
          </button>
        </div>
        <AddItem value={newItem} onChange={setNewItem} onAdd={text => update(s => ({ ...s, extras: [...s.extras, { id: newId("x_"), text }] }))} />
      </div>
    );
  }

  const staples = open.filter(item => item.staple);
  const regular = open.filter(item => !item.staple);
  const byAisle = AISLE_ORDER.map(aisle => ({ aisle, items: regular.filter(item => item.aisle === aisle) })).filter(
    group => group.items.length,
  );

  async function share() {
    const lines = [
      ...regular.map(item => `☐ ${item.name}${amountText(item) ? ` — ${amountText(item)}` : ""}`),
      ...openExtras.map(extra => `☐ ${extra.text}`),
      ...(staples.length ? ["", "Check the cupboard:", ...staples.map(item => `☐ ${item.name}`)] : []),
    ];
    const text = `Shopping list\n\n${lines.join("\n")}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Shopping list", text });
        return;
      } catch {
        // Fall through to copying if sharing is cancelled or unavailable.
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="stack">
      <div className="list-summary">
        <p>
          <strong>
            {open.length + openExtras.length} {open.length + openExtras.length === 1 ? "thing" : "things"} to buy
          </strong>{" "}
          for {list.mealCount} {list.mealCount === 1 ? "meal" : "meals"}
        </p>
        {total ? (
          <div className="progress" aria-label={`${doneCount} of ${total} in the cart`}>
            <div className="progress-fill" style={{ width: `${(doneCount / total) * 100}%` }} />
          </div>
        ) : null}
      </div>

      {stores.length ? (
        <div className="chips" role="group" aria-label="Which store are you at?">
          <button className={`chip ${activeFilter === "all" ? "chip-active" : ""}`} onClick={() => setStoreFilter("all")}>
            All stores
          </button>
          {stores.map(store => (
            <button
              key={store.id}
              className={`chip ${activeFilter === store.id ? "chip-active" : ""}`}
              onClick={() => setStoreFilter(store.id)}
            >
              {shortStoreName(store)}
            </button>
          ))}
        </div>
      ) : (
        <button className="hint-card" onClick={goToStores}>
          📍 <span>Save two or more favorite stores, then you can split this list by store.</span>
        </button>
      )}

      {list.leftovers.length && activeFilter === "all" ? (
        <section className="card tips">
          <h3>Good to know</h3>
          <ul>
            {(showTips ? list.leftovers : list.leftovers.slice(0, 2)).map(tip => (
              <li key={tip.key}>
                <span aria-hidden>{tip.shared ? "🤝" : "🌿"}</span> {tip.message}
              </li>
            ))}
          </ul>
          {list.leftovers.length > 2 ? (
            <button className="link-button" onClick={() => setShowTips(s => !s)}>
              {showTips ? "Show less" : `Show ${list.leftovers.length - 2} more`}
            </button>
          ) : null}
        </section>
      ) : null}

      {byAisle.map(group => (
        <section key={group.aisle} className="aisle">
          <h3 className="aisle-title">{AISLE_LABELS[group.aisle]}</h3>
          <ul className="items">
            {group.items.map(item => (
              <ItemRow
                key={item.key}
                item={item}
                checked={false}
                onToggle={() => toggle(item.key)}
                stores={stores}
                storeId={state.itemStore[item.key] ?? ""}
                onStore={storeId => assignStore(item.key, storeId)}
              />
            ))}
          </ul>
        </section>
      ))}

      {openExtras.length ? (
        <section className="aisle">
          <h3 className="aisle-title">Extras</h3>
          <ul className="items">
            {openExtras.map(extra => (
              <li key={extra.id} className="item">
                <button className="item-check" onClick={() => toggle(extra.id)} aria-label={`Got ${extra.text}`}>
                  <span className="checkbox" />
                  <span className="item-text">
                    <span className="item-name">{extra.text}</span>
                  </span>
                </button>
                <div className="item-side">
                  <StorePicker stores={stores} value={state.itemStore[extra.id] ?? ""} onChange={id => assignStore(extra.id, id)} />
                  <button
                    className="link-button danger small"
                    onClick={() => update(s => ({ ...s, extras: s.extras.filter(e => e.id !== extra.id) }))}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AddItem value={newItem} onChange={setNewItem} onAdd={text => update(s => ({ ...s, extras: [...s.extras, { id: newId("x_"), text }] }))} />

      {staples.length ? (
        <section className="aisle staples">
          <h3 className="aisle-title">Check the cupboard</h3>
          <p className="muted small">You probably have these already. Check them off if you do.</p>
          <ul className="items">
            {staples.map(item => (
              <ItemRow
                key={item.key}
                item={item}
                checked={false}
                onToggle={() => toggle(item.key)}
                stores={[]}
                storeId={state.itemStore[item.key] ?? ""}
                onStore={storeId => assignStore(item.key, storeId)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {done.length + doneExtras.length ? (
        <section className="aisle">
          <button className="section-toggle" onClick={() => setShowCart(s => !s)} aria-expanded={showCart}>
            <h3 className="aisle-title">✓ Got it ({done.length + doneExtras.length})</h3>
            <span className="chevron" aria-hidden>
              {showCart ? "▲" : "▼"}
            </span>
          </button>
          {showCart ? (
            <ul className="items">
              {done.map(item => (
                <ItemRow key={item.key} item={item} checked onToggle={() => toggle(item.key)} stores={[]} storeId="" onStore={() => undefined} />
              ))}
              {doneExtras.map(extra => (
                <li key={extra.id} className="item item-done">
                  <button className="item-check" onClick={() => toggle(extra.id)}>
                    <span className="checkbox checkbox-on">✓</span>
                    <span className="item-text">
                      <span className="item-name">{extra.text}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <div className="button-row">
        <button className="btn btn-ghost btn-block" onClick={share}>
          {copied ? "✓ Copied" : "Share or text this list"}
        </button>
        {doneCount ? (
          <button
            className="btn btn-ghost btn-block"
            onClick={() => update(s => ({ ...s, checked: {} }))}
          >
            Uncheck everything
          </button>
        ) : null}
      </div>
    </div>
  );
}

function amountText(item: ShoppingItem) {
  if (item.buyTip) return item.buyTip;
  return item.amount === "some" ? "" : item.amount;
}

function ItemRow(props: {
  item: ShoppingItem;
  checked: boolean;
  onToggle: () => void;
  stores: Store[];
  storeId: string;
  onStore: (storeId: string) => void;
}) {
  const { item, checked } = props;
  const titles = [...new Set(item.usedIn.map(u => u.recipeTitle))];
  const amount = item.amount === "some" ? "" : item.amount;
  return (
    <li className={`item ${checked ? "item-done" : ""}`}>
      <button className="item-check" onClick={props.onToggle} aria-pressed={checked} aria-label={`${checked ? "Uncheck" : "Got"} ${item.name}`}>
        <span className={`checkbox ${checked ? "checkbox-on" : ""}`}>{checked ? "✓" : ""}</span>
        <span className="item-text">
          <span className="item-name">
            {item.name}
            {amount ? <span className="item-amount"> · {amount}</span> : null}
          </span>
          {item.buyTip ? <span className="buy-tip">Buy: {item.buyTip}</span> : null}
          <span className="item-for">
            {titles.length > 1 ? <span className="shared-badge">{titles.length} meals</span> : null}
            For {titles.join(", ")}
            {item.usedIn.length === 1 && item.usedIn[0].day ? ` (${DAY_LABELS[item.usedIn[0].day]})` : ""}
            {item.optional ? " · optional" : ""}
          </span>
        </span>
      </button>
      {!checked && props.stores.length ? (
        <div className="item-side">
          <StorePicker stores={props.stores} value={props.storeId} onChange={props.onStore} />
        </div>
      ) : null}
    </li>
  );
}

function StorePicker({ stores, value, onChange }: { stores: Store[]; value: string; onChange: (id: string) => void }) {
  if (!stores.length) return null;
  return (
    <label className="select-chip select-chip-small">
      <span className="sr-only">Store</span>
      <select value={stores.some(s => s.id === value) ? value : ""} onChange={event => onChange(event.target.value)}>
        <option value="">Any store</option>
        {stores.map(store => (
          <option key={store.id} value={store.id}>
            {shortStoreName(store)}
          </option>
        ))}
      </select>
    </label>
  );
}

function AddItem({ value, onChange, onAdd }: { value: string; onChange: (v: string) => void; onAdd: (text: string) => void }) {
  return (
    <form
      className="add-item"
      onSubmit={event => {
        event.preventDefault();
        const text = value.trim();
        if (!text) return;
        onAdd(text);
        onChange("");
      }}
    >
      <input
        className="input"
        placeholder="Add something else (paper towels, coffee…)"
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-label="Add an item"
      />
      <button className="btn">Add</button>
    </form>
  );
}

export function shortStoreName(store: Store) {
  return store.name.replace(/\s+(Supermarket|Grocery Store|Market|Store|Warehouse)$/i, "").slice(0, 24);
}
