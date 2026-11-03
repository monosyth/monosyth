"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { AnalyticsOverview, JournalStats, OverviewSite, ShopStats } from "@/lib/projects/analytics-model";
import { isUnavailable, type AnalyticsSummary, type SearchSummary, type Unavailable } from "@/lib/projects/insights-model";
import s from "./analytics-view.module.css";

type Api = (url?: string) => Promise<unknown>;
type Measure = "users" | "sessions" | "views";
type Sort = { key: string; desc: boolean };
type Column = { key: string; label: string; title?: string; value: (site: OverviewSite) => number | string | null; render: (site: OverviewSite) => ReactNode; total?: (sites: OverviewSite[]) => ReactNode };

const number = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const day = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const when = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
const hostOf = (url: string) => { try { const parsed = new URL(url); return parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/$/, ""); } catch { return url; } };
const ga = (site: OverviewSite): AnalyticsSummary | null => isUnavailable(site.insights.analytics) ? null : site.insights.analytics;
const sc = (site: OverviewSite): SearchSummary | null => isUnavailable(site.insights.search) ? null : site.insights.search;
const sum = (values: (number | null | undefined)[]) => values.some(value => typeof value === "number") ? values.reduce<number>((total, value) => total + (value ?? 0), 0) : null;
const MEASURES: { id: Measure; label: string }[] = [{ id: "users", label: "Users" }, { id: "sessions", label: "Sessions" }, { id: "views", label: "Page views" }];

function change(value: number | null, previous: number | null) {
  if (value === null || previous === null || previous === 0) return null;
  return (value - previous) / previous;
}
function Delta({ value, previous, inverse = false, label = "vs previous period" }: { value: number | null; previous: number | null; inverse?: boolean; label?: string }) {
  const ratio = change(value, previous);
  if (ratio === null) return <span className={s.deltaNone}>–</span>;
  if (Math.abs(ratio) < 0.005) return <span className={s.delta}>flat</span>;
  const better = inverse ? ratio < 0 : ratio > 0;
  return <span className={s.delta} data-tone={better ? "up" : "down"}>{ratio > 0 ? "▲" : "▼"} {Math.abs(ratio * 100).toFixed(0)}%<span className={s.hidden}> {label}</span></span>;
}

