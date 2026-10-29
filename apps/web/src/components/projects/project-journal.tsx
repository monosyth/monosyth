"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { ENTRY_KINDS, PROJECT_STATUSES, STATUS_LABELS, type Board, type EntryKind, type Project, type ProjectInput, type ProjectStatus, type WorkEntry } from "@/lib/projects/model";
import s from "./project-journal.module.css";

type View = "projects" | "recent" | "waiting";
type Editor = { type: "project"; project?: Project } | { type: "entry"; project: Project } | null;
function Icon({ name, size = 20 }: { name: "grid" | "clock" | "circle" | "plus" | "arrow" | "search" | "download" | "refresh" | "close" | "link" | "check"; size?: number }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    circle: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v.5" /></>,
    plus: <path d="M12 5v14M5 12h14" />, arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></>,
    refresh: <><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    link: <><path d="m10 13 4-4m-5 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 10a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-2 2" transform="translate(1 0) scale(.9)" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function time(value: string, full = false) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", ...(full ? { year: "numeric", hour: "numeric", minute: "2-digit" } : {}) }).format(new Date(value));
}
function Badge({ status }: { status: ProjectStatus }) { return <span className={s.badge} data-status={status}><i />{STATUS_LABELS[status]}</span>; }
function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className={s.empty}><span className={s.emptyMark}><Icon name="circle" size={28} /></span><h3>{title}</h3><p>{children}</p></div>; }

export function ProjectJournal() {
  const auth = useAuth();
  return <JournalContent key={auth.user?.uid ?? "signed-out"} />;
}

