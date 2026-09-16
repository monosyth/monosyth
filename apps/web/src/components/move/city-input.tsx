"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cityShardKey, searchCities, type CityRow, type CitySuggestion } from "@/lib/move/cities";
import styles from "./planner.module.css";

// Share successful loads between the two fields without retaining a full
// city database in memory. Failed requests are retried on the next focus.
const cache = new Map<string, Promise<CityRow[]>>();
function loadCities(key: string): Promise<CityRow[]> {
  const cached = cache.get(key);
  if (cached) return cached;
  const request = fetch(`/move/cities/${key}.json`, { signal: AbortSignal.timeout(10000) })
    .then(async (response) => {
      if (response.status === 404) return [];
      if (!response.ok) throw new Error("City lookup unavailable");
      return await response.json() as CityRow[];
    }).catch((error: unknown) => {
      cache.delete(key);
      throw error;
    });
  if (cache.size >= 16) cache.delete(cache.keys().next().value!);
  cache.set(key, request);
  return request;
}

export function CityInput({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);
  const [data, setData] = useState<{ key: string; rows: CityRow[]; failed: boolean } | null>(null);
  const key = cityShardKey(value);
  const open = focused && !dismissed && Boolean(key);
  const ready = data?.key === key;
  const matches = useMemo(() => ready && data && !data.failed ? searchCities(data.rows, value) : [], [ready, data, value]);
  const listOpen = open && matches.length > 0;
  const selected = listOpen ? matches[active] : undefined;

  useEffect(() => {
    if (!focused || !key) return;
    let cancelled = false;
    // A brief delay avoids a download for each transient prefix while typing.
    const timer = window.setTimeout(() => {
      void loadCities(key).then((rows) => {
        if (!cancelled) setData({ key, rows, failed: false });
      }).catch(() => {
        if (!cancelled) setData({ key, rows: [], failed: true });
      });
    }, 150);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [focused, key]);

  useEffect(() => {
    if (selected) document.getElementById(`${id}-${selected.id}`)?.scrollIntoView({ block: "nearest" });
  }, [id, selected]);

  function choose(city: CitySuggestion) {
    onChange(city.label);
    setDismissed(true);
    setActive(-1);
    input.current?.focus();
  }
  const status = !ready ? "Finding cities…" : data?.failed
    ? "Suggestions couldn’t load. You can still enter your city."
    : matches.length === 0 ? "No matching cities. You can keep what you typed."
    : `${matches.length} ${matches.length === 1 ? "suggestion" : "suggestions"}. Use the arrow keys and Enter to choose.`;

  return (
    <div className={styles.cityField}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.cityInputWrap}>
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listOpen ? `${id}-list` : undefined}
          aria-activedescendant={selected ? `${id}-${selected.id}` : undefined}
          aria-describedby={`${id}-help`}
          value={value}
          onChange={(event) => { onChange(event.target.value); setActive(-1); setDismissed(false); }}
          onFocus={() => { setFocused(true); setDismissed(false); }}
          onBlur={() => { setFocused(false); setActive(-1); }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && matches.length) {
              event.preventDefault();
              setDismissed(false);
              setActive((current) => event.key === "ArrowDown"
                ? (current + 1) % matches.length
                : current <= 0 ? matches.length - 1 : current - 1);
            } else if (event.key === "Enter" && selected) {
              event.preventDefault();
              choose(selected);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              setDismissed(true);
              setActive(-1);
            }
          }}
          maxLength={100}
          placeholder="Start typing a U.S. city"
          autoComplete="off"
          spellCheck={false}
        />
        {open && (
          <div className={styles.cityPopup}>
            {listOpen && (
              <ul id={`${id}-list`} role="listbox" aria-label={`${label} city suggestions`} className={styles.cityResults}>
                {matches.map((city, index) => (
                  <li
                    key={city.id}
                    id={`${id}-${city.id}`}
                    role="option"
                    aria-selected={active === index}
                    className={active === index ? styles.citySelected : undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(city)}
                  >{city.label}</li>
                ))}
              </ul>
            )}
            <p role="status" className={listOpen ? styles.visuallyHidden : styles.cityMessage}>{status}</p>
          </div>
        )}
      </div>
      <small id={`${id}-help`}>U.S. cities. Type at least 2 letters, or enter your own.</small>
    </div>
  );
}
