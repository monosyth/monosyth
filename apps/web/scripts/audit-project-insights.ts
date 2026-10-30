import assert from "node:assert/strict";
import { test } from "node:test";
import { siteInsights } from "../src/lib/projects/insights";
import { isUnavailable } from "../src/lib/projects/insights-model";

type Call = { url: string; body: any; init?: RequestInit }; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const token = async () => "test-token";

function mock(options: { sites?: { siteUrl: string; permissionLevel?: string }[]; denied?: boolean; domain?: string; hosts?: [string, string][]; streamUri?: string | null } = {}) {
  const calls: Call[] = [];
  const domain = options.domain ?? "example.test";
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, body, init });
    if (url === `https://${domain}/` || url === `https://${domain}/weather`) return new Response("ok", { status: 200 });
    if (options.denied) return json({ error: "denied" }, 403);
    if (url.includes("/accountSummaries")) return json({ accountSummaries: [{ propertySummaries: [{ property: "properties/111", displayName: "Example" }] }] });
    if (url.endsWith("/dataStreams")) return json({ dataStreams: [{ webStreamData: options.streamUri === null ? {} : { defaultUri: options.streamUri ?? `https://www.${domain}` } }] });
    if (url.endsWith(":runRealtimeReport")) return json({ rows: [{ metricValues: [{ value: "3" }] }] });
    if (url.endsWith(":runReport")) {
      if (body.dimensions?.[0]?.name === "hostName") return json({ rows: (options.hosts ?? [[`www.${domain}`, "40"], ["127.0.0.1", "900"]]).map(([host, views]) => ({ dimensionValues: [{ value: host }], metricValues: [{ value: views }] })) });
      return json({ rows: [{ metricValues: [{ value: "5" }, { value: "10" }, { value: "15" }, { value: "0.4" }] }] });
    }
    if (url.endsWith(":batchRunReports")) {
      return json({ reports: [
        { rows: [
          { dimensionValues: [{ value: "date_range_1" }], metricValues: [{ value: "2" }, { value: "3" }, { value: "4" }, { value: "0.5" }] },
          { dimensionValues: [{ value: "date_range_2" }], metricValues: [{ value: "6" }, { value: "8" }, { value: "12" }, { value: "0.5" }] },
          { dimensionValues: [{ value: "date_range_3" }], metricValues: [{ value: "10" }, { value: "20" }, { value: "30" }, { value: "0.51234" }] },
        ] },
        { rows: [{ dimensionValues: [{ value: "20261028" }], metricValues: [{ value: "4" }] }] },
        { rows: [{ dimensionValues: [{ value: "/" }], metricValues: [{ value: "9" }] }] },
        { rows: [] },
        { rows: [{ dimensionValues: [{ value: "Direct" }], metricValues: [{ value: "7" }] }] },
      ] });
    }
    if (url === "https://www.googleapis.com/webmasters/v3/sites") return json({ siteEntry: options.sites ?? [{ siteUrl: `sc-domain:${domain}`, permissionLevel: "siteOwner" }] });
    if (url.endsWith("/sitemaps")) return json({ sitemap: [{ path: `https://${domain}/sitemap.xml`, errors: "1", warnings: "2", lastDownloaded: "2026-10-28T00:00:00Z" }] });
    if (url.endsWith("/searchAnalytics/query")) {
      const dims = body.dimensions?.[0];
      if (dims === "date") return json({ rows: [{ keys: ["2026-10-27"], clicks: 2, impressions: 40 }] });
      if (dims === "query") return json({ rows: [{ keys: ["thing"], clicks: 3, impressions: 50, position: 4.26 }] });
      if (dims === "page") return json({ rows: [{ keys: [`https://${domain}/`], clicks: 3, impressions: 50 }] });
      return json({ rows: [{ clicks: body.startDate < "2026-09" ? 1 : 6, impressions: 100, ctr: 0.06, position: 7.84 }] });
    }
    return json({}, 404);
  }) as typeof fetch;
  return { fetcher, calls };
}

