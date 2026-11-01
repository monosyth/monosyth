"use client";

import { useState } from "react";

import type { KitchenState, Store } from "@/lib/kitchen/types";

type Props = {
  state: KitchenState;
  update: (change: (draft: KitchenState) => KitchenState) => void;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
};

export function StoresTab({ state, update, authFetch }: Props) {
  const [zip, setZip] = useState(state.home?.zip ?? "");
  const [query, setQuery] = useState("");
  const [miles, setMiles] = useState(10);
  const [results, setResults] = useState<Store[] | null>(null);
  const [place, setPlace] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const favorites = state.favoriteStores;
  const favoriteIds = new Set(favorites.map(s => s.id));

  async function search(params: URLSearchParams) {
    setBusy(true);
    setError(null);
    try {
      params.set("miles", String(miles));
      if (query.trim()) params.set("q", query.trim());
      const res = await authFetch(`/api/kitchen/stores?${params}`);
      const data = (await res.json()) as { stores?: Store[]; center?: { label: string }; error?: string };
      if (data.stores) {
        setResults(data.stores);
        setPlace(data.center?.label ?? "");
      } else {
        setError(data.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setError("We couldn't connect. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  function searchZip(event: React.FormEvent) {
    event.preventDefault();
    const clean = zip.trim();
    if (!/^\d{5}$/.test(clean)) {
      setError("Type a 5-digit zip code.");
      return;
    }
    update(s => ({ ...s, home: { zip: clean } }));
    search(new URLSearchParams({ zip: clean }));
  }

  function searchHere() {
    if (!navigator.geolocation) {
      setError("This device can't share its location. Type your zip code instead.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      position =>
        search(new URLSearchParams({ lat: String(position.coords.latitude), lng: String(position.coords.longitude) })),
      () => {
        setBusy(false);
        setError("We couldn't get your location. Type your zip code instead.");
      },
      { timeout: 15000, maximumAge: 600000 },
    );
  }

  function toggleFavorite(store: Store) {
    update(s => {
      if (s.favoriteStores.some(f => f.id === store.id)) {
        const itemStore = Object.fromEntries(Object.entries(s.itemStore).filter(([, id]) => id !== store.id));
        return { ...s, favoriteStores: s.favoriteStores.filter(f => f.id !== store.id), itemStore };
      }
      return { ...s, favoriteStores: [...s.favoriteStores, store] };
    });
  }

  const tripUrl = favorites.length >= 2 ? tripLink(favorites) : null;

  return (
    <div className="stack">
      <section className="stack-tight">
        <div className="section-head">
          <h2>My stores</h2>
          {favorites.length ? <span className="count">{favorites.length}</span> : null}
        </div>
        {favorites.length === 0 ? (
          <div className="empty">
            <p className="empty-title">No favorite stores yet</p>
            <p className="muted">Search below and tap ☆ Save on the stores you like to shop at.</p>
          </div>
        ) : (
          <>
            <ul className="store-list">
              {favorites.map(store => (
                <StoreRow key={store.id} store={store} saved onToggle={() => toggleFavorite(store)} />
              ))}
            </ul>
            {tripUrl ? (
              <a className="btn btn-block" href={tripUrl} target="_blank" rel="noreferrer">
                🗺️ Map a trip to all my stores
              </a>
            ) : null}
            <p className="muted small">
              Tip: on the shopping list, pick a store for each item. When you&rsquo;re at that store, tap its name to see only what to get there.
            </p>
          </>
        )}
      </section>

      <section className="card stack-tight">
        <h2>Find stores near you</h2>
        <form className="stack-tight" onSubmit={searchZip}>
          <label className="big-label" htmlFor="zip">
            Zip code
          </label>
          <div className="add-item">
            <input
              id="zip"
              className="input"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="98101"
              value={zip}
              onChange={event => setZip(event.target.value.replace(/\D/g, ""))}
            />
            <button className="btn" disabled={busy}>
              {busy ? "Looking…" : "Search"}
            </button>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={searchHere} disabled={busy}>
            📍 Use my location instead
          </button>
          <details className="more-options">
            <summary>More options</summary>
            <div className="stack-tight">
              <label className="big-label" htmlFor="store-name">
                Looking for a certain store?
              </label>
              <input
                id="store-name"
                className="input"
                placeholder="Costco, Trader Joe’s, Fred Meyer…"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
              <label className="big-label" htmlFor="miles">
                How far?
              </label>
              <select id="miles" className="input" value={miles} onChange={event => setMiles(Number(event.target.value))}>
                <option value={5}>Within 5 miles</option>
                <option value={10}>Within 10 miles</option>
                <option value={20}>Within 20 miles</option>
                <option value={30}>Within 30 miles</option>
              </select>
            </div>
          </details>
        </form>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {results ? (
        <section className="stack-tight">
          <h3>
            {results.length ? `${results.length} stores` : "No stores found"}
            {place ? ` near ${place}` : ""}
          </h3>
          {results.length === 0 ? <p className="muted">Try a bigger distance, or a different store name.</p> : null}
          <ul className="store-list">
            {results.map(store => (
              <StoreRow key={store.id} store={store} saved={favoriteIds.has(store.id)} onToggle={() => toggleFavorite(store)} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StoreRow({ store, saved, onToggle }: { store: Store; saved: boolean; onToggle: () => void }) {
  return (
    <li className="store">
      <div className="store-text">
        <span className="store-name">{store.name}</span>
        <span className="muted small">
          {store.address}
          {store.distanceMiles !== null ? ` · ${store.distanceMiles} mi` : ""}
        </span>
      </div>
      <div className="store-actions">
        <button className={`btn btn-small ${saved ? "" : "btn-ghost"}`} onClick={onToggle} aria-pressed={saved}>
          {saved ? "★ Saved" : "☆ Save"}
        </button>
        <a className="link-button small" href={store.mapsUrl} target="_blank" rel="noreferrer">
          Directions
        </a>
      </div>
    </li>
  );
}

function tripLink(stores: Store[]) {
  const stop = (s: Store) => `${s.name} ${s.address}`.trim();
  const destination = stores[stores.length - 1];
  const waypoints = stores.slice(0, -1).map(stop).join("|");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop(destination))}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
}
