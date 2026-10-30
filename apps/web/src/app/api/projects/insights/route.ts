import { requireTrackerOwner } from "@/lib/projects/auth";
import { INSIGHTS_SERVICE_ACCOUNT, siteInsights } from "@/lib/projects/insights";
import { isUnavailable, type InsightsSummary, type ProjectInsights, type SiteInsights } from "@/lib/projects/insights-model";
import { TrackerError } from "@/lib/projects/model";
import { getProject, listBoard } from "@/lib/projects/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization", "X-Robots-Tag": "noindex, nofollow, noarchive" };

// Summaries for every card share one pass, a few sites at a time, over the 30-minute cache.
async function inBatches<T, R>(items: T[], size: number, run: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += size) results.push(...await Promise.all(items.slice(index, index + size).map(run)));
  return results;
}
function summarize(sites: SiteInsights[]): InsightsSummary {
  const add = (values: (number | null | undefined)[]) => values.some(value => typeof value === "number") ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
  const analytics = sites.flatMap(site => isUnavailable(site.analytics) ? [] : [site.analytics]);
  const search = sites.flatMap(site => isUnavailable(site.search) ? [] : [site.search]);
  return {
    users: add(analytics.map(value => value.users.value)), usersBefore: add(analytics.map(value => value.users.previous)),
    clicks: add(search.map(value => value.clicks.value)), clicksBefore: add(search.map(value => value.clicks.previous)),
    down: sites.filter(site => !site.uptime.ok).length, sites: sites.length,
  };
}
export async function GET(request: Request) {
  try {
    await requireTrackerOwner(request);
    const url = new URL(request.url), projectId = url.searchParams.get("project"), refresh = url.searchParams.get("refresh") === "1";
    if (projectId) {
      const project = await getProject(projectId);
      const sites = await inBatches(project.sites ?? [], 4, site => siteInsights(site.url, { refresh }));
      return Response.json({ projectId: project.id, sites, serviceAccount: INSIGHTS_SERVICE_ACCOUNT } satisfies ProjectInsights, { headers });
    }
    const { projects } = await listBoard();
    const withSites = projects.filter(project => project.sites?.length);
    const pairs = await inBatches(withSites, 3, async project => [project.id, summarize(await inBatches(project.sites ?? [], 4, site => siteInsights(site.url)))] as const);
    return Response.json({ summaries: Object.fromEntries(pairs), serviceAccount: INSIGHTS_SERVICE_ACCOUNT }, { headers });
  } catch (error) {
    if (error instanceof TrackerError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error("Project insights request failed", error instanceof Error ? error.name : "Unknown error");
    return Response.json({ error: "Website summaries could not be loaded. Please try again." }, { status: 503, headers });
  }
}