test("domain properties match www streams and path scoping reaches GA4 and Search Console", async () => {
  const { fetcher, calls } = mock({ domain: "scope-a.test" });
  const result = await siteInsights("https://scope-a.test/weather/", { fetcher, token, refresh: true });
  assert.equal(result.host, "scope-a.test");
  assert.equal(result.path, "/weather");
  assert.ok(!isUnavailable(result.analytics));
  if (isUnavailable(result.analytics)) return;
  assert.equal(result.analytics.propertyId, "111");
  assert.deepEqual(result.analytics.users, { value: 10, previous: 5 });
  // Today, Yesterday, 7 days and 30 days, as in MenuToEat's dashboard; a period without data reads zero.
  assert.deepEqual(result.analytics.periods.map((period) => [period.label, period.users]), [["Today", 0], ["Yesterday", 2], ["7 days", 6], ["30 days", 10]]);
  assert.deepEqual(result.analytics.topPagesToday, []);
  // Missing days are filled so the sparkline spaces dates evenly.
  assert.equal(result.analytics.daily.length, 30);
  assert.equal(result.analytics.daily.at(-1)!.date, new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(Date.now() - 86_400_000));
  // The Realtime API cannot filter by path, so a section shows no "now" count.
  assert.equal(result.analytics.realtimeUsers, null);
  assert.ok(!calls.some((call) => call.url.endsWith(":runRealtimeReport")));
  const batch = calls.find((call) => call.url.endsWith(":batchRunReports"))!;
  assert.equal(batch.body.requests.length, 5);
  assert.equal(batch.body.requests[0].dateRanges.length, 4);
  for (const request of batch.body.requests) assert.deepEqual(request.dimensionFilter.andGroup.expressions, [
    { filter: { fieldName: "hostName", inListFilter: { values: ["scope-a.test", "www.scope-a.test"] } } },
    { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/weather" } } },
  ]);
  const query = calls.find((call) => call.url.endsWith("/searchAnalytics/query"))!;
  assert.deepEqual(query.body.dimensionFilterGroups[0].filters[0], { dimension: "page", operator: "contains", expression: "scope-a.test/weather" });
  assert.equal(result.links.analytics, "https://analytics.google.com/analytics/web/#/p111/reports/intelligenthome");
  assert.ok(result.search && !isUnavailable(result.search));
  if (!isUnavailable(result.search)) {
    assert.equal(result.search.ctr.value, 0.06);
    assert.equal(result.search.position.value, 7.8);
    assert.equal(result.search.topQueries[0].position, 4.3);
    assert.deepEqual(result.search.sitemaps[0], { path: "https://scope-a.test/sitemap.xml", errors: 1, warnings: 2, lastDownloaded: "2026-10-28T00:00:00Z" });
  }
});

test("root sites send no path filter and the sc-domain property is preferred", async () => {
  const sites = [{ siteUrl: "https://scope-b.test/", permissionLevel: "siteOwner" }, { siteUrl: "sc-domain:scope-b.test", permissionLevel: "siteFullUser" }];
  const { fetcher, calls } = mock({ domain: "scope-b.test", sites });
  const result = await siteInsights("https://www.scope-b.test/", { fetcher, token, refresh: true });
  assert.equal(result.path, "");
  assert.ok(!isUnavailable(result.search) && result.search.siteUrl === "sc-domain:scope-b.test");
  assert.ok(result.links.searchConsole.endsWith(encodeURIComponent("sc-domain:scope-b.test")));
  assert.deepEqual(calls.find((call) => call.url.endsWith(":batchRunReports"))!.body.requests[0].dimensionFilter, { filter: { fieldName: "hostName", inListFilter: { values: ["scope-b.test", "www.scope-b.test"] } } });
  assert.ok(!isUnavailable(result.analytics) && result.analytics.realtimeUsers === 3);
  assert.equal(calls.find((call) => call.url.endsWith("/searchAnalytics/query"))!.body.dimensionFilterGroups, undefined);
});

test("unverified Search Console entries are skipped", async () => {
  const { fetcher } = mock({ domain: "scope-c.test", sites: [{ siteUrl: "sc-domain:scope-c.test", permissionLevel: "siteUnverifiedUser" }] });
  const result = await siteInsights("https://scope-c.test/", { fetcher, token, refresh: true });
  assert.ok(isUnavailable(result.search) && result.search.setup === true);
});

test("a 403 becomes a setup message while uptime is still reported", async () => {
  const { fetcher } = mock({ domain: "scope-d.test", denied: true });
  const result = await siteInsights("https://scope-d.test/", { fetcher, token, refresh: true });
  assert.deepEqual(result.uptime.ok, true);
  assert.equal(result.uptime.status, 200);
  for (const section of [result.analytics, result.search]) {
    assert.ok(isUnavailable(section));
    if (isUnavailable(section)) {
      assert.equal(section.setup, true);
      assert.match(section.error, /Add .+ as a/);
    }
  }
  assert.equal(result.links.analytics, null);
});

test("results are cached per url until refresh", async () => {
  const { fetcher, calls } = mock({ domain: "scope-e.test" });
  const first = await siteInsights("https://scope-e.test/", { fetcher, token, refresh: true });
  const used = calls.length;
  assert.deepEqual(await siteInsights("https://scope-e.test/", { fetcher, token }), first);
  assert.equal(calls.length, used);
  const again = await siteInsights("https://scope-e.test/", { fetcher, token, refresh: true });
  assert.notEqual(again, first);
  assert.ok(calls.length > used);
});

test("parent domain properties and URL-prefix properties cover a site", async () => {
  const parent = mock({ domain: "shop.scope-f.test", sites: [{ siteUrl: "sc-domain:scope-f.test", permissionLevel: "siteFullUser" }] });
  const viaParent = await siteInsights("https://shop.scope-f.test/", { fetcher: parent.fetcher, token, refresh: true });
  assert.ok(!isUnavailable(viaParent.search) && viaParent.search.siteUrl === "sc-domain:scope-f.test");
  assert.deepEqual(parent.calls.find((call) => call.url.endsWith("/searchAnalytics/query"))!.body.dimensionFilterGroups[0].filters[0], { dimension: "page", operator: "contains", expression: "shop.scope-f.test" });
  const prefix = mock({ domain: "scope-g.test", sites: [{ siteUrl: "https://scope-g.test/", permissionLevel: "siteOwner" }, { siteUrl: "https://scope-g.test/weather/", permissionLevel: "siteOwner" }] });
  const viaPrefix = await siteInsights("https://scope-g.test/weather", { fetcher: prefix.fetcher, token, refresh: true });
  assert.ok(!isUnavailable(viaPrefix.search) && viaPrefix.search.siteUrl === "https://scope-g.test/weather/");
});

test("uptime reports redirects without following them", async () => {
  const { fetcher, calls } = mock({ domain: "scope-h.test" });
  await siteInsights("https://scope-h.test/", { fetcher, token, refresh: true });
  assert.equal(calls.find((call) => call.url === "https://scope-h.test/")?.init?.redirect, "manual");
});

test("properties are found by recorded host traffic when streams have no address, ignoring local hosts", async () => {
  const { fetcher } = mock({ domain: "scope-i.test", streamUri: null, hosts: [["scope-i.test", "37"], ["other-i.test", "26"], ["127.0.0.1", "500"]] });
  const result = await siteInsights("https://scope-i.test/", { fetcher, token, refresh: true });
  assert.ok(!isUnavailable(result.analytics));
  // The property also serves another site, so a property-wide "now" count would mislead.
  assert.ok(!isUnavailable(result.analytics) && result.analytics.realtimeUsers === null);
});
