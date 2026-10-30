"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isUnavailable, type AnalyticsSummary, type InsightsSummary, type Metric, type ProjectInsights, type SearchSummary, type SiteInsights, type Unavailable } from "@/lib/projects/insights-model";
import type { ProjectSite } from "@/lib/projects/model";
import s from "./website-insights.module.css";

type Api = (url?: string) => Promise<unknown>;
const number = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const day = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const hostOf = (url: string) => { try { const parsed = new URL(url); return parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/$/, ""); } catch { return url; } };

// Change against the previous 28 days; position improves as it falls.
function Delta({ metric, inverse = false }: { metric: Metric; inverse?: boolean }) {
  if (metric.previous === null || metric.previous === 0) return null;
  const change = (metric.value - metric.previous) / metric.previous;
  if (!Number.isFinite(change) || Math.abs(change) < 0.005) return <small className={s.delta}>no change</small>;
  const better = inverse ? change < 0 : change > 0;
  return <small className={s.delta} data-tone={better ? "up" : "down"}>{change > 0 ? "▲" : "▼"} {Math.abs(change * 100).toFixed(0)}%<span className={s.visuallyHidden}> vs previous 28 days</span></small>;
}
export function deltaText(value: number | null, previous: number | null) {
  if (value === null || !previous) return "";
  const change = (value - previous) / previous;
  return Math.abs(change) < 0.005 ? "" : `${change > 0 ? "▲" : "▼"}${Math.abs(change * 100).toFixed(0)}%`;
}
function Stat({ label, value, metric, inverse }: { label: string; value: string; metric: Metric; inverse?: boolean }) {
  return <div className={s.stat}><span>{label}</span><strong>{value}</strong><Delta metric={metric} inverse={inverse} /></div>;
}

