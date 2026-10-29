"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { AgentGrant } from "@/lib/projects/agent-model";
import s from "./journal-connections.module.css";

type Connection = Omit<AgentGrant, "ownerHash">;
type Pending = { projectId: string; projectName: string; label: string; expiresAt: string };
const date = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
export function JournalConnections() {
  const auth = useAuth();
  return <ConnectionsContent key={auth.user?.uid ?? "signed-out"} />;
}
function ConnectionsContent() {
  const auth = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [code, setCode] = useState("");
  const [reviewedCode, setReviewedCode] = useState("");
  const [days, setDays] = useState(7);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const api = useCallback(async (body?: unknown) => {
    if (!auth.user) throw new Error("Sign in to manage journal connections.");
    const token = await auth.user.getIdToken();
    const response = await fetch("/api/projects/agent-access", { method: body ? "POST" : "GET", cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not manage this connection.");
    return result;
  }, [auth.user]);
  const refresh = useCallback(async () => {
    try { const data = await api(); setConnections(data.connections); setReady(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load connections."); }
  }, [api]);
  useEffect(() => {
    if (!auth.user) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => { if (!document.hidden) void refresh(); }, 15_000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, [auth.user, refresh]);
  async function review(event: React.FormEvent) {
    event.preventDefault(); setWorking(true); setError(""); setMessage(""); setPending(null);
    try { const data = await api({ action: "lookup", code }); setPending(data); setReviewedCode(code); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not find that request."); }
    finally { setWorking(false); }
  }
  async function decide(approve: boolean) {
    setWorking(true); setError("");
    try {
      await api({ action: approve ? "approve" : "deny", code: reviewedCode, ...(approve ? { lifetimeDays: days } : {}) });
      setPending(null); setCode(""); setReviewedCode("");
      setMessage(approve ? "Approved — return to Claude and run the client's finish command. A waiting client will confirm automatically." : "Connection declined");
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not handle this request."); }
    finally { setWorking(false); }
  }
  async function revoke(id: string) {
    setWorking(true); setError("");
    try { await api({ action: "revoke", id }); setMessage("Connection revoked"); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not revoke this connection."); }
    finally { setWorking(false); }
  }
  return <main className={s.root}><div className={s.content}>
    <Link href="/projects" className={s.back}>← Project journal</Link>
    <header><p className={s.eyebrow}>PRIVATE STUDIO</p><h1>Journal connections</h1><p>Let Claude read a project and add work updates from its Linux environment.</p></header>
    {auth.status !== "signed_in" ? <section className={s.panel}><h2>Sign in to approve access</h2><p>Use your journal owner account to review connections.</p><button onClick={() => void auth.signInWithGoogle()} disabled={auth.status === "loading" || auth.isWorking || !auth.isConfigured}>{auth.status === "loading" ? "Checking sign-in…" : "Continue with Google"}</button>{auth.error && <p className={s.error} role="alert">{auth.error}</p>}</section> : <>
      <section className={s.panel} aria-labelledby="pair-heading"><h2 id="pair-heading">Connect a Linux client</h2><p>Start the client in Claude, then enter the code it shows you. Only approve a request you just started, and compare the connection name and project before continuing.</p>
        <form onSubmit={event => void review(event)} className={s.codeForm}><label htmlFor="pair-code">Connection code<input id="pair-code" value={code} onChange={event => { setCode(event.target.value); setPending(null); }} placeholder="ABCD-EFGH-JKLM" required maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false} /></label><button disabled={working || !ready}>Review request</button></form>
        {pending && <div className={s.review} aria-live="polite"><p className={s.eyebrow}>REVIEW THIS REQUEST</p><h3>{pending.label}</h3><dl><dt>Project</dt><dd>{pending.projectName} <span>({pending.projectId})</span></dd><dt>Access</dt><dd>Read this project and its history; add new history entries</dd></dl><p>Existing entries and project details stay under your control. This connection cannot access other projects, export the journal, or manage connections.</p><label>Connection expires after<select value={days} onChange={event => setDays(Number(event.target.value))}><option value={1}>1 day</option><option value={7}>7 days</option><option value={30}>30 days</option></select></label><p className={s.small}>Approve by {date(pending.expiresAt)}</p><div className={s.actions}><button disabled={working} onClick={() => void decide(true)}>Approve connection</button><button className={s.secondary} disabled={working} onClick={() => void decide(false)}>Decline</button></div></div>}
      </section>
      <section className={s.panel} aria-labelledby="connections-heading"><div className={s.sectionHeading}><h2 id="connections-heading">Your connections</h2><button className={s.secondary} onClick={() => void refresh()} disabled={working}>Refresh</button></div><p>Revoke a connection at any time. Each connection is limited to one project.</p>
        {!ready ? <p>Loading connections…</p> : !connections.length ? <p className={s.empty}>No clients connected yet</p> : <ul className={s.connections}>{connections.map(item => { const active = !item.revokedAt && Date.parse(item.expiresAt) > Date.now(); return <li key={item.id}><div><h3>{item.label}</h3><p>{item.projectId} · {active ? `Expires ${date(item.expiresAt)}` : item.revokedAt ? "Revoked" : "Expired"}</p><p className={s.small}>{item.lastUsedAt ? `Last used ${date(item.lastUsedAt)}` : "Waiting for first use"}</p></div>{active && <button className={s.secondary} disabled={working} onClick={() => void revoke(item.id)} aria-label={`Revoke ${item.label}`}>Revoke</button>}</li>; })}</ul>}
      </section>
      <p className={s.small}>The client keeps its journal credential inside its own environment. Your Google password and Mac sign-in stay on your devices. Reconnect if that environment is reset.</p>
    </>}
    {error && <p className={s.error} role="alert">{error}</p>}{message && <p className={s.success} role="status">{message}</p>}
  </div></main>;
}
