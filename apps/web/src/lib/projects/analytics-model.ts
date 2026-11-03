// Client-safe shapes for the Analytics view: every project website in one table, plus internal studio numbers.
import type { ProjectStatus } from "./model";
import type { SiteInsights, Unavailable } from "./insights-model";

export type OverviewSite = { projectId: string; projectName: string; projectStatus: ProjectStatus; label: string; insights: SiteInsights };

export type JournalStats = {
  // Work recorded over the last 30 days against the 30 before, from the full journal rather than the recent 100.
  total: number; previous: number;
  daily: { date: string; count: number }[];
  byProject: { projectId: string; name: string; count: number; lastAt: string }[];
  byAuthor: { author: string; count: number }[];
  byKind: { kind: string; count: number }[];
  milestones: number;
  // Active projects without recorded work for two weeks.
  stale: { projectId: string; name: string; lastWorkedAt: string | null }[];
  statusCounts: Partial<Record<ProjectStatus, number>>;
  openDecisions: number;
  capped: boolean;
};

export type ShopStats = {
  live: boolean;
  orders: number; previousOrders: number;
  revenueCents: number; previousRevenueCents: number;
  daily: { date: string; cents: number }[];
  topItems: { name: string; count: number; cents: number }[];
  recent: { at: string; cents: number; items: string[] }[];
};

export type AnalyticsOverview = {
  fetchedAt: string; serviceAccount: string;
  sites: OverviewSite[];
  journal: JournalStats | Unavailable;
  shop: ShopStats | Unavailable;
};