// A single-series line: one hue, 2px stroke, crosshair and value on hover or focus.
function Sparkline({ label, points }: { label: string; points: { date: string; value: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length < 2) return null;
  const width = 280, height = 56, max = Math.max(1, ...points.map(point => point.value));
  const x = (index: number) => (index / (points.length - 1)) * width, y = (value: number) => height - 3 - (value / max) * (height - 8);
  const line = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");
  const shown = active ?? points.length - 1, point = points[shown];
  return <figure className={s.spark}>
    <figcaption><span>{label}</span><span aria-live="polite">{day(point.date)} · <b>{number.format(point.value)}</b></span></figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${label}, last ${points.length} days, peak ${number.format(max)}`} tabIndex={0}
      onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); setActive(Math.round(((event.clientX - box.left) / box.width) * (points.length - 1))); }}
      onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)}
      onKeyDown={event => { if (event.key === "ArrowLeft") setActive(Math.max(0, shown - 1)); if (event.key === "ArrowRight") setActive(Math.min(points.length - 1, shown + 1)); }}>
      <line x1="0" x2={width} y1={height - 3} y2={height - 3} className={s.baseline} />
      <path d={`${line} L${width} ${height - 3} L0 ${height - 3} Z`} className={s.area} />
      <path d={line} className={s.line} vectorEffect="non-scaling-stroke" />
      {active !== null && <line x1={x(shown)} x2={x(shown)} y1="0" y2={height} className={s.crosshair} vectorEffect="non-scaling-stroke" />}
    </svg>
  </figure>;
}
function Setup({ section, detail, serviceAccount }: { section: string; detail: Unavailable; serviceAccount: string }) {
  const [copied, setCopied] = useState(false);
  return <div className={s.setup} role="note"><p><b>{section}</b> {detail.error}</p>
    {detail.setup && <button type="button" className={s.linkButton} onClick={() => void navigator.clipboard.writeText(serviceAccount).then(() => setCopied(true), () => setCopied(false))}>{copied ? "Service account copied" : "Copy service account"}</button>}
  </div>;
}
function List({ title, rows, empty }: { title: string; rows: { label: string; value: string }[]; empty?: string }) {
  if (!rows.length && !empty) return null;
  return <div className={s.list}><h4>{title}</h4>{rows.length ? <ol>{rows.map(row => <li key={row.label}><span title={row.label}>{row.label}</span><b>{row.value}</b></li>)}</ol> : <p className={s.note}>{empty}</p>}</div>;
}
// Periods match MenuToEat's Mission Control: today, yesterday, 7 and 30 days, with the 30-day change.
function Analytics({ data }: { data: AnalyticsSummary }) {
  const month = [data.users, data.sessions, data.views, data.engagementRate];
  return <div className={s.block}>
    <div className={s.blockHead}><h4>Visitors <small>Google Analytics · {data.propertyName}</small></h4>{data.realtimeUsers !== null && <span className={s.live}><i />{number.format(data.realtimeUsers)} on the site now</span>}</div>
    <table className={s.periods}>
      <thead><tr><th scope="col"><span className={s.visuallyHidden}>Period</span></th><th scope="col">Users</th><th scope="col">Sessions</th><th scope="col">Page views</th><th scope="col">Engaged</th></tr></thead>
      <tbody>{data.periods.map((period, index) => <tr key={period.label} data-today={index === 0 || undefined}>
        <th scope="row">{period.label}</th>
        {[period.users, period.sessions, period.views].map((value, column) => <td key={column}>{number.format(value)}{index === 3 && <Delta metric={month[column]} />}</td>)}
        <td>{period.sessions ? percent(period.engagementRate) : "–"}{index === 3 && <Delta metric={month[3]} />}</td>
      </tr>)}</tbody>
    </table>
    <p className={s.note}>Change compares the last 30 days with the 30 before. Today is in the property’s time zone and fills in through the day.</p>
    <Sparkline label="Daily users · 30 days" points={data.daily.map(point => ({ date: point.date, value: point.users }))} />
    <div className={s.lists}>
      <List title="Top pages today" rows={data.topPagesToday.map(row => ({ label: row.path, value: number.format(row.views) }))} empty="No page views yet today" />
      <List title="Top pages · 30 days" rows={data.topPages.map(row => ({ label: row.path, value: number.format(row.views) }))} />
      <List title="How they arrived · 30 days" rows={data.channels.map(row => ({ label: row.name, value: number.format(row.sessions) }))} />
    </div>
  </div>;
}
function Search({ data }: { data: SearchSummary }) {
  const errors = data.sitemaps.reduce((sum, map) => sum + map.errors, 0), warnings = data.sitemaps.reduce((sum, map) => sum + map.warnings, 0);
  return <div className={s.block}>
    <div className={s.blockHead}><h4>Google Search <small>{day(data.range.start)}–{day(data.range.end)}</small></h4>
      {data.sitemaps.length > 0 && <span className={s.sitemap} data-tone={errors ? "bad" : warnings ? "warn" : "good"}>{errors ? `Sitemap: ${errors} ${errors === 1 ? "error" : "errors"}` : warnings ? `Sitemap: ${warnings} ${warnings === 1 ? "warning" : "warnings"}` : `${data.sitemaps.length} ${data.sitemaps.length === 1 ? "sitemap" : "sitemaps"} OK`}</span>}</div>
    <div className={s.stats}><Stat label="Clicks" value={compact.format(data.clicks.value)} metric={data.clicks} /><Stat label="Impressions" value={compact.format(data.impressions.value)} metric={data.impressions} /><Stat label="Click rate" value={percent(data.ctr.value)} metric={data.ctr} /><Stat label="Avg position" value={data.position.value ? data.position.value.toFixed(1) : "–"} metric={data.position} inverse /></div>
    <Sparkline label="Daily search clicks" points={data.daily.map(point => ({ date: point.date, value: point.clicks }))} />
    <div className={s.lists}><List title="Top searches" rows={data.topQueries.map(row => ({ label: row.query, value: `${number.format(row.clicks)} · #${row.position.toFixed(1)}` }))} /><List title="Top landing pages" rows={data.topPages.map(row => ({ label: hostOf(row.page), value: number.format(row.clicks) }))} /></div>
  </div>;
}
function Site({ site, label, serviceAccount }: { site: SiteInsights; label: string; serviceAccount: string }) {
  const up = site.uptime;
  return <article className={s.site}>
    <header className={s.siteHead}>
      <div><h3>{label}</h3><a href={site.url} target="_blank" rel="noopener noreferrer">{hostOf(site.url)} ↗</a></div>
      <span className={s.uptime} data-ok={up.ok}><i />{up.ok ? `Online · ${up.ms ?? "–"} ms` : `Not responding${up.status ? ` · ${up.status}` : ""}`}</span>
    </header>
    <nav className={s.tools} aria-label={`${label} tools`}>
      <a href={site.links.site} target="_blank" rel="noopener noreferrer">Visit site</a>
      {site.links.analytics && <a href={site.links.analytics} target="_blank" rel="noopener noreferrer">Analytics</a>}
      <a href={site.links.searchConsole} target="_blank" rel="noopener noreferrer">Search Console</a>
      <a href={site.links.pageSpeed} target="_blank" rel="noopener noreferrer">PageSpeed</a>
    </nav>
    {isUnavailable(site.analytics) ? <Setup section="Analytics:" detail={site.analytics} serviceAccount={serviceAccount} /> : <Analytics data={site.analytics} />}
    {isUnavailable(site.search) ? <Setup section="Search Console:" detail={site.search} serviceAccount={serviceAccount} /> : <Search data={site.search} />}
  </article>;
}
export function WebsiteInsights({ projectId, sites, api }: { projectId: string; sites: ProjectSite[]; api: Api }) {
  const [data, setData] = useState<ProjectInsights | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const key = sites.map(site => site.url).join(" ");
  const request = useRef(0);
  // Only the latest request may update the panel, so a slow response for an earlier project or site list is ignored.
  const load = useCallback(async (refresh = false) => {
    const version = ++request.current;
    setLoading(true); setError("");
    try { const result = await api(`/api/projects/insights?project=${encodeURIComponent(projectId)}${refresh ? "&refresh=1" : ""}`) as ProjectInsights; if (version === request.current) setData(result); }
    catch (err) { if (version === request.current) setError(err instanceof Error ? err.message : "Website summaries could not be loaded."); }
    finally { if (version === request.current) setLoading(false); }
  }, [api, projectId]);
  useEffect(() => { if (key) void load(); else { request.current++; setData(null); } }, [key, load]);
  if (!sites.length) return null;
  const current = data?.projectId === projectId && data.sites.map(site => site.url).join(" ") === key ? data : null;
  return <section className={s.panel} aria-busy={loading}>
    <div className={s.panelHead}><h2>Websites</h2><span>{current ? `Updated ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(current.sites[0]?.fetchedAt ?? Date.now()))}` : ""}<button type="button" className={s.linkButton} onClick={() => void load(true)} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></span></div>
    {error && <p className={s.error} role="alert">{error}</p>}
    {!current ? <div className={s.sites}>{sites.map(site => <article key={site.url} className={s.site}><header className={s.siteHead}><div><h3>{site.label}</h3><a href={site.url} target="_blank" rel="noopener noreferrer">{hostOf(site.url)} ↗</a></div></header>{!error && <p className={s.loading} role="status">Loading Google summaries…</p>}</article>)}</div>
      : <div className={s.sites}>{current.sites.map(site => <Site key={site.url} site={site} label={sites.find(item => item.url === site.url)?.label ?? hostOf(site.url)} serviceAccount={current.serviceAccount} />)}</div>}
  </section>;
}
// Compact line for project cards: 30-day visitors, 28-day search clicks, and any site that is down.
export function CardInsights({ summary }: { summary?: InsightsSummary }) {
  if (!summary) return null;
  const parts = [
    summary.users !== null && <span key="users">{compact.format(summary.users)} visitors · 30d <em data-tone={(summary.usersBefore ?? 0) > summary.users ? "down" : "up"}>{deltaText(summary.users, summary.usersBefore)}</em></span>,
    summary.clicks !== null && <span key="clicks">{compact.format(summary.clicks)} search clicks <em data-tone={(summary.clicksBefore ?? 0) > summary.clicks ? "down" : "up"}>{deltaText(summary.clicks, summary.clicksBefore)}</em></span>,
    summary.down > 0 && <span key="down" className={s.cardDown}>{summary.down} {summary.down === 1 ? "site" : "sites"} not responding</span>,
  ].filter(Boolean);
  if (!parts.length) return null;
  return <p className={s.cardInsights} aria-label="Website summary: visitors over 30 days, search clicks over 28 days">{parts}</p>;
}
