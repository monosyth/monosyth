import "server-only";
import { GoogleAuth } from "google-auth-library";
import type { AnalyticsSummary, Metric, SearchSummary, SiteInsights, Unavailable } from "./insights-model";

export const INSIGHTS_SERVICE_ACCOUNT = process.env.MONOSYTH_INSIGHTS_SERVICE_ACCOUNT?.trim() || "firebase-app-hosting-compute@monosyth.iam.gserviceaccount.com";

type Options = { refresh?: boolean; fetcher?: typeof fetch; token?: () => Promise<string> };
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Property = { propertyId: string; displayName: string; shared: boolean };

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly", "https://www.googleapis.com/auth/webmasters.readonly"];
const INSIGHTS_TTL = 30 * 60_000;
const LIST_TTL = 60 * 60_000;
const DAY = 86_400_000;

class SetupError extends Error {}

const insightsCache = new Map<string, { at: number; value: SiteInsights }>();
let propertyCache: { at: number; map: Map<string, Property> } | null = null;
let propertyScan: Promise<Map<string, Property>> | null = null;
const MISS_TTL = 5 * 60_000;
let siteListCache: { at: number; sites: { siteUrl: string; permissionLevel?: string }[] } | null = null;
let auth: GoogleAuth | null = null;

async function defaultToken() {
  auth ??= new GoogleAuth({ scopes: SCOPES });
  const token = await auth.getAccessToken();
  if (!token) throw new SetupError("No Google access token available.");
  return token;
}

const setupMessage = (what: string, where: string) =>
  `Google denied access to ${what}. Add ${INSIGHTS_SERVICE_ACCOUNT} as a Viewer in ${where}.`;

class Google {
  constructor(private fetcher: typeof fetch, private token: () => Promise<string>) {}
  async call(url: string, body?: unknown): Promise<Json> {
    let token: string;
    try { token = await this.token(); } catch { throw new SetupError("Google credentials are missing the analytics/search scopes."); }
    const response = await this.fetcher(url, {
      method: body === undefined ? "GET" : "POST",
      headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) throw new SetupError(`HTTP ${response.status}`);
    if (!response.ok) throw new Error(`Google returned HTTP ${response.status}.`);
    return (await response.json()) as Json;
  }
}

const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
// GA4 dates follow the property's time zone; Scott's properties report in Pacific time.
const pacificDay = (offset: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(Date.now() + offset * DAY);
// Google omits days without data; charts need every day of the range.
function fillDays(values: Map<string, number>, start: string, end: string): [string, number][] {
  const days: [string, number][] = [];
  for (let time = Date.parse(`${start}T00:00:00Z`); time <= Date.parse(`${end}T00:00:00Z`); time += DAY) days.push([iso(time), values.get(iso(time)) ?? 0]);
  return days;
}
const REALTIME_TTL = 2 * 60_000;
const realtimeCache = new Map<string, { at: number; value: number | null }>();
// The Realtime API has no page-path dimension, so section URLs show no "now" count rather than a site-wide one.
async function realtimeUsers(google: Google, propertyId: string, path: string, refresh = false) {
  if (path) return null;
  const cached = realtimeCache.get(propertyId);
  if (!refresh && cached && Date.now() - cached.at < REALTIME_TTL) return cached.value;
  const value = await google.call(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`, { metrics: [{ name: "activeUsers" }] })
    .then(data => num(data.rows?.[0]?.metricValues?.[0]?.value), () => null);
  realtimeCache.set(propertyId, { at: Date.now(), value });
  return value;
}
const num = (value: unknown) => Number(value) || 0;
const metric = (value: number, previous: number | null): Metric => ({ value, previous });
const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;
const failure = (error: unknown, what: string, where: string): Unavailable =>
  error instanceof SetupError ? { error: setupMessage(what, where), setup: true } : { error: error instanceof Error ? error.message : `Could not load ${what}.` };

function parse(url: string) {
  const parsed = new URL(url);
  return { host: parsed.hostname.replace(/^www\./, ""), path: parsed.pathname.replace(/\/+$/, "") };
}

// Match hosts by the traffic each property actually received, so streams without a website address
// (Krowshea inside the monosyth property, FunParty) and unused duplicate properties resolve correctly.
// Stream addresses remain the fallback for a new site that has no traffic yet.
async function scanProperties(google: Google) {
  const properties: { property: string; displayName: string }[] = [];
  let pageToken = "";
  do {
    const page = await google.call(`https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`);
    for (const account of page.accountSummaries ?? []) for (const property of account.propertySummaries ?? []) properties.push({ property: property.property, displayName: property.displayName });
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  const traffic = new Map<string, { property: Property; views: number }>(), streams = new Map<string, Property>();
  // One unreadable property should not hide the others.
  await Promise.all(properties.map(async ({ property, displayName }) => {
    const propertyId = property.split("/").pop() ?? property;
    const [streamData, hostData] = await Promise.all([
      google.call(`https://analyticsadmin.googleapis.com/v1beta/${property}/dataStreams`).catch((): Json => ({})),
      google.call(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        dateRanges: [{ startDate: "90daysAgo", endDate: "today" }], dimensions: [{ name: "hostName" }], metrics: [{ name: "screenPageViews" }], limit: 50,
      }).catch((): Json => ({})),
    ]);
    const hosts = new Map<string, number>();
    for (const row of hostData.rows ?? []) {
      const name = String(row.dimensionValues?.[0]?.value ?? "").toLowerCase().replace(/^www\./, "");
      if (name.includes(".") && !/^[\d.]+$/.test(name) && !/(^|\.)(localhost|web\.app|firebaseapp\.com|hosted\.app)$/.test(name)) hosts.set(name, (hosts.get(name) ?? 0) + num(row.metricValues?.[0]?.value));
    }
    const entry = { propertyId, displayName: displayName ?? property, shared: hosts.size > 1 };
    for (const [name, views] of hosts) if (views > (traffic.get(name)?.views ?? 0)) traffic.set(name, { property: entry, views });
    for (const stream of streamData.dataStreams ?? []) {
      const uri = stream.webStreamData?.defaultUri;
      if (!uri) continue;
      try {
        const name = new URL(uri.includes("://") ? uri : `https://${uri}`).hostname.replace(/^www\./, "");
        if (!streams.has(name)) streams.set(name, entry);
      } catch { /* ignore malformed stream uri */ }
    }
  }));
  const map = new Map<string, Property>(streams);
  for (const [name, { property }] of traffic) map.set(name, property);
  propertyCache = { at: Date.now(), map };
  return map;
}

