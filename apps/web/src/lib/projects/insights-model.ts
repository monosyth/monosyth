// Client-safe shapes for the Google summaries shown beside each project website.
export type Metric = { value: number; previous: number | null };
export type Unavailable = { error: string; setup?: true };

export type AnalyticsSummary = {
  propertyId: string; propertyName: string;
  // Today, Yesterday, 7 days and 30 days, matching MenuToEat's analytics dashboard.
  periods: { label: string; users: number; sessions: number; views: number; engagementRate: number }[];
  // 30 days against the 30 before.
  users: Metric; sessions: Metric; views: Metric; engagementRate: Metric;
  realtimeUsers: number | null;
  daily: { date: string; users: number }[];
  topPages: { path: string; views: number }[];
  topPagesToday: { path: string; views: number }[];
  channels: { name: string; sessions: number }[];
};
export type SearchSummary = {
  siteUrl: string; range: { start: string; end: string };
  clicks: Metric; impressions: Metric; ctr: Metric; position: Metric;
  daily: { date: string; clicks: number; impressions: number }[];
  topQueries: { query: string; clicks: number; impressions: number; position: number }[];
  topPages: { page: string; clicks: number; impressions: number }[];
  sitemaps: { path: string; errors: number; warnings: number; lastDownloaded: string | null }[];
};
export type SiteInsights = {
  url: string; host: string; path: string; fetchedAt: string;
  uptime: { ok: boolean; status: number | null; ms: number | null; error?: string };
  analytics: AnalyticsSummary | Unavailable;
  search: SearchSummary | Unavailable;
  links: { site: string; analytics: string | null; searchConsole: string; pageSpeed: string };
};
export type ProjectInsights = { projectId: string; sites: SiteInsights[]; serviceAccount: string };
export type InsightsSummary = { users: number | null; usersBefore: number | null; clicks: number | null; clicksBefore: number | null; down: number; sites: number };
export const isUnavailable = (value: object): value is Unavailable => "error" in value;