function JournalContent() {
  const auth = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [view, setView] = useState<View>("projects");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyProject, setHistoryProject] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [moreWorking, setMoreWorking] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<{ text: string; before: Project; after: Project } | null>(null);
  const reviewLock = useRef(false);
  const currentLoad = useRef(0);
  const api = useCallback(async (url = "/api/projects", body?: unknown) => {
    if (!auth.user) throw new Error("Sign in to open your projects.");
    const token = await auth.user.getIdToken();
    const response = await fetch(url, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) setBoard(null);
      throw new Error(result.error || "Your project journal could not be reached.");
    }
    return result;
  }, [auth.user]);
  const refresh = useCallback(async () => {
    const version = ++currentLoad.current;
    try {
      const result = await api() as Board;
      if (version === currentLoad.current) { setBoard(result); setError(null); }
    } catch (err) { if (version === currentLoad.current) setError(err instanceof Error ? err.message : "Could not load projects."); }
  }, [api]);
  useEffect(() => {
    if (!auth.user) return;
    void refresh();
    const onFocus = () => { if (!document.hidden) void refresh(); };
    const interval = window.setInterval(onFocus, 60000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [auth.user, refresh]);
  useEffect(() => {
    const change = () => setSelectedId(window.location.hash.slice(1) || null);
    change(); window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  const selected = board?.projects.find(project => project.id === selectedId);
  useEffect(() => {
    if (!selectedId || !auth.user) return;
    let active = true;
    void api(`/api/projects?project=${encodeURIComponent(selectedId)}`).then(result => {
      if (active) { setHistoryProject(selectedId); setHistory(result.entries); setCursor(result.nextCursor); setHistoryError(null); setHistoryReady(true); }
    }).catch(err => { if (active) { setHistoryProject(selectedId); setHistory([]); setHistoryError(err.message); setHistoryReady(true); } });
    return () => { active = false; };
  }, [selectedId, api, selected?.revision, auth.user]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 4500); return () => window.clearTimeout(timer); }, [toast]);
  function openProject(id: string | null) {
    setHistory([]); setHistoryReady(false); setHistoryError(null); setCursor(null);
    window.location.hash = id ?? "";
    setSelectedId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function loadMore() {
    if (!cursor || !selectedId) return;
    setMoreWorking(true);
    try {
      const result = await api(`/api/projects?project=${encodeURIComponent(selectedId)}&cursor=${encodeURIComponent(cursor)}`);
      if (window.location.hash.slice(1) !== selectedId) return;
      setHistory(previous => [...previous, ...result.entries]); setCursor(result.nextCursor); setHistoryError(null);
    } catch (err) { setHistoryError(err instanceof Error ? err.message : "Could not load older entries."); }
    finally { setMoreWorking(false); }
  }
  async function exportData() {
    setWorking(true);
    try {
      const data = await api("/api/projects?export=1");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `monosyth-projects-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setToast("Journal exported");
    } catch (err) { setError(err instanceof Error ? err.message : "Export failed."); }
    finally { setWorking(false); }
  }
  useEffect(() => {
    if (!reviewNotice) return;
    const timer = window.setTimeout(() => setReviewNotice(null), 15000);
    return () => window.clearTimeout(timer);
  }, [reviewNotice]);
  async function acknowledge(project: Project, decisionIndex?: number) {
    if (reviewLock.current) return;
    reviewLock.current = true; setReviewing(true); setError(null);
    try {
      const result = await api("/api/projects", { action: "review", projectId: project.id, review: { id: crypto.randomUUID(), expectedRevision: project.revision, ...(decisionIndex !== undefined ? { decisionIndex } : {}) } });
      setToast("");
      setReviewNotice({ text: decisionIndex === undefined ? "Review cleared · In progress" : "Decision approved", before: project, after: result.project });
      await refresh();
    } catch (err) {
      await refresh();
      setError(err instanceof Error ? err.message : "Could not clear this review.");
    } finally { reviewLock.current = false; setReviewing(false); }
  }
  async function undoReview() {
    if (!reviewNotice || reviewLock.current) return;
    reviewLock.current = true; setReviewing(true);
    const { before, after } = reviewNotice;
    try {
      await api("/api/projects", { action: "update", id: after.id, expectedRevision: after.revision, project: { ...after, status: before.status, decisions: before.decisions } });
      setReviewNotice(null); setToast("Review restored"); await refresh();
    } catch (err) {
      setReviewNotice(null); await refresh();
      setError(err instanceof Error ? err.message : "Could not undo this review.");
    } finally { reviewLock.current = false; setReviewing(false); }
  }
  const projects = board?.projects ?? [];
  const waiting = projects.filter(project => project.status === "waiting" || project.status === "review" || project.decisions.length > 0);
  const search = query.trim().toLowerCase();
  const visible = (view === "waiting" ? waiting : projects).filter(project =>
    (filter === "all" || project.status === filter) && [project.name, project.summary, project.area, project.nextStep, ...project.decisions].join(" ").toLowerCase().includes(search));
  const recent = (board?.entries ?? []).filter(entry => [entry.title, entry.body, entry.verification, projects.find(project => project.id === entry.projectId)?.name].join(" ").toLowerCase().includes(search));
  function navigate(next: View) { setView(next); setFilter("all"); setQuery(""); openProject(null); }

  if (auth.status !== "signed_in") return <main className={s.root}><div className={s.login}>
    <Link href="/" className={s.wordmark}><span className={s.mark}>M</span>monosyth<span className={s.privateLabel}>PRIVATE STUDIO</span></Link>
    <div className={s.loginArt} aria-hidden="true"><span /><span /><span /><i /></div>
    <p className={s.eyebrow}>A place to pick things back up</p><h1>Your work,<br /><em>remembered</em></h1>
    <p className={s.loginCopy}>Projects, progress, and the next useful step.<br />Your private Monosyth project journal.</p>
    {auth.status === "loading" ? <p className={s.muted} role="status">Checking your sign-in…</p> : <button className={s.primary} onClick={() => void auth.signInWithGoogle()} disabled={auth.isWorking || !auth.isConfigured}>Continue with Google <Icon name="arrow" /></button>}
    {auth.error && <p className={s.error} role="alert">{auth.error}</p>}
    {!auth.isConfigured && <p className={s.error}>Sign-in is not configured on this host.</p>}
    <p className={s.loginFooter}>Private access · Monosyth</p>
  </div></main>;

  return <div className={s.root}>
    <aside className={s.sidebar}>
      <Link href="/app" className={s.wordmark}><span className={s.mark}>M</span>monosyth</Link>
      <span className={s.sideEyebrow}>THE WORKING STUDIO</span>
      <nav className={s.nav} aria-label="Project journal">
        {([{ id: "projects", label: "Projects", icon: "grid", count: projects.length }, { id: "recent", label: "Recent work", icon: "clock" }, { id: "waiting", label: "Waiting on me", icon: "circle", count: waiting.length }] as const).map(item =>
          <button key={item.id} className={s.navButton} aria-current={view === item.id && !selectedId ? "page" : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{"count" in item && <small>{item.count}</small>}</button>)}
      </nav>
      <Link href="/projects/connections" className={s.navButton}><Icon name="link" /><span>Connections</span></Link>
      <div className={s.sideNote}><span className={s.syncDot} /><strong>A little progress adds up</strong><p>Keep the work, the decisions,<br />and the way forward together.</p></div>
      <div className={s.sideBottom}><Link href="/app"><Icon name="arrow" size={16} /> Back to studio</Link><button onClick={() => void auth.signOut()} disabled={auth.isWorking}>Sign out</button></div>
    </aside>
    <div className={s.workspace}>
      <header className={s.topbar}><span>STUDIO / PROJECT JOURNAL</span><span className={s.topbarRight}><i className={s.syncDot} />Private journal<button title="Refresh projects" aria-label="Refresh projects" onClick={() => void refresh()}><Icon name="refresh" size={17} /></button><button className={s.mobileSignOut} onClick={() => void auth.signOut()} disabled={auth.isWorking}>Sign out</button></span></header>
      <main className={s.main}>
        <header className={s.heading}>
          <div><p className={s.eyebrow}>{selected ? selected.area : "The things you’re making"}</p><h1>{selected ? selected.name : view === "recent" ? "Recent work" : view === "waiting" ? "Waiting on you" : "Your projects"}</h1><p className={s.subtitle}>{selected ? selected.summary : view === "recent" ? "The steps, decisions, and small wins along the way." : view === "waiting" ? "A few decisions that will help the work move forward." : "A home for what’s happening, what’s done, and what comes next."}</p></div>
          <div className={s.headingActions}>{selected ? <><button className={s.secondary} onClick={() => setEditor({ type: "project", project: selected })}>Edit project</button><button className={s.primary} onClick={() => setEditor({ type: "entry", project: selected })}><Icon name="plus" size={17} />Add update</button></> : <><button className={s.secondary} onClick={() => void exportData()} disabled={!board || working}><Icon name="download" size={17} />Export</button><button className={s.primary} onClick={() => setEditor({ type: "project" })} disabled={!board}><Icon name="plus" size={17} />New project</button></>}</div>
        </header>
        {error && <div className={s.errorBanner} role="alert"><span>{error}</span><button onClick={() => void refresh()}>Try again</button></div>}
        {!board ? !error && <div className={s.empty} role="status">Opening your journal…</div> : selectedId && !selected ? <Empty title="Project not found">Choose Projects to return to your journal.</Empty> : selected ? <>
          <button className={s.back} onClick={() => openProject(null)}>← All projects</button>
          <div className={s.projectLayout}>
            <section><div className={s.sectionHeading}><h2>Work history</h2><span>{selected.lastWorkedAt ? `Last worked ${time(selected.lastWorkedAt)}` : "Ready for the next session"}</span></div>
              {historyError && <p className={s.error} role="alert">{historyError}</p>}
              {!historyReady || historyProject !== selectedId ? <p className={s.muted} role="status">Loading project history…</p> : history.length ? <div className={s.timeline}>{history.map(entry => <Entry key={entry.id} entry={entry} />)}</div> : !historyError && <Empty title="The story starts here">Add an update when you take the next step.</Empty>}
              {cursor && <button className={s.secondary} onClick={() => void loadMore()} disabled={moreWorking}>{moreWorking ? "Loading…" : "Load older entries"}</button>}
            </section>
            <aside className={s.detailAside}><div className={s.detailCard}><Badge status={selected.status} /><p className={s.eyebrow}>NEXT USEFUL STEP</p><h3>{selected.nextStep || "Choose a next step when you’re ready"}</h3>{selected.status === "review" && <button className={s.reviewAction} aria-label={`Mark ${selected.name} reviewed`} onClick={() => void acknowledge(selected)} disabled={reviewing}><Icon name="check" size={16} />Reviewed</button>}<div className={s.detailFoot}>Updated {time(selected.updatedAt, true)}</div></div>
              <div className={s.detailCard}><div className={s.sectionHeading}><h2>Open decisions</h2><span>{selected.decisions.length}</span></div>{selected.decisions.length ? <ul className={s.decisions}>{selected.decisions.map((decision, index) => <li key={index}><p>{decision}</p><button className={s.reviewAction} aria-label={`Approve decision: ${decision}`} onClick={() => void acknowledge(selected, index)} disabled={reviewing}><Icon name="check" size={15} />OK</button></li>)}</ul> : <p className={s.muted}>Nothing waiting for a decision.</p>}</div>
              <div className={s.detailCard}><div className={s.sectionHeading}><h2>Files & links</h2><Icon name="link" size={17} /></div><ProjectLinks links={selected.links} onCopied={() => setToast("File path copied")} /></div>
            </aside>
          </div>
        </> : <>
          {view === "projects" && <div className={s.stats}>
            <button onClick={() => setFilter("active")}><span><i data-tone="mint" />In progress</span><strong>{projects.filter(project => project.status === "active").length.toString().padStart(2, "0")}</strong><small>Ideas taking shape</small></button>
            <button onClick={() => navigate("waiting")}><span><i data-tone="amber" />Waiting on you</span><strong>{waiting.length.toString().padStart(2, "0")}</strong><small>A decision or a fresh look</small></button>
            <button onClick={() => navigate("recent")}><span><i data-tone="blue" />Recent steps</span><strong>{(board.entries.filter(entry => entry.kind !== "import" && entry.title !== "Project added to the journal" && Date.parse(board.loadedAt) - Date.parse(entry.createdAt) < 7 * 86400000).length).toString().padStart(2, "0")}</strong><small>This week · recent 100 entries</small></button>
          </div>}
          <div className={s.toolbar}><div className={s.tabs}>{view === "projects" ? <><button data-active={filter === "all"} onClick={() => setFilter("all")}>All projects <small>{projects.length}</small></button><button data-active={filter === "active"} onClick={() => setFilter("active")}>In progress</button><button data-active={filter === "complete"} onClick={() => setFilter("complete")}>Complete</button></> : <p>{view === "recent" ? "Latest 100 entries · Full history inside each project" : `${waiting.length} projects need your attention`}</p>}</div>
            <label className={s.search}><Icon name="search" size={17} /><input aria-label={view === "recent" ? "Search recent work" : "Search projects"} placeholder={view === "recent" ? "Search recent work…" : "Find a project…"} value={query} onChange={event => setQuery(event.target.value)} /></label>
          </div>
          {view === "recent" ? recent.length ? <div className={s.recentList}>{recent.map(entry => <Entry key={entry.id} entry={entry} project={projects.find(project => project.id === entry.projectId)} onOpen={openProject} />)}</div> : <Empty title={search ? "No matching work" : "Your progress will appear here"}>{search ? "Try a different word or project name." : "Project updates will build a record as you work."}</Empty>
            : visible.length ? <div className={s.cards}>{visible.map((project, index) => <article key={project.id} className={s.projectCard}><button className={s.cardOpen} aria-label={`Open ${project.name}`} onClick={() => openProject(project.id)}>
              <div className={s.cardTop}><span className={s.projectMonogram} data-color={index % 4}>{project.name.split(/\s+/).map(word => word[0]).slice(0, 2).join("")}</span><Badge status={project.status} /></div>
              <p className={s.cardArea}>{project.area}</p><h2>{project.name}</h2><p className={s.cardSummary}>{project.summary}</p>
              <div className={s.nextStep}><span>UP NEXT</span><p>{project.nextStep || "A little room for your next idea"}</p></div>
              {view === "waiting" && project.decisions.length > 0 && <p className={s.decisionCount}>{project.decisions.length} open {project.decisions.length === 1 ? "decision" : "decisions"}</p>}
              </button><div className={s.cardFooter}><span>{project.lastWorkedAt ? `Worked on ${time(project.lastWorkedAt)}` : "Starting context saved"}</span><div className={s.cardActions}>{project.status === "review" && <button className={s.reviewAction} aria-label={`Mark ${project.name} reviewed`} onClick={() => void acknowledge(project)} disabled={reviewing}><Icon name="check" size={15} />Reviewed</button>}<button className={s.openAction} aria-label={`View ${project.name}`} onClick={() => openProject(project.id)}><Icon name="arrow" size={17} /></button></div></div>
            </article>)}</div> : <Empty title={search || filter !== "all" ? "No matching projects" : view === "waiting" ? "A clear working table" : "Make room for your first project"}>{search || filter !== "all" ? "Try another search or choose All projects." : view === "waiting" ? "Nothing needs your attention right now." : "Add a project and one useful next step."}</Empty>}
        </>}
        <footer className={s.footer}><span>Monosyth / A record of the work</span><span>{board ? `Synced ${time(board.loadedAt, true)} · Pacific time` : "Private studio"}</span></footer>
      </main>
    </div>
    {editor && <EditorModal editor={editor} api={api} onClose={() => setEditor(null)} onSaved={async message => { setEditor(null); setToast(message); await refresh(); }} />}
    {reviewNotice && <div className={s.toast}><span role="status">{reviewNotice.text}</span><button onClick={() => void undoReview()} disabled={reviewing}>Undo</button><button aria-label="Dismiss review message" onClick={() => setReviewNotice(null)} disabled={reviewing}><Icon name="close" size={16} /></button></div>}
    {!reviewNotice && toast && <div className={s.toast} role="status"><Icon name="check" size={17} />{toast}</div>}
  </div>;
}

function Entry({ entry, project, onOpen }: { entry: WorkEntry; project?: Project; onOpen?: (id: string) => void }) {
  return <article className={s.entry} data-kind={entry.kind}><div className={s.entryDot}><Icon name={entry.kind === "milestone" ? "check" : entry.kind === "blocker" ? "circle" : entry.kind === "import" ? "download" : "clock"} size={15} /></div><div className={s.entryContent}>
    <div className={s.entryMeta}>{project && <button onClick={() => onOpen?.(project.id)}>{project.name}</button>}<span>{entry.kind === "import" ? "Imported reference" : entry.kind}</span><time dateTime={entry.createdAt}>{time(entry.createdAt, true)}</time></div>
    <h3>{entry.title}</h3>{entry.body && <p>{entry.body}</p>}{entry.verification && <div className={s.verification}><Icon name="check" size={14} /><span>{entry.verification}</span></div>}
    {entry.source && <p className={s.source}>Source: {entry.source}</p>}<small className={s.entryAuthor}>{entry.author === "Codex" ? "Recorded by Codex" : "Recorded by you"}</small>
  </div></article>;
}
function ProjectLinks({ links, onCopied }: { links: ProjectInput["links"]; onCopied: () => void }) {
  const [copyError, setCopyError] = useState("");
  async function copy(path: string) {
    try { await navigator.clipboard.writeText(path); onCopied(); setCopyError(""); }
    catch { setCopyError("Copy is unavailable in this browser. Select and copy the path below."); }
  }
  if (!links.length) return <p className={s.muted}>Add a folder, preview, or useful reference.</p>;
  return <div className={s.links}>{links.map((link, index) => <div key={index}>{link.url.startsWith("/Users/") ? <><button onClick={() => void copy(link.url)}><Icon name="link" size={16} />{link.label}<span>Copy path</span></button><code>{link.url}</code></> : <a href={link.url} target="_blank" rel="noopener noreferrer"><Icon name="link" size={16} />{link.label}<span>↗</span></a>}</div>)}{copyError && <p className={s.error} role="alert">{copyError}</p>}</div>;
}
function EditorModal({ editor, api, onClose, onSaved }: { editor: NonNullable<Editor>; api: (url?: string, body?: unknown) => Promise<unknown>; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [entryId] = useState(() => crypto.randomUUID());
  const project = editor.project;
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget), text = (key: string) => String(form.get(key) ?? "").trim();
    try {
      if (editor.type === "project") {
        const data: ProjectInput = { name: text("name"), area: text("area"), summary: text("summary"), status: text("status") as ProjectStatus, nextStep: text("nextStep"), decisions: text("decisions").split("\n").filter(Boolean), links: text("links").split("\n").filter(Boolean).map(line => { const index = line.indexOf(" | "); if (index < 1) throw new Error("For each link, use Label | URL or file path."); return { label: line.slice(0, index).trim(), url: line.slice(index + 3).trim() }; }) };
        const id = project?.id ?? `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54) || "project"}-${entryId.slice(0, 8)}`;
        await api("/api/projects", { action: project ? "update" : "create", id, project: data, expectedRevision: project?.revision });
        await onSaved(project ? "Project updated" : "Project added");
      } else {
        const nextStep = text("nextStep"), status = text("status");
        await api("/api/projects", { action: "record", projectId: editor.project.id, entry: { id: entryId, title: text("title"), body: text("body"), kind: text("kind") as EntryKind, verification: text("verification"), source: text("source"), ...(nextStep !== editor.project.nextStep ? { nextStep } : {}), ...(status !== editor.project.status ? { status } : {}), expectedRevision: editor.project.revision } });
        await onSaved("Work recorded");
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save this update."); }
    finally { setSaving(false); }
  }
  return <dialog ref={dialog} className={s.dialog} aria-labelledby="journal-editor-title" onCancel={event => { if (saving) event.preventDefault(); else onClose(); }} onClose={onClose}>
    <div className={s.dialogHeader}><div><p className={s.eyebrow}>{editor.type === "entry" ? project?.name : "PROJECT JOURNAL"}</p><h2 id="journal-editor-title">{editor.type === "entry" ? "Record a little progress" : project ? "Edit project" : "Start something new"}</h2></div><button type="button" aria-label="Close editor" onClick={onClose} disabled={saving}><Icon name="close" /></button></div>
    <form onSubmit={event => void submit(event)} className={s.form}>
      {editor.type === "project" ? <>
        <label>Project name<input name="name" required maxLength={120} defaultValue={project?.name} autoFocus /></label>
        <div className={s.formRow}><label>Area<input name="area" required maxLength={80} placeholder="Design, studio tools, home…" defaultValue={project?.area} /></label><label>Status<select name="status" defaultValue={project?.status ?? "idea"}>{PROJECT_STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label></div>
        <label>What is this project about?<textarea name="summary" rows={2} maxLength={1500} defaultValue={project?.summary} /></label>
        <label>Next useful step<textarea name="nextStep" rows={2} maxLength={1500} defaultValue={project?.nextStep} placeholder="One clear action to pick this back up" /></label>
        <label>Open decisions<span>One per line</span><textarea name="decisions" rows={3} defaultValue={project?.decisions.join("\n")} /></label>
        <label>Files & links<span>One per line: Label | URL or local file path</span><textarea name="links" rows={3} defaultValue={project?.links.map(link => `${link.label} | ${link.url}`).join("\n")} placeholder="Latest proof | https://…" /></label>
      </> : <>
        <label>What changed?<input name="title" required maxLength={180} autoFocus placeholder="A short headline for the work" /></label>
        <div className={s.formRow}><label>Type of update<select name="kind" defaultValue="progress">{ENTRY_KINDS.filter(kind => kind !== "import").map(kind => <option key={kind} value={kind}>{kind.charAt(0).toUpperCase() + kind.slice(1)}</option>)}</select></label><label>Project status<select name="status" defaultValue={project?.status}>{PROJECT_STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label></div>
        <label>Work notes<textarea name="body" rows={4} maxLength={10000} placeholder="What you finished, learned, or decided" /></label>
        <label>What was checked?<textarea name="verification" rows={2} maxLength={3000} placeholder="Proof reviewed, tests passed, files inspected…" /></label>
        <label>Source or reference<input name="source" maxLength={1500} placeholder="A chat link, file path, or commit" /></label>
        <label>Next useful step<textarea name="nextStep" rows={2} maxLength={1500} defaultValue={project?.nextStep} /></label>
      </>}
      {error && <div className={s.error} role="alert">{error}</div>}
      <div className={s.formFooter}><button type="button" className={s.secondary} onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className={s.primary} disabled={saving}>{saving ? "Saving…" : editor.type === "entry" ? "Save update" : "Save project"}<Icon name="check" size={17} /></button></div>
    </form>
  </dialog>;
}