async function findProperty(google: Google, host: string): Promise<Property | null> {
  // Rescan after an hour, or sooner for a missing host so newly granted access appears; concurrent sites share one scan.
  const age = propertyCache ? Date.now() - propertyCache.at : Infinity;
  if (age > LIST_TTL || (!propertyCache?.map.has(host) && age > MISS_TTL)) {
    propertyScan ??= scanProperties(google).finally(() => { propertyScan = null; });
    return (await propertyScan).get(host) ?? null;
  }
  return propertyCache?.map.get(host) ?? null;
}

const PERIODS = [
  { label: "Today", startDate: "today", endDate: "today" }, { label: "Yesterday", startDate: "yesterday", endDate: "yesterday" },
  { label: "7 days", startDate: "7daysAgo", endDate: "yesterday" }, { label: "30 days", startDate: "30daysAgo", endDate: "yesterday" },
] as const;
const TOTALS = ["activeUsers", "sessions", "screenPageViews", "engagementRate"].map((name) => ({ name }));

// The same periods as MenuToEat's Mission Control: today, yesterday, 7 and 30 days, plus top pages today.
async function analyticsSummary(google: Google, host: string, path: string, property: Property): Promise<AnalyticsSummary> {
  // A property can collect several domains, so reports keep to this host (and www) plus any section path.
  const hostFilter = { filter: { fieldName: "hostName", inListFilter: { values: [host, `www.${host}`] } } };
  const filter = { dimensionFilter: path ? { andGroup: { expressions: [hostFilter, { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: path } } }] } } : hostFilter };
  const month = { startDate: "30daysAgo", endDate: "yesterday" };
  const pagesBy = (dateRange: { startDate: string; endDate: string }) => ({ dateRanges: [dateRange], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 5, ...filter });
  const base = `https://analyticsdata.googleapis.com/v1beta/properties/${property.propertyId}`;
  const [report, previous, realtime] = await Promise.all([
    google.call(`${base}:batchRunReports`, { requests: [
      { dateRanges: PERIODS.map(({ startDate, endDate }) => ({ startDate, endDate })), metrics: TOTALS, ...filter },
      { dateRanges: [month], dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }], orderBys: [{ dimension: { dimensionName: "date" } }], ...filter },
      pagesBy(month), pagesBy({ startDate: "today", endDate: "today" }),
      { dateRanges: [month], dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 5, ...filter },
    ] }),
    google.call(`${base}:runReport`, { dateRanges: [{ startDate: "60daysAgo", endDate: "31daysAgo" }], metrics: TOTALS, ...filter }).catch(() => null),
    // Realtime cannot filter by host, so a property shared by several sites shows no "now" count.
    property.shared ? null : realtimeUsers(google, property.propertyId, path),
  ]);
  const [totals, daily, pages, pagesToday, channels] = (report.reports ?? []) as Json[];
  // With several date ranges, rows are tagged date_range_0…3; a range without data has no row.
  const values = (index: number) => (totals?.rows ?? []).find((item: Json) => (item.dimensionValues?.[0]?.value ?? "date_range_0") === `date_range_${index}`)?.metricValues ?? [];
  const periods = PERIODS.map(({ label }, index) => {
    const row = values(index);
    return { label, users: num(row[0]?.value), sessions: num(row[1]?.value), views: num(row[2]?.value), engagementRate: round(num(row[3]?.value), 3) };
  });
  const latest = periods[3], before = previous?.rows?.[0]?.metricValues as Json[] | undefined;
  const prior = (index: number, places?: number) => before ? (places ? round(num(before[index]?.value), places) : num(before[index]?.value)) : null;
  const rows = (data: Json | undefined) => (data?.rows ?? []).map((item: Json) => ({ path: String(item.dimensionValues?.[0]?.value ?? ""), views: num(item.metricValues?.[0]?.value) }));
  return {
    propertyId: property.propertyId, propertyName: property.displayName, periods,
    users: metric(latest.users, prior(0)), sessions: metric(latest.sessions, prior(1)), views: metric(latest.views, prior(2)), engagementRate: metric(latest.engagementRate, prior(3, 3)),
    realtimeUsers: realtime,
    daily: fillDays(new Map((daily?.rows ?? []).map((item: Json) => {
      const date = String(item.dimensionValues?.[0]?.value ?? "");
      return [date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}` : date, num(item.metricValues?.[0]?.value)];
    })), pacificDay(-30), pacificDay(-1)).map(([date, users]) => ({ date, users })),
    topPages: rows(pages), topPagesToday: rows(pagesToday),
    channels: (channels?.rows ?? []).map((item: Json) => ({ name: String(item.dimensionValues?.[0]?.value ?? ""), sessions: num(item.metricValues?.[0]?.value) })),
  };
}

async function listSites(google: Google) {
  if (!siteListCache || Date.now() - siteListCache.at > LIST_TTL) {
    const data = await google.call("https://www.googleapis.com/webmasters/v3/sites");
    siteListCache = { at: Date.now(), sites: data.siteEntry ?? [] };
  }
  return siteListCache.sites;
}

// Prefer a domain property for the host or a parent domain, then the longest URL-prefix property covering the URL.
const matchSite = (sites: { siteUrl: string; permissionLevel?: string }[], host: string, path = "") => {
  const usable = sites.filter((site) => site.permissionLevel !== "siteUnverifiedUser").map((site) => site.siteUrl);
  const labels = host.split(".");
  for (let index = 0; index < labels.length - 1; index++) {
    const domain = `sc-domain:${labels.slice(index).join(".")}`;
    if (usable.includes(domain)) return domain;
  }
  const targets = [`https://${host}${path}/`, `https://www.${host}${path}/`, `http://${host}${path}/`, `http://www.${host}${path}/`];
  return usable.filter((site) => !site.startsWith("sc-domain:") && targets.some((target) => target.startsWith(site))).sort((a, b) => b.length - a.length)[0] ?? null;
};

async function searchSummary(google: Google, host: string, path: string, siteUrl: string): Promise<SearchSummary> {
  const end = Date.now() - 3 * DAY;
  const range = { start: iso(end - 27 * DAY), end: iso(end) };
  const previous = { start: iso(end - 55 * DAY), end: iso(end - 28 * DAY) };
  const base = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}`;
  const scope = path || (siteUrl !== `sc-domain:${host}` && siteUrl.startsWith("sc-domain:")) ? { dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: `${host}${path}` }] }] } : {};
  const query = (dates: { start: string; end: string }, extra: Json = {}) =>
    google.call(`${base}/searchAnalytics/query`, { startDate: dates.start, endDate: dates.end, ...extra, ...scope });
  const top = (dimension: string) => query(range, { dimensions: [dimension], rowLimit: 5 });
  const [now, before, daily, queries, pages, sitemaps] = await Promise.all([
    query(range), query(previous), query(range, { dimensions: ["date"], rowLimit: 100 }), top("query"), top("page"),
    google.call(`${base}/sitemaps`).catch((): Json => ({})),
  ]);
  const totals = (data: Json) => data.rows?.[0] ?? {};
  const a = totals(now), b = totals(before);
  const hasBefore = Boolean(before.rows?.length);
  const pair = (key: string, scale = (value: number) => value) => metric(scale(num(a[key])), hasBefore ? scale(num(b[key])) : null);
  return {
    siteUrl, range,
    clicks: pair("clicks"), impressions: pair("impressions"), ctr: pair("ctr", (value) => round(value, 4)), position: pair("position", (value) => round(value, 1)),
    daily: (() => {
      const rows = new Map<string, Json>((daily.rows ?? []).map((item: Json) => [String(item.keys?.[0] ?? ""), item]));
      return fillDays(new Map([...rows].map(([date, item]) => [date, num(item.clicks)])), range.start, range.end).map(([date, clicks]) => ({ date, clicks, impressions: num(rows.get(date)?.impressions) }));
    })(),
    topQueries: (queries.rows ?? []).map((item: Json) => ({ query: String(item.keys?.[0] ?? ""), clicks: num(item.clicks), impressions: num(item.impressions), position: round(num(item.position), 1) })),
    topPages: (pages.rows ?? []).map((item: Json) => ({ page: String(item.keys?.[0] ?? ""), clicks: num(item.clicks), impressions: num(item.impressions) })),
    sitemaps: (sitemaps.sitemap ?? []).map((item: Json) => ({ path: String(item.path ?? ""), errors: num(item.errors), warnings: num(item.warnings), lastDownloaded: item.lastDownloaded ?? null })),
  };
}

async function checkUptime(url: string, fetcher: typeof fetch): Promise<SiteInsights["uptime"]> {
  const started = Date.now();
  try {
    // Redirects are reported, not followed, so a public site cannot point the server at an internal address.
    const response = await fetcher(url, { redirect: "manual", signal: AbortSignal.timeout(8000), cache: "no-store" });
    return { ok: response.status < 400, status: response.status, ms: Date.now() - started };
  } catch (error) {
    return { ok: false, status: null, ms: null, error: error instanceof Error ? error.message : "Request failed." };
  }
}

export async function siteInsights(url: string, options: Options = {}): Promise<SiteInsights> {
  const cached = insightsCache.get(url);
  if (!options.refresh && cached && Date.now() - cached.at < INSIGHTS_TTL) {
    const analytics = cached.value.analytics;
    if ("error" in analytics || cached.value.path) return cached.value;
    const google = new Google(options.fetcher ?? fetch, options.token ?? defaultToken);
    return { ...cached.value, analytics: { ...analytics, realtimeUsers: await realtimeUsers(google, analytics.propertyId, "") } };
  }
  if (options.refresh) { propertyCache = null; siteListCache = null; realtimeCache.clear(); }
  const { host, path } = parse(url);
  const fetcher = options.fetcher ?? fetch;
  const google = new Google(fetcher, options.token ?? defaultToken);
  let property: Property | null = null;
  let siteUrl: string | null = null;

  const [uptime, analytics, search] = await Promise.all([
    checkUptime(url, fetcher),
    (async (): Promise<AnalyticsSummary | Unavailable> => {
      try {
        property = await findProperty(google, host);
        if (!property) return { error: `No GA4 property found for ${host}. Add ${INSIGHTS_SERVICE_ACCOUNT} as a Viewer on its GA4 property.`, setup: true };
        return await analyticsSummary(google, host, path, property);
      } catch (error) { return failure(error, "Google Analytics", "the GA4 property"); }
    })(),
    (async (): Promise<SearchSummary | Unavailable> => {
      try {
        siteUrl = matchSite(await listSites(google), host, path);
        if (!siteUrl) return { error: `No Search Console property found for ${host}. Add ${INSIGHTS_SERVICE_ACCOUNT} as a user in Search Console.`, setup: true };
        return await searchSummary(google, host, path, siteUrl);
      } catch (error) { return failure(error, "Search Console", "Search Console (as a user)"); }
    })(),
  ]);

  const value: SiteInsights = {
    url, host, path, fetchedAt: new Date().toISOString(), uptime, analytics, search,
    links: {
      site: url,
      analytics: property ? `https://analytics.google.com/analytics/web/#/p${(property as Property).propertyId}/reports/intelligenthome` : null,
      searchConsole: `https://search.google.com/search-console?resource_id=${encodeURIComponent(siteUrl ?? `sc-domain:${host}`)}`,
      pageSpeed: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`,
    },
  };
  insightsCache.set(url, { at: Date.now(), value });
  return value;
}
