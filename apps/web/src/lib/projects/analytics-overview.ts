import "server-only";
import type Stripe from "stripe";
import { getFirebaseAdminDb } from "../firebase/admin";
import { findRelease, productTitle } from "../shop/catalog";
import { shopConfig } from "../shop/config";
import { stripeClient } from "../shop/server";
import type { AnalyticsOverview, JournalStats, OverviewSite, ShopStats } from "./analytics-model";
import { INSIGHTS_SERVICE_ACCOUNT, inBatches, siteInsights } from "./insights";
import type { Unavailable } from "./insights-model";
import type { Project, ProjectStatus } from "./model";
import { listBoard } from "./store";

const DAY = 86_400_000;
const WINDOW = 30;
const JOURNAL_LIMIT = 5000;
const SHOP_TTL = 15 * 60_000;
const pacificDay = (time: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(time);
// The last 30 Pacific calendar days, oldest first, ending today (date math, so daylight saving cannot skip a day).
function days(now: number) {
  const today = Date.parse(`${pacificDay(now)}T00:00:00Z`), list: string[] = [];
  for (let offset = WINDOW - 1; offset >= 0; offset--) list.push(new Date(today - offset * DAY).toISOString().slice(0, 10));
  return list;
}
const unavailable = (error: unknown, fallback: string): Unavailable => ({ error: error instanceof Error && error.message ? error.message : fallback });
const top = <T,>(map: Map<string, T>, score: (value: T) => number, limit: number) => [...map].sort((a, b) => score(b[1]) - score(a[1])).slice(0, limit);

async function journalStats(projects: Project[], now: number): Promise<JournalStats> {
  const since = new Date(now - 2 * WINDOW * DAY).toISOString(), cutoff = now - WINDOW * DAY;
  const rows = await getFirebaseAdminDb().collection("privateProjectTracker").doc("owner").collection("workEntries")
    .where("createdAt", ">=", since).orderBy("createdAt", "desc").select("projectId", "kind", "author", "createdAt", "title").limit(JOURNAL_LIMIT).get();
  const names = new Map(projects.map(project => [project.id, project.name]));
  const window = days(now), daily = new Map(window.map(date => [date, 0]));
  const byProject = new Map<string, { count: number; lastAt: string }>(), byAuthor = new Map<string, number>(), byKind = new Map<string, number>();
  let total = 0, previous = 0, milestones = 0;
  for (const doc of rows.docs) {
    const entry = doc.data() as { projectId: string; kind: string; author: string; createdAt: string; title: string };
    // Imports and the automatic "added" note are bookkeeping, not work.
    if (entry.kind === "import" || entry.title === "Project added to the journal" || entry.title === "Project details updated") continue;
    if (Date.parse(entry.createdAt) < cutoff) { previous++; continue; }
    total++;
    if (entry.kind === "milestone") milestones++;
    const date = pacificDay(Date.parse(entry.createdAt));
    if (daily.has(date)) daily.set(date, (daily.get(date) ?? 0) + 1);
    const project = byProject.get(entry.projectId);
    byProject.set(entry.projectId, { count: (project?.count ?? 0) + 1, lastAt: project?.lastAt ?? entry.createdAt });
    const author = entry.author.includes("@") ? "You" : entry.author || "Unknown";
    byAuthor.set(author, (byAuthor.get(author) ?? 0) + 1);
    byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
  }
  const statusCounts: Partial<Record<ProjectStatus, number>> = {};
  for (const project of projects) statusCounts[project.status] = (statusCounts[project.status] ?? 0) + 1;
  return {
    total, previous, milestones,
    daily: window.map(date => ({ date, count: daily.get(date) ?? 0 })),
    byProject: top(byProject, value => value.count, 8).map(([projectId, value]) => ({ projectId, name: names.get(projectId) ?? projectId, ...value })),
    byAuthor: top(byAuthor, value => value, 8).map(([author, count]) => ({ author, count })),
    byKind: top(byKind, value => value, 8).map(([kind, count]) => ({ kind, count })),
    stale: projects.filter(project => project.status === "active" && (!project.lastWorkedAt || now - Date.parse(project.lastWorkedAt) > 14 * DAY))
      .sort((a, b) => (a.lastWorkedAt ?? "").localeCompare(b.lastWorkedAt ?? "")).map(project => ({ projectId: project.id, name: project.name, lastWorkedAt: project.lastWorkedAt })),
    statusCounts,
    openDecisions: projects.reduce((sum, project) => sum + project.decisions.length, 0),
    capped: rows.docs.length >= JOURNAL_LIMIT,
  };
}

// Paid shop orders come straight from Stripe; the site keeps no order database.
let shopCache: { at: number; value: ShopStats } | null = null;
function itemNames(session: Stripe.Checkout.Session) {
  let skus: string[] = session.metadata?.sku ? [session.metadata.sku] : [];
  if (!skus.length && session.metadata?.cart_items) {
    try { skus = (JSON.parse(session.metadata.cart_items) as [string, number][]).map(item => String(item[0])); } catch { skus = []; }
  }
  return skus.map(sku => { const release = findRelease(sku); return release ? productTitle(release).replace(/ — PDF \+ EQ8$/, "") : sku.split("@")[0]; });
}
async function shopStats(now: number, refresh: boolean): Promise<ShopStats | Unavailable> {
  if (!shopConfig().stripeKey) return { error: "Stripe is not configured on this host." };
  if (!refresh && shopCache && now - shopCache.at < SHOP_TTL) return shopCache.value;
  const stripe = stripeClient(), cutoff = now - WINDOW * DAY;
  const sessions: Stripe.Checkout.Session[] = [];
  for await (const session of stripe.checkout.sessions.list({ status: "complete", created: { gte: Math.floor((now - 2 * WINDOW * DAY) / 1000) }, limit: 100 })) {
    if (session.metadata?.shop === "monosyth-patterns-v1" && session.payment_status === "paid") sessions.push(session);
    if (sessions.length >= 1000) break;
  }
  const window = days(now), daily = new Map(window.map(date => [date, 0])), items = new Map<string, { count: number; cents: number }>();
  const value: ShopStats = { live: shopConfig().stripeKey.startsWith("sk_live") || shopConfig().stripeKey.startsWith("rk_live"), orders: 0, previousOrders: 0, revenueCents: 0, previousRevenueCents: 0, daily: [], topItems: [], recent: [] };
  for (const session of sessions) {
    const at = session.created * 1000, cents = session.amount_total ?? 0;
    if (at < cutoff) { value.previousOrders++; value.previousRevenueCents += cents; continue; }
    value.orders++; value.revenueCents += cents;
    const date = pacificDay(at);
    if (daily.has(date)) daily.set(date, (daily.get(date) ?? 0) + cents);
    const names = itemNames(session);
    for (const name of names) { const item = items.get(name); items.set(name, { count: (item?.count ?? 0) + 1, cents: (item?.cents ?? 0) + Math.round(cents / names.length) }); }
    if (value.recent.length < 6) value.recent.push({ at: new Date(at).toISOString(), cents, items: names });
  }
  value.daily = window.map(date => ({ date, cents: daily.get(date) ?? 0 }));
  value.topItems = top(items, item => item.count, 6).map(([name, item]) => ({ name, ...item }));
  shopCache = { at: now, value };
  return value;
}

export async function analyticsOverview(refresh = false): Promise<AnalyticsOverview> {
  const now = Date.now();
  const { projects } = await listBoard();
  // One row per address; a site listed under two projects belongs to the first (most recently updated).
  const seen = new Set<string>();
  const targets = projects.flatMap(project => (project.sites ?? []).flatMap(site => {
    if (seen.has(site.url)) return [];
    seen.add(site.url);
    return [{ project, site }];
  }));
  const [sites, journal, shop] = await Promise.all([
    inBatches(targets, 4, async ({ project, site }): Promise<OverviewSite> => ({ projectId: project.id, projectName: project.name, projectStatus: project.status, label: site.label, insights: await siteInsights(site.url, { refresh }) })),
    journalStats(projects, now).catch(error => { console.error("Analytics journal stats failed", error instanceof Error ? error.name : "Unknown"); return unavailable(null, "Journal activity could not be loaded."); }),
    shopStats(now, refresh).catch(error => { console.error("Analytics shop stats failed", error instanceof Error ? error.name : "Unknown"); return unavailable(null, "Stripe sales could not be loaded."); }),
  ]);
  return { fetchedAt: new Date(now).toISOString(), serviceAccount: INSIGHTS_SERVICE_ACCOUNT, sites, journal, shop };
}
