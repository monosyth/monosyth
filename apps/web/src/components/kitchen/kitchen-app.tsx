"use client";

import { useMemo, useState } from "react";

import { buildShoppingList } from "@/lib/kitchen/grocery";
import { ListTab } from "./list-tab";
import { MealsTab } from "./meals-tab";
import { StoresTab } from "./stores-tab";
import { useKitchen, type Kitchen } from "./use-kitchen";

type Tab = "meals" | "list" | "stores";

export function KitchenApp() {
  const kitchen = useKitchen();
  const [tab, setTab] = useState<Tab>("meals");
  const list = useMemo(() => buildShoppingList(kitchen.state), [kitchen.state]);
  const toBuy =
    list.items.filter(item => !kitchen.state.checked[item.key]).length +
    kitchen.state.extras.filter(extra => !kitchen.state.checked[extra.id]).length;

  function go(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0 });
  }

  if (kitchen.access !== "allowed") {
    return <Gate kitchen={kitchen} />;
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1 className="brand">Dallas&rsquo;s Kitchen</h1>
          <p className="tagline">Just the ingredients, please.</p>
        </div>
        <AccountButton kitchen={kitchen} />
      </header>

      {kitchen.status === "error" ? (
        <div className="error-banner">
          We couldn&rsquo;t save just now. Your changes are kept on this phone and we&rsquo;ll try again with your next change.
        </div>
      ) : null}

      <main className="content">
        {tab === "meals" ? (
          <MealsTab
            state={kitchen.state}
            update={kitchen.update}
            authFetch={kitchen.authFetch}
            toBuy={toBuy}
            goToList={() => go("list")}
          />
        ) : tab === "list" ? (
          <ListTab state={kitchen.state} update={kitchen.update} list={list} goToMeals={() => go("meals")} goToStores={() => go("stores")} />
        ) : (
          <StoresTab state={kitchen.state} update={kitchen.update} authFetch={kitchen.authFetch} />
        )}
      </main>

      <nav className="tabbar" aria-label="Sections">
        <TabButton active={tab === "meals"} onClick={() => go("meals")} icon="🍽️" label="Meals" />
        <TabButton active={tab === "list"} onClick={() => go("list")} icon="🛒" label="Shopping list" badge={toBuy || null} />
        <TabButton active={tab === "stores"} onClick={() => go("stores")} icon="📍" label="Stores" />
      </nav>
    </div>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; icon: string; label: string; badge?: number | null }) {
  return (
    <button className={`tab ${props.active ? "tab-active" : ""}`} onClick={props.onClick} aria-current={props.active ? "page" : undefined}>
      <span className="tab-icon" aria-hidden>
        {props.icon}
        {props.badge ? <span className="tab-badge">{props.badge}</span> : null}
      </span>
      <span className="tab-label">{props.label}</span>
    </button>
  );
}

function Gate({ kitchen }: { kitchen: Kitchen }) {
  const [error, setError] = useState<string | null>(null);
  const signIn = () =>
    kitchen.signIn().catch((err: { code?: string }) => {
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        setError("Sign-in didn't finish. Please try again.");
      }
    });

  return (
    <div className="shell gate">
      <div className="gate-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kitchen/icon.svg" alt="" className="gate-icon" />
        <h1 className="brand">Dallas&rsquo;s Kitchen</h1>
        <p className="tagline">Paste a recipe link. Skip the life story. Get one shopping list for the week.</p>

        {kitchen.access === "loading" || kitchen.access === "checking" ? (
          <p className="muted">Opening the kitchen…</p>
        ) : kitchen.access === "denied" ? (
          <>
            <p>
              This kitchen is private, and <strong>{kitchen.user?.email}</strong> isn&rsquo;t on the guest list.
            </p>
            <button className="btn btn-ghost btn-block" onClick={() => kitchen.signOut()}>
              Sign out and try another account
            </button>
          </>
        ) : kitchen.access === "error" && kitchen.user ? (
          <>
            <p>We couldn&rsquo;t open the kitchen just now. Check your internet connection.</p>
            <button className="btn btn-block" onClick={() => window.location.reload()}>
              Try again
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-block btn-google" onClick={signIn}>
              <GoogleMark /> Sign in with Google
            </button>
            {error ? <p className="form-error">{error}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function AccountButton({ kitchen }: { kitchen: Kitchen }) {
  const [open, setOpen] = useState(false);
  if (!kitchen.user) return null;
  const first = kitchen.user.displayName?.split(" ")[0] ?? "You";
  const statusText =
    kitchen.status === "saving" ? "Saving…" : kitchen.status === "error" ? "Not saved" : "Synced";
  return (
    <div className="account">
      <button className="account-button" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {kitchen.user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={kitchen.user.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
        ) : (
          <span className="avatar avatar-letter">{first[0]}</span>
        )}
        <span className="save-status">{statusText}</span>
      </button>
      {open ? (
        <div className="account-menu">
          <p>
            Signed in as <strong>{kitchen.user.email}</strong>
          </p>
          <p className="muted small">You and Dallas share this kitchen. Changes show up on both phones.</p>
          <button
            className="btn btn-ghost btn-small"
            onClick={() => {
              setOpen(false);
              kitchen.signOut();
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