// Tiny single-series trend for a table row; the full chart lives on the project page.
function Trend({ points, label }: { points: number[]; label: string }) {
  if (points.length < 2) return <span className={s.deltaNone}>–</span>;
  const width = 96, height = 24, max = Math.max(1, ...points);
  const line = points.map((value, index) => `${index ? "L" : "M"}${((index / (points.length - 1)) * width).toFixed(1)} ${(height - 2 - (value / max) * (height - 5)).toFixed(1)}`).join(" ");
  return <svg className={s.trend} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${label}: peak ${number.format(max)} a day`}><title>{`${label} · peak ${number.format(max)} a day`}</title><path d={line} vectorEffect="non-scaling-stroke" /></svg>;
}

// Daily columns with a hover/focus readout; one hue, 2px gaps, rounded data ends.
function Bars({ label, points, format }: { label: string; points: { date: string; value: number }[]; format: (value: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  if (!points.length) return null;
  const width = 300, height = 72, max = Math.max(1, ...points.map(point => point.value)), step = width / points.length, bar = Math.max(2, step - 2);
  const shown = active ?? points.length - 1, point = points[shown];
  return <figure className={s.bars}>
    <figcaption><span>{label}</span><span aria-live="polite">{day(point.date)} · <b>{format(point.value)}</b></span></figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" tabIndex={0} aria-label={`${label}, ${points.length} days, peak ${format(max)}`}
      onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); setActive(Math.min(points.length - 1, Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * points.length)))); }}
      onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)}
      onKeyDown={event => { if (event.key === "ArrowLeft") setActive(Math.max(0, shown - 1)); if (event.key === "ArrowRight") setActive(Math.min(points.length - 1, shown + 1)); }}>
      <line x1="0" x2={width} y1={height - 0.5} y2={height - 0.5} className={s.baseline} />
      {points.map((item, index) => {
        const h = item.value ? Math.max(3, (item.value / max) * (height - 4)) : 0;
        return <rect key={item.date} x={index * step + 1} y={height - h} width={bar} height={h} rx={Math.min(2, bar / 2)} className={s.bar} data-active={index === shown && active !== null || undefined} />;
      })}
    </svg>
  </figure>;
}

function Meter({ rows, onOpen }: { rows: { id?: string; label: string; value: number; detail?: string }[]; onOpen?: (id: string) => void }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return <ol className={s.meter}>{rows.map(row => <li key={row.label}>
    {row.id && onOpen ? <button onClick={() => onOpen(row.id!)}>{row.label}</button> : <span>{row.label}</span>}
    <b>{row.detail ?? number.format(row.value)}</b>
    <i aria-hidden="true"><em style={{ width: `${(row.value / max) * 100}%` }} /></i>
  </li>)}</ol>;
}

function Tile({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: ReactNode }) {
  return <div className={s.tile}><span>{label}</span><strong>{value}</strong><small>{children}{children && sub ? " " : ""}{sub}</small></div>;
}

function SiteCell({ site, onOpen }: { site: OverviewSite; onOpen: (id: string) => void }) {
  return <div className={s.siteCell}><button onClick={() => onOpen(site.projectId)} title={`Open ${site.projectName}`}>{site.label}</button><a href={site.insights.url} target="_blank" rel="noopener noreferrer">{hostOf(site.insights.url)} ↗</a></div>;
}

function useSort(initial: Sort) {
  const [sort, setSort] = useState(initial);
  const toggle = (key: string) => setSort(current => current.key === key ? { key, desc: !current.desc } : { key, desc: true });
  return [sort, toggle] as const;
}
function sorted(sites: OverviewSite[], columns: Column[], sort: Sort) {
  const column = columns.find(item => item.key === sort.key);
  if (!column) return sites;
  return [...sites].sort((a, b) => {
    const x = column.value(a), y = column.value(b);
    // Missing values sink, whichever way the column is sorted.
    if (x === null || y === null) return x === null ? (y === null ? 0 : 1) : -1;
    const order = typeof x === "string" || typeof y === "string" ? String(x).localeCompare(String(y)) : x - y;
    return sort.desc ? -order : order;
  });
}
function Table({ caption, columns, sites, sort, onSort, unavailable, serviceAccount, onOpen }: { caption: string; columns: Column[]; sites: OverviewSite[]; sort: Sort; onSort: (key: string) => void; unavailable: (site: OverviewSite) => Unavailable | null; serviceAccount: string; onOpen: (id: string) => void }) {
  const ready = sites.filter(site => !unavailable(site)), missing = sites.filter(site => unavailable(site));
  const showTotals = ready.length > 1 && columns.some(column => column.total);
  return <div className={s.tableWrap}><table className={s.table}>
    <caption className={s.hidden}>{caption}</caption>
    <thead><tr>{columns.map(column => <th key={column.key} scope="col" aria-sort={sort.key === column.key ? (sort.desc ? "descending" : "ascending") : undefined} title={column.title}>
      <button onClick={() => onSort(column.key)}>{column.label}<span aria-hidden="true">{sort.key === column.key ? (sort.desc ? " ↓" : " ↑") : ""}</span></button></th>)}</tr></thead>
    <tbody>
      {sorted(ready, columns, sort).map(site => <tr key={site.insights.url}>{columns.map((column, index) => index === 0 ? <th key={column.key} scope="row">{column.render(site)}</th> : <td key={column.key}>{column.render(site)}</td>)}</tr>)}
      {missing.map(site => { const detail = unavailable(site)!; return <tr key={site.insights.url} className={s.missing}><th scope="row"><SiteCell site={site} onOpen={onOpen} /></th><td colSpan={columns.length - 1}>{detail.error}{detail.setup && <CopyButton text={serviceAccount} />}</td></tr>; })}
    </tbody>
    {showTotals && <tfoot><tr>{columns.map((column, index) => index === 0 ? <th key={column.key} scope="row">All sites <small>{ready.length}</small></th> : <td key={column.key}>{column.total?.(ready) ?? ""}</td>)}</tr></tfoot>}
  </table></div>;
}
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return <button className={s.inlineButton} onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true), () => setCopied(false))}>{copied ? "Copied" : "Copy service account"}</button>;
}

function analyticsColumns(measure: Measure, onOpen: (id: string) => void): Column[] {
  const period = (index: number) => (site: OverviewSite) => ga(site)?.periods[index]?.[measure] ?? null;
  const metricOf = (site: OverviewSite) => ga(site)?.[measure] ?? null;
  const totalPeriod = (index: number) => (sites: OverviewSite[]) => number.format(sum(sites.map(period(index))) ?? 0);
  const engaged = (sites: OverviewSite[]) => {
    const sessions = sum(sites.map(site => ga(site)?.periods[3].sessions)) ?? 0;
    return sessions ? percent(sites.reduce((total, site) => total + (ga(site)?.periods[3].engagementRate ?? 0) * (ga(site)?.periods[3].sessions ?? 0), 0) / sessions) : "–";
  };
  const periodColumn = (index: number, key: string, label: string): Column => ({ key, label, value: period(index), render: site => number.format(period(index)(site) ?? 0), total: totalPeriod(index) });
  return [
    { key: "site", label: "Site", value: site => site.label.toLowerCase(), render: site => <SiteCell site={site} onOpen={onOpen} /> },
    { key: "now", label: "Now", title: "Active users in the last 30 minutes (hidden for shared properties and section URLs)", value: site => ga(site)?.realtimeUsers ?? null, render: site => { const now = ga(site)?.realtimeUsers; return now === null || now === undefined ? <span className={s.deltaNone}>–</span> : <span className={s.now} data-live={now > 0 || undefined}>{now > 0 && <i />}{number.format(now)}</span>; }, total: sites => number.format(sum(sites.map(site => ga(site)?.realtimeUsers)) ?? 0) },
    periodColumn(0, "today", "Today"), periodColumn(1, "yesterday", "Yesterday"), periodColumn(2, "week", "7 days"), periodColumn(3, "month", "30 days"),
    { key: "change", label: "vs prior 30", title: "Last 30 days against the 30 before", value: site => { const m = metricOf(site); return m ? change(m.value, m.previous) : null; }, render: site => { const m = metricOf(site); return <Delta value={m?.value ?? null} previous={m?.previous ?? null} label="vs the previous 30 days" />; }, total: sites => <Delta value={sum(sites.map(site => metricOf(site)?.value))} previous={sum(sites.map(site => metricOf(site)?.previous))} label="vs the previous 30 days" /> },
    { key: "engaged", label: "Engaged", title: "Engagement rate, last 30 days", value: site => ga(site)?.periods[3].sessions ? ga(site)!.periods[3].engagementRate : null, render: site => ga(site)?.periods[3].sessions ? percent(ga(site)!.periods[3].engagementRate) : "–", total: engaged },
    { key: "trend", label: "Daily users", title: "Daily users, last 30 days", value: site => ga(site)?.users.value ?? null, render: site => <Trend points={ga(site)?.daily.map(point => point.users) ?? []} label={`${site.label} daily users`} /> },
    { key: "source", label: "Top source", title: "Largest channel by sessions, last 30 days", value: site => ga(site)?.channels[0]?.name ?? null, render: site => { const data = ga(site), first = data?.channels[0], all = data?.channels.reduce((total, item) => total + item.sessions, 0) ?? 0; return first ? <span className={s.source}>{first.name}<small>{all ? `${Math.round((first.sessions / all) * 100)}%` : ""}</small></span> : "–"; } },
    { key: "page", label: "Top page · 30d", value: site => ga(site)?.topPages[0]?.path ?? null, render: site => { const page = ga(site)?.topPages[0]; return page ? <span className={s.page} title={`${page.path} · ${number.format(page.views)} views`}>{page.path}</span> : "–"; } },
    { key: "links", label: "", value: () => null, render: site => site.insights.links.analytics ? <a className={s.out} href={site.insights.links.analytics} target="_blank" rel="noopener noreferrer" aria-label={`Open ${site.label} in Google Analytics`}>GA ↗</a> : null },
  ];
}
function searchColumns(onOpen: (id: string) => void): Column[] {
  const metric = (key: "clicks" | "impressions" | "ctr" | "position") => (site: OverviewSite) => sc(site)?.[key].value ?? null;
  return [
    { key: "site", label: "Site", value: site => site.label.toLowerCase(), render: site => <SiteCell site={site} onOpen={onOpen} /> },
    { key: "clicks", label: "Clicks · 28d", value: metric("clicks"), render: site => <>{number.format(sc(site)?.clicks.value ?? 0)} <Delta value={sc(site)?.clicks.value ?? null} previous={sc(site)?.clicks.previous ?? null} /></>, total: sites => number.format(sum(sites.map(metric("clicks"))) ?? 0) },
    { key: "impressions", label: "Impressions", value: metric("impressions"), render: site => <>{compact.format(sc(site)?.impressions.value ?? 0)} <Delta value={sc(site)?.impressions.value ?? null} previous={sc(site)?.impressions.previous ?? null} /></>, total: sites => compact.format(sum(sites.map(metric("impressions"))) ?? 0) },
    { key: "ctr", label: "Click rate", value: metric("ctr"), render: site => sc(site)?.impressions.value ? percent(sc(site)!.ctr.value) : "–" },
    { key: "position", label: "Avg position", value: metric("position"), render: site => sc(site)?.position.value ? <>{sc(site)!.position.value.toFixed(1)} <Delta value={sc(site)!.position.value} previous={sc(site)!.position.previous} inverse /></> : "–" },
    { key: "query", label: "Top search", value: site => sc(site)?.topQueries[0]?.query ?? null, render: site => { const query = sc(site)?.topQueries[0]; return query ? <span className={s.page} title={`${query.query} · ${query.clicks} clicks`}>{query.query}</span> : "–"; } },
    { key: "sitemap", label: "Sitemaps", value: site => sc(site)?.sitemaps.reduce((total, map) => total + map.errors * 100 + map.warnings, 0) ?? null, render: site => { const maps = sc(site)?.sitemaps ?? []; const errors = maps.reduce((total, map) => total + map.errors, 0), warnings = maps.reduce((total, map) => total + map.warnings, 0); return !maps.length ? <span className={s.deltaNone}>None</span> : <span className={s.status} data-tone={errors ? "bad" : warnings ? "warn" : "good"}>{errors ? `${errors} ${errors === 1 ? "error" : "errors"}` : warnings ? `${warnings} ${warnings === 1 ? "warning" : "warnings"}` : "OK"}</span>; } },
    { key: "links", label: "", value: () => null, render: site => <a className={s.out} href={site.insights.links.searchConsole} target="_blank" rel="noopener noreferrer" aria-label={`Open ${site.label} in Search Console`}>GSC ↗</a> },
  ];
}
function healthColumns(onOpen: (id: string) => void): Column[] {
  return [
    { key: "site", label: "Site", value: site => site.label.toLowerCase(), render: site => <SiteCell site={site} onOpen={onOpen} /> },
    { key: "uptime", label: "Status", value: site => site.insights.uptime.ok ? 1 : 0, render: site => { const up = site.insights.uptime; return <span className={s.status} data-tone={up.ok ? "good" : "bad"}>{up.ok ? "Online" : "Not responding"}{up.status ? ` · ${up.status}` : ""}</span>; } },
    { key: "ms", label: "Response", title: "Time to first response from the server", value: site => site.insights.uptime.ms, render: site => site.insights.uptime.ms === null ? "–" : <span data-slow={site.insights.uptime.ms > 1500 || undefined} className={s.ms}>{number.format(site.insights.uptime.ms)} ms</span> },
    { key: "project", label: "Project", value: site => site.projectName.toLowerCase(), render: site => <button className={s.inlineButton} onClick={() => onOpen(site.projectId)}>{site.projectName}</button> },
    { key: "property", label: "GA4 property", value: site => ga(site)?.propertyName ?? null, render: site => ga(site)?.propertyName ?? <span className={s.deltaNone}>Not connected</span> },
    { key: "checked", label: "Checked", value: site => site.insights.fetchedAt, render: site => when(site.insights.fetchedAt) },
    { key: "links", label: "", value: () => null, render: site => <a className={s.out} href={site.insights.links.pageSpeed} target="_blank" rel="noopener noreferrer" aria-label={`Test ${site.label} in PageSpeed Insights`}>PageSpeed ↗</a> },
  ];
}

function Journal({ data, now, onOpen }: { data: JournalStats; now: number; onOpen: (id: string) => void }) {
  const statuses = [["active", "In progress"], ["waiting", "Waiting"], ["review", "Review"], ["paused", "Paused"], ["idea", "Idea"], ["complete", "Complete"]] as const;
  return <>
    <article className={s.card}>
      <header><h3>Studio activity</h3><span>{number.format(data.total)} updates · 30 days <Delta value={data.total} previous={data.previous} label="vs the previous 30 days" /></span></header>
      <Bars label="Journal updates per day" points={data.daily.map(point => ({ date: point.date, value: point.count }))} format={value => `${value} ${value === 1 ? "update" : "updates"}`} />
      <p className={s.note}>{data.milestones} milestones · {data.openDecisions} open decisions across projects{data.capped ? " · capped at 5,000 entries" : ""}</p>
      <div className={s.statusRow}>{statuses.map(([key, label]) => <span key={key} data-status={key}><b>{data.statusCounts[key] ?? 0}</b>{label}</span>)}</div>
    </article>
    <article className={s.card}>
      <header><h3>Most active projects</h3><span>Updates · 30 days</span></header>
      {data.byProject.length ? <Meter rows={data.byProject.map(row => ({ id: row.projectId, label: row.name, value: row.count }))} onOpen={onOpen} /> : <p className={s.note}>No work recorded in the last 30 days.</p>}
    </article>
    <article className={s.card}>
      <header><h3>Who did the work</h3><span>Updates · 30 days</span></header>
      {data.byAuthor.length ? <Meter rows={data.byAuthor.map(row => ({ label: row.author, value: row.count }))} /> : <p className={s.note}>No work recorded yet.</p>}
      {data.byKind.length > 0 && <p className={s.note}>{data.byKind.map(row => `${row.count} ${row.kind}`).join(" · ")}</p>}
    </article>
    <article className={s.card}>
      <header><h3>Gone quiet</h3><span>In progress, no update for 14+ days</span></header>
      {data.stale.length ? <ul className={s.quiet}>{data.stale.slice(0, 8).map(row => <li key={row.projectId}><button onClick={() => onOpen(row.projectId)}>{row.name}</button><span>{row.lastWorkedAt ? `${Math.floor((now - Date.parse(row.lastWorkedAt)) / 86_400_000)} days` : "Never"}</span></li>)}</ul> : <p className={s.note}>Every active project has moved in the last two weeks.</p>}
    </article>
  </>;
}
function Shop({ data }: { data: ShopStats }) {
  return <article className={`${s.card} ${s.wide}`}>
    <header><h3>Shop sales{!data.live && <small className={s.test}>Stripe test mode</small>}</h3><span>{money.format(data.revenueCents / 100)} · {data.orders} {data.orders === 1 ? "order" : "orders"} · 30 days <Delta value={data.revenueCents} previous={data.previousRevenueCents} label="vs the previous 30 days" /></span></header>
    <div className={s.shopGrid}>
      <Bars label="Revenue per day" points={data.daily.map(point => ({ date: point.date, value: point.cents }))} format={value => money.format(value / 100)} />
      <div><h4>Best sellers</h4>{data.topItems.length ? <Meter rows={data.topItems.map(item => ({ label: item.name, value: item.count, detail: `${item.count} · ${money.format(item.cents / 100)}` }))} /> : <p className={s.note}>No sales in the last 30 days.</p>}</div>
      <div><h4>Latest orders</h4>{data.recent.length ? <ul className={s.quiet}>{data.recent.map(order => <li key={order.at}><span title={order.items.join(", ")}>{order.items.join(", ") || "Order"}</span><span>{money.format(order.cents / 100)} · {when(order.at)}</span></li>)}</ul> : <p className={s.note}>None yet.</p>}</div>
    </div>
  </article>;
}

export function AnalyticsView({ api, onOpenProject }: { api: Api; onOpenProject: (id: string) => void }) {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [measure, setMeasure] = useState<Measure>("users");
  const [gaSort, sortGa] = useSort({ key: "month", desc: true });
  const [scSort, sortSc] = useSort({ key: "clicks", desc: true });
  const [upSort, sortUp] = useSort({ key: "ms", desc: true });
  const request = useRef(0);
  const load = useCallback(async (refresh = false) => {
    const version = ++request.current;
    setLoading(true); setError("");
    try { const result = await api(`/api/projects/analytics${refresh ? "?refresh=1" : ""}`) as AnalyticsOverview; if (version === request.current) setData(result); }
    catch (err) { if (version === request.current) setError(err instanceof Error ? err.message : "Analytics could not be loaded."); }
    finally { if (version === request.current) setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  if (!data) return <div className={s.root}>{error ? <div className={s.error} role="alert"><span>{error}</span><button onClick={() => void load()}>Try again</button></div> : <p className={s.loading} role="status">Gathering Google Analytics, Search Console, Stripe and journal numbers… the first load can take a few seconds.</p>}</div>;

  const sites = data.sites, analytics = sites.map(ga), search = sites.map(sc);
  const users = sum(analytics.map(item => item?.users.value)), usersBefore = sum(analytics.map(item => item?.users.previous));
  const clicks = sum(search.map(item => item?.clicks.value)), clicksBefore = sum(search.map(item => item?.clicks.previous));
  const live = sum(analytics.map(item => item?.realtimeUsers)), online = sites.filter(site => site.insights.uptime.ok).length;
  const today = sum(analytics.map(item => item?.periods[0].users));
  const shop = isUnavailable(data.shop) ? null : data.shop, journal = isUnavailable(data.journal) ? null : data.journal;

  return <div className={s.root} aria-busy={loading}>
    <div className={s.tiles}>
      <Tile label="Visitors · 30 days" value={users === null ? "–" : compact.format(users)}><Delta value={users} previous={usersBefore} label="vs the previous 30 days" /></Tile>
      <Tile label="Today so far" value={today === null ? "–" : number.format(today)} sub={live === null ? "users" : `${number.format(live)} on the sites now`} />
      <Tile label="Search clicks · 28 days" value={clicks === null ? "–" : compact.format(clicks)}><Delta value={clicks} previous={clicksBefore} label="vs the previous 28 days" /></Tile>
      <Tile label="Sites online" value={`${online}/${sites.length}`} sub={online === sites.length ? "All responding" : `${sites.length - online} not responding`} />
      <Tile label="Shop · 30 days" value={shop ? money.format(shop.revenueCents / 100) : "–"} sub={shop ? `${shop.orders} ${shop.orders === 1 ? "order" : "orders"}` : "Unavailable"}>{shop && <Delta value={shop.revenueCents} previous={shop.previousRevenueCents} />}</Tile>
      <Tile label="Journal updates · 30 days" value={journal ? number.format(journal.total) : "–"}>{journal && <Delta value={journal.total} previous={journal.previous} />}</Tile>
    </div>
    {error && <div className={s.error} role="alert"><span>{error}</span><button onClick={() => void load(true)}>Try again</button></div>}

    <section className={s.section}>
      <header className={s.sectionHead}>
        <div><h2>Google Analytics</h2><p>Every project website, filtered to its own host. Today is Pacific time and fills in through the day.</p></div>
        <div className={s.controls}>
          <div className={s.segment} role="group" aria-label="Measure">{MEASURES.map(item => <button key={item.id} aria-pressed={measure === item.id} onClick={() => setMeasure(item.id)}>{item.label}</button>)}</div>
          <span className={s.updated}>Updated {when(data.fetchedAt)}</span>
          <button className={s.refresh} onClick={() => void load(true)} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
        </div>
      </header>
      {sites.length ? <Table caption={`Google Analytics ${measure} by site`} columns={analyticsColumns(measure, onOpenProject)} sites={sites} sort={gaSort} onSort={sortGa} unavailable={site => isUnavailable(site.insights.analytics) ? site.insights.analytics : null} serviceAccount={data.serviceAccount} onOpen={onOpenProject} />
        : <p className={s.note}>No project lists a website yet. Add one under Edit project → Websites.</p>}
    </section>

    {sites.length > 0 && <section className={s.section}>
      <header className={s.sectionHead}><div><h2>Google Search</h2><p>Search Console, last 28 days of final data against the 28 before.</p></div></header>
      <Table caption="Search Console performance by site" columns={searchColumns(onOpenProject)} sites={sites} sort={scSort} onSort={sortSc} unavailable={site => isUnavailable(site.insights.search) ? site.insights.search : null} serviceAccount={data.serviceAccount} onOpen={onOpenProject} />
    </section>}

    {sites.length > 0 && <section className={s.section}>
      <header className={s.sectionHead}><div><h2>Site health</h2><p>A live request to each address when the numbers refresh.</p></div></header>
      <Table caption="Uptime and response time by site" columns={healthColumns(onOpenProject)} sites={sites} sort={upSort} onSort={sortUp} unavailable={() => null} serviceAccount={data.serviceAccount} onOpen={onOpenProject} />
    </section>}

    <section className={s.section}>
      <header className={s.sectionHead}><div><h2>Inside the studio</h2><p>From the project journal and Stripe.</p></div></header>
      <div className={s.cards}>
        {shop ? <Shop data={shop} /> : <article className={`${s.card} ${s.wide}`}><header><h3>Shop sales</h3></header><p className={s.note}>{(data.shop as Unavailable).error}</p></article>}
        {journal ? <Journal data={journal} now={Date.parse(data.fetchedAt)} onOpen={onOpenProject} /> : <article className={s.card}><header><h3>Studio activity</h3></header><p className={s.note}>{(data.journal as Unavailable).error}</p></article>}
      </div>
    </section>
  </div>;
}
