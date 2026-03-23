import Link from "next/link";
import type { ReactNode } from "react";
import { getTimes } from "suncalc";

import { WeatherCameraGrid } from "@/components/weather/camera-grid";
import { RadarEmbed } from "@/components/weather/radar-embed";
import styles from "@/app/weather/weather.module.css";
import {
  getWeatherPageData,
  normalizeWeatherDashboardView,
  type WeatherDashboardView,
} from "@/lib/weather/ambient";
import { buildWeatherAlmanac } from "@/lib/weather/almanac";
import { nearbyWeatherCameras, type WeatherCamera } from "@/lib/weather/cameras";
import {
  readStoredWeatherObservationsBetween,
  readStoredWeatherObservationsForDay,
} from "@/lib/weather/history";
import {
  buildWeatherSummaryArchive,
  WEATHER_SUMMARY_MONTH_LABELS,
  type WeatherMonthlyMatrix,
  type WeatherMonthlyReportRow,
  type WeatherSummaryArchive,
  type WeatherSummarySection,
} from "@/lib/weather/summary";
import {
  formatWeatherClock,
  formatWeatherDateTime,
  formatWeatherLong,
} from "@/lib/weather/time";
import type {
  WeatherForecastPeriod,
  WeatherObservation,
  WeatherOverview,
  WeatherPageData,
  WeatherSeries,
  WeatherSeriesPoint,
} from "@/lib/weather/types";

export const dynamic = "force-dynamic";

type FactRow = {
  label: string;
  value: string;
};

type SummaryRow = {
  label: string;
  value: string;
  detail: string;
};

type StationGraphPanel = {
  id: string;
  title: string;
  subtitle: string;
  seriesList: WeatherSeries[];
  plotType: StationPlotType;
  showDayNight: boolean;
  fixedScale?: {
    min: number;
    max: number;
    minInterval: number;
  };
};

type StationPlotType = "line" | "bar" | "scatter" | "vector";
type WeatherAggregationMode = "avg" | "max" | "last" | "sum" | "min" | "vecdir";

type ComparisonPanel = {
  title: string;
  subtitle: string;
  rows: SummaryRow[];
};

type SummaryCard = {
  label: string;
  value: string;
  note: string;
};

type RecordCard = {
  label: string;
  value: string;
  note: string;
};

type WeatherPageProps = {
  searchParams?: Promise<{
    view?: string;
    tab?: string;
  }>;
};

type WeatherDocumentTab = "dashboard" | "summaries" | "radar" | "cameras" | "graphs" | "about";

const DISPLAY_COORDINATES = {
  latitude: 47.7565,
  longitude: -122.345,
};

const currentConditionDefinitions = [
  { label: "Outside Temperature", keys: ["tempf"], decimals: 1, unit: "F" },
  { label: "Wind Chill", keys: ["windchillf"], decimals: 1, unit: "F" },
  { label: "Heat Index", keys: ["heatindexf"], decimals: 1, unit: "F" },
  { label: "Dewpoint", keys: ["dewPoint", "dewpointf"], decimals: 1, unit: "F" },
  { label: "Humidity", keys: ["humidity"], decimals: 0, unit: "%" },
  { label: "Barometer", keys: ["baromrelin", "baromabsin"], decimals: 3, unit: "inHg" },
  {
    label: "Wind",
    render: (observation: WeatherObservation) =>
      formatWind(observation, "windspeedmph", "winddir"),
  },
  {
    label: "Wind Gust",
    render: (observation: WeatherObservation) =>
      formatWind(observation, "windgustmph", "winddir"),
  },
  { label: "Rain Rate", keys: ["hourlyrainin"], decimals: 2, unit: "in/h" },
  { label: "Daily Rain", keys: ["dailyrainin"], decimals: 2, unit: "in" },
  { label: "UV Index", keys: ["uv"], decimals: 1, unit: "" },
  { label: "Solar Radiation", keys: ["solarradiation"], decimals: 0, unit: "W/m2" },
  { label: "Brightness", keys: ["brightness", "lux"], decimals: 0, unit: "lx" },
  { label: "Lightning Strikes", keys: ["lightning_day", "lightning"], decimals: 0, unit: "" },
] as const;

const summaryTabs = [
  { label: "Current", view: "current" },
  { label: "Week", view: "week" },
  { label: "Month", view: "month" },
  { label: "Year", view: "year" },
] as const satisfies ReadonlyArray<{ label: string; view: WeatherDashboardView }>;

const documentTabs = [
  { label: "Dashboard", tab: "dashboard" },
  { label: "Summaries", tab: "summaries" },
  { label: "Radar", tab: "radar" },
  { label: "Cameras", tab: "cameras" },
  { label: "Graphs", tab: "graphs" },
  { label: "About", tab: "about" },
] as const satisfies ReadonlyArray<{ label: string; tab: WeatherDocumentTab }>;

const trafficMapUrl = "https://web.seattle.gov/travelers/";
const skylineWebcamHeaderCard = {
  href: "/weather?tab=cameras",
  imageUrl: "/api/weather/station-camera",
  title: "Station Camera",
  note: "Latest uploaded frame from the live weather cam",
};

function normalizeWeatherDocumentTab(value?: string): WeatherDocumentTab {
  if (
    value === "dashboard" ||
    value === "summaries" ||
    value === "radar" ||
    value === "cameras" ||
    value === "graphs" ||
    value === "about"
  ) {
    return value;
  }

  return "dashboard";
}

function buildWeatherHref(view: WeatherDashboardView, tab: WeatherDocumentTab = "dashboard") {
  const params = new URLSearchParams();

  if (view !== "current") {
    params.set("view", view);
  }

  if (tab !== "dashboard") {
    params.set("tab", tab);
  }

  const query = params.toString();
  return query ? `/weather?${query}` : "/weather";
}

export default async function WeatherPage({ searchParams }: WeatherPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeView = normalizeWeatherDashboardView(resolvedSearchParams.view);
  const activeDocumentTab = normalizeWeatherDocumentTab(resolvedSearchParams.tab);
  const isDashboardTab = activeDocumentTab === "dashboard";
  const isSummariesTab = activeDocumentTab === "summaries";
  const isRadarTab = activeDocumentTab === "radar";
  const isCamerasTab = activeDocumentTab === "cameras";
  const isGraphsTab = activeDocumentTab === "graphs";
  const isAboutTab = activeDocumentTab === "about";
  const result = await getWeatherPageData(activeView);

  if (result.state !== "ready") {
    return <WeatherState result={result} />;
  }

  const { data } = result;
  const mastheadRows = buildMastheadRows(data, activeView);
  const coordinates = resolveDisplayCoordinates(data);
  const almanac = buildWeatherAlmanac({
    date: new Date(data.fetchedAt),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  });
  const mapUrl = buildMapUrl(coordinates.latitude, coordinates.longitude);
  const radarUrl = buildRadarEmbedUrl(coordinates.latitude, coordinates.longitude);
  const viewMeta = getViewMeta(activeView);
  const currentRows = isDashboardTab ? buildCurrentConditionRows(data.observations) : [];
  const periodRows = isDashboardTab ? buildPeriodSummaryRows(data, activeView) : [];
  const rangeRows = isDashboardTab ? buildRecentSummaryRows(data) : [];
  const comparisonPanels = isDashboardTab
    ? await getHistoricalComparisonPanels(data, activeView)
    : [];
  const graphPanels = isGraphsTab
    ? buildStationGraphPanels(prepareGraphSeries(data.series, activeView), activeView, data.series)
    : [];
  const summaryCards = isDashboardTab ? buildSummaryCards(data) : [];
  const recordCards = isDashboardTab ? buildRecordCards(data, activeView) : [];
  const stationRows = isAboutTab ? buildStationDetailRows(data, result.notice) : [];
  const rawRows = isAboutTab
    ? data.snapshot.slice(0, 24).map((item) => ({
        label: item.key,
        value: item.value,
      }))
    : [];
  const summaryArchive = isSummariesTab
    ? await loadWeatherSummaryArchive(data.station.macAddress)
    : null;
  const pageMeta = getPageMeta(
    activeView,
    activeDocumentTab,
    viewMeta,
    summaryArchive,
    data.station.lastObservationAt || formatWeatherLong(data.fetchedAt),
  );
  const isCurrentView = activeView === "current";
  const featuredComparisonPanel = isCurrentView
    ? comparisonPanels.find((panel) => panel.title.startsWith("Last ")) ?? null
    : comparisonPanels[0] ?? null;
  const secondaryComparisonPanels = featuredComparisonPanel
    ? comparisonPanels.filter((panel) => panel.title !== featuredComparisonPanel.title)
    : comparisonPanels;
  const visibleNotice = shouldDisplayWeatherNotice(result.notice) ? result.notice : undefined;
  const currentTemperatureLabel =
    createLatestValueRow(data.observations, "Temperature", ["tempf"], 1, "F")?.value ?? null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <p className={styles.heroEyebrow}>
                Monosyth Personal Weather
              </p>
              <h1 className={styles.heroTitle}>
                {data.station.name}
              </h1>
              <p className={styles.heroMeta}>
                {buildHeaderMeta(data, coordinates)}
                {" "}
                <a
                  className={styles.mapLink}
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Show on map
                </a>
              </p>

              <div className={styles.heroSummaryRow}>
                <div className={styles.heroPageCopy}>
                  <div className={styles.heroHeadingRow}>
                    <h2 className={styles.heroSectionTitle}>
                      {pageMeta.heading}
                    </h2>
                    {currentTemperatureLabel ? (
                      <p className={styles.heroCurrentTemp}>{currentTemperatureLabel}</p>
                    ) : null}
                  </div>
                  <p className={styles.heroTimestamp}>
                    {pageMeta.timestampLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.heroSidebar}>
              <div className={styles.heroSidebarGrid}>
                <a
                  href={skylineWebcamHeaderCard.href}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.webcamCard}
                >
                  <div className={styles.webcamFrame}>
                    {/* External webcam preview is kept as a plain img so we can use the source site directly. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={skylineWebcamHeaderCard.imageUrl}
                      alt="Seattle skyline webcam preview"
                      loading="lazy"
                      className={styles.webcamImage}
                    />
                  </div>
                  <div className={styles.webcamCardBody}>
                    <p className={styles.webcamCardEyebrow}>
                      {skylineWebcamHeaderCard.title}
                    </p>
                    <p className={styles.webcamCardNote}>{skylineWebcamHeaderCard.note}</p>
                  </div>
                </a>

                <table className={styles.mastheadTable}>
                  <tbody>
                    {mastheadRows.map((row) => (
                      <tr key={row.label} className={styles.mastheadRow}>
                        <th className={styles.mastheadHeaderCell}>
                          {row.label}:
                        </th>
                        <td className={styles.mastheadValueCell}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.tabShell}>
          <div className={styles.tabInner}>
            <div className={styles.primaryTabs}>
              {summaryTabs.map((tab) => {
                const isActive = tab.view === activeView;
                const href = buildWeatherHref(tab.view, activeDocumentTab);

                return (
                  <Link
                    key={tab.view}
                    href={href}
                    prefetch
                    scroll={false}
                    className={`${styles.primaryTab} ${isActive ? styles.primaryTabActive : styles.primaryTabInactive}`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
            <div className={styles.secondaryTabs}>
              {documentTabs.map((tab) => (
                <Link
                  key={tab.tab}
                  href={buildWeatherHref(activeView, tab.tab)}
                  scroll={false}
                  className={`${styles.secondaryTab} ${
                    activeDocumentTab === tab.tab
                      ? styles.secondaryTabActive
                      : styles.secondaryTabInactive
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className={styles.contentShell}>
        {visibleNotice ? (
          <div className={styles.noticeBanner}>
            {visibleNotice}
          </div>
        ) : null}

        {isSummariesTab ? (
          <SummaryArchiveTabContent summaryArchive={summaryArchive} />
        ) : isDashboardTab ? (
          <SummariesTabContent
            almanac={almanac}
            currentRows={currentRows}
            featuredComparisonPanel={featuredComparisonPanel}
            isCurrentView={isCurrentView}
            periodRows={periodRows}
            rangeRows={rangeRows}
            recordCards={recordCards}
            secondaryComparisonPanels={secondaryComparisonPanels}
            summaryCards={summaryCards}
            viewMeta={viewMeta}
          />
        ) : isRadarTab ? (
          <RadarTabContent
            almanac={almanac}
            forecast={data.forecast.slice(0, 8)}
            radarUrl={radarUrl}
          />
        ) : isCamerasTab ? (
          <CamerasTabContent />
        ) : isGraphsTab ? (
          <GraphsTabContent
            coordinates={coordinates}
            graphPanels={graphPanels}
            view={activeView}
            viewMeta={viewMeta}
          />
        ) : isAboutTab ? (
          <AboutTabContent
            almanac={almanac}
            forecast={data.forecast.slice(0, 8)}
            rawRows={rawRows}
            stationRows={stationRows}
          />
        ) : null}
      </div>
    </main>
  );
}

function WeatherState({ result }: { result: Exclude<WeatherPageData, { state: "ready" }> }) {
  const title =
    result.state === "missing-config"
      ? "Weather data needs a little setup"
      : "Weather data is temporarily unavailable";
  const detail =
    result.state === "missing-config"
      ? `${result.message} Missing: ${result.missing.join(", ")}.`
      : result.message;

  return (
    <main className={styles.stateShell}>
      <div className={styles.stateCard}>
        <div className={styles.stateHeader}>
          <p className={styles.stateEyebrow}>
            Monosyth Personal Weather
          </p>
          <h1 className={styles.stateTitle}>{title}</h1>
          <p className={styles.stateDetail}>{detail}</p>
          <div className={styles.stateActions}>
            <Link
              href="/weather"
              className={styles.stateButton}
            >
              Reload Weather
            </Link>
            <Link
              href="/"
              className={styles.stateButton}
            >
              Back Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function SummariesTabContent({
  almanac,
  currentRows,
  featuredComparisonPanel,
  isCurrentView,
  periodRows,
  rangeRows,
  recordCards,
  secondaryComparisonPanels,
  summaryCards,
  viewMeta,
}: {
  almanac: ReturnType<typeof buildWeatherAlmanac>;
  currentRows: FactRow[];
  featuredComparisonPanel: ComparisonPanel | null;
  isCurrentView: boolean;
  periodRows: SummaryRow[];
  rangeRows: SummaryRow[];
  recordCards: RecordCard[];
  secondaryComparisonPanels: ComparisonPanel[];
  summaryCards: SummaryCard[];
  viewMeta: ReturnType<typeof getViewMeta>;
}) {
  return (
    <>
      {isCurrentView ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
            <TablePanel
              id="current-section"
              title={viewMeta.primaryTitle}
              subtitle={viewMeta.primarySubtitle}
              compact
            >
              <TwoColumnTable
                rows={currentRows}
                emptyMessage="Current conditions will appear after the next successful station fetch."
              />
            </TablePanel>

            <TablePanel
              id="almanac-section"
              title="Almanac"
              subtitle="Sun and moon timing for the station area."
              compact
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium uppercase tracking-[0.14em] text-stone-600">Sun</h3>
                  <div className="mt-2">
                    <TwoColumnTable rows={almanac.sun} emptyMessage="Sun details unavailable." />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium uppercase tracking-[0.14em] text-stone-600">Moon</h3>
                  <div className="mt-2">
                    <TwoColumnTable rows={almanac.moon} emptyMessage="Moon details unavailable." />
                  </div>
                </div>
              </div>
            </TablePanel>
          </div>

          <div id="summary-section" className="mt-4 grid gap-4 xl:grid-cols-2">
            <TablePanel
              id="today-section"
              title={viewMeta.periodTitle}
              subtitle={viewMeta.periodSubtitle}
              compact
            >
              <ThreeColumnTable
                rows={periodRows}
                emptyMessage="Period highs and lows will populate once enough observations are available."
              />
            </TablePanel>

            {featuredComparisonPanel ? (
              <TablePanel
                id="comparison-section"
                title={featuredComparisonPanel.title}
                subtitle={featuredComparisonPanel.subtitle}
                compact
              >
                <ThreeColumnTable
                  rows={featuredComparisonPanel.rows}
                  emptyMessage="Archive comparisons will appear after enough stored station history accumulates."
                />
              </TablePanel>
            ) : (
              <TablePanel
                id="recent-section"
                title="Recent Range"
                subtitle="Active window summary."
                compact
              >
                <ThreeColumnTable
                  rows={rangeRows}
                  emptyMessage="Range details will appear once enough observations are available."
                />
              </TablePanel>
            )}
          </div>
        </>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
          <TablePanel
            id="summary-section"
            title={viewMeta.periodTitle}
            subtitle={viewMeta.periodSubtitle}
            compact
          >
            <ThreeColumnTable
              rows={periodRows}
              emptyMessage="Period highs and lows will populate once enough observations are available."
            />
          </TablePanel>

          {featuredComparisonPanel ? (
            <TablePanel
              id="comparison-section"
              title={featuredComparisonPanel.title}
              subtitle={featuredComparisonPanel.subtitle}
              compact
            >
              <ThreeColumnTable
                rows={featuredComparisonPanel.rows}
                emptyMessage="Archive comparisons will appear after enough stored station history accumulates."
              />
            </TablePanel>
          ) : (
            <TablePanel
              id="recent-section"
              title="Recent Range"
              subtitle="Active window summary."
              compact
            >
              <ThreeColumnTable
                rows={rangeRows}
                emptyMessage="Range details will appear once enough observations are available."
              />
            </TablePanel>
          )}
        </div>
      )}

      {!isCurrentView ? (
        <>
          <div className="mt-4 grid gap-px border border-stone-200 bg-stone-200 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCardPanel key={card.label} card={card} />
            ))}
          </div>

          <div
            id="records-section"
            className="mt-4 grid gap-px border border-stone-200 bg-stone-200 md:grid-cols-2 xl:grid-cols-5"
          >
            {recordCards.map((card) => (
              <RecordCardPanel key={card.label} card={card} />
            ))}
          </div>

          {secondaryComparisonPanels.length ? (
            <div className="mt-4 grid gap-px border border-stone-200 bg-stone-200 md:grid-cols-2 xl:grid-cols-3">
              {secondaryComparisonPanels.map((panel) => (
                <ArchivePanel
                  key={panel.title}
                  id={`comparison-${panel.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  panel={panel}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function RadarTabContent({
  almanac,
  forecast,
  radarUrl,
}: {
  almanac: ReturnType<typeof buildWeatherAlmanac>;
  forecast: WeatherForecastPeriod[];
  radarUrl: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
      <TablePanel
        id="radar-section"
        title="Radar"
        subtitle="Regional radar centered on the station area."
        compact
      >
        <RadarEmbed title="Weather radar" src={radarUrl} />
      </TablePanel>

      <div className="grid gap-4">
        <TablePanel
          id="forecast-section"
          title="Forecast Outlook"
          subtitle="Hourly outlook."
          compact
        >
          <ForecastTable periods={forecast} />
        </TablePanel>

        <TablePanel
          id="almanac-section-radar"
          title="Almanac"
          subtitle="Sun and moon timing for the station area."
          compact
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium uppercase tracking-[0.14em] text-stone-600">Sun</h3>
              <div className="mt-2">
                <TwoColumnTable rows={almanac.sun} emptyMessage="Sun details unavailable." />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium uppercase tracking-[0.14em] text-stone-600">Moon</h3>
              <div className="mt-2">
                <TwoColumnTable rows={almanac.moon} emptyMessage="Moon details unavailable." />
              </div>
            </div>
          </div>
        </TablePanel>
      </div>
    </div>
  );
}

function CamerasTabContent() {
  return (
    <TablePanel
      id="cameras-section"
      title="Local Cameras"
      subtitle="Nearby live traffic views with a compact traveler map."
      compact
    >
      <div className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
        <TrafficMapPanel title="Seattle Traffic Map" src={trafficMapUrl} href={trafficMapUrl} />
        <CameraGrid title="Nearby Camera Views" items={nearbyWeatherCameras} />
      </div>
    </TablePanel>
  );
}

function GraphsTabContent({
  coordinates,
  graphPanels,
  view,
  viewMeta,
}: {
  coordinates: { latitude: number; longitude: number };
  graphPanels: StationGraphPanel[];
  view: WeatherDashboardView;
  viewMeta: ReturnType<typeof getViewMeta>;
}) {
  return (
    <TablePanel
      id="graphs-section"
      title="Graphs"
      subtitle={`${viewMeta.label === "Current" ? "Daily" : viewMeta.label} station plots.`}
      compact
    >
      {graphPanels.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {graphPanels.map((panel) => (
            <StationTrendPanel
              key={panel.id}
              panel={panel}
              view={view}
              coordinates={coordinates}
            />
          ))}
        </div>
      ) : (
        <PanelState message="Trend charts need at least two recent observations with matching fields." />
      )}
    </TablePanel>
  );
}

function AboutTabContent({
  almanac,
  forecast,
  rawRows,
  stationRows,
}: {
  almanac: ReturnType<typeof buildWeatherAlmanac>;
  forecast: WeatherForecastPeriod[];
  rawRows: FactRow[];
  stationRows: FactRow[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <TablePanel
        id="about-section"
        title="About This Station"
        subtitle="Station details and newest raw payload values."
        compact
      >
        <div className="grid gap-4">
          <TwoColumnTable
            rows={stationRows}
            emptyMessage="Station details will appear after the first successful station fetch."
          />
          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-lg font-medium uppercase tracking-[0.14em] text-stone-600">Raw Snapshot</h3>
            <div className="mt-2">
              <TwoColumnTable
                rows={rawRows}
                emptyMessage="The newest raw payload will appear here after a successful fetch."
                monoLabels
              />
            </div>
          </div>
        </div>
      </TablePanel>

      <div className="grid gap-4">
        <TablePanel
          id="almanac-section-about"
          title="Almanac"
          subtitle="Sun and moon timing for the station area."
          compact
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium uppercase tracking-[0.14em] text-stone-600">Sun</h3>
              <div className="mt-2">
                <TwoColumnTable rows={almanac.sun} emptyMessage="Sun details unavailable." />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium uppercase tracking-[0.14em] text-stone-600">Moon</h3>
              <div className="mt-2">
                <TwoColumnTable rows={almanac.moon} emptyMessage="Moon details unavailable." />
              </div>
            </div>
          </div>
        </TablePanel>

        <TablePanel
          id="forecast-section-about"
          title="Forecast Outlook"
          subtitle="Hourly outlook."
          compact
        >
          <ForecastTable periods={forecast} />
        </TablePanel>
      </div>
    </div>
  );
}

function SummaryArchiveTabContent({
  summaryArchive,
}: {
  summaryArchive: WeatherSummaryArchive | null;
}) {
  if (!summaryArchive) {
    return (
      <PanelState message="Summary tables will appear after enough archived station history has been collected." />
    );
  }

  return (
    <div className="space-y-4">
      <TablePanel
        id="summary-records-section"
        title={`All Time Records (Since ${summaryArchive.stationStartLabel})`}
        subtitle="Archive-wide station records built from stored observations."
        compact
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaryArchive.recordSections.map((section) => (
            <SummarySectionCard key={section.title} section={section} />
          ))}
        </div>
      </TablePanel>

      <TablePanel
        id="monthly-reports-section"
        title="Monthly Reports"
        subtitle="Months with stored station archive data."
        compact
      >
        <MonthlyReportAvailabilityTable rows={summaryArchive.monthlyReportRows} />
      </TablePanel>

      <div className="grid gap-4">
        {summaryArchive.monthlyMatrices.map((matrix) => (
          <MonthlyClimateTable key={matrix.title} matrix={matrix} />
        ))}
      </div>
    </div>
  );
}

function SummarySectionCard({ section }: { section: WeatherSummarySection }) {
  return (
    <section className="border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-4 py-3">
        <h3 className="text-[1.1rem] font-light text-stone-800">{section.title}</h3>
      </div>
      <div className="px-4 py-3">
        <table className="w-full border-collapse">
          <tbody>
            {section.rows.map((row) => (
              <tr key={`${section.title}-${row.label}`} className="border-b border-stone-200 last:border-b-0">
                <th className="w-[42%] px-2 py-2 text-left font-normal text-stone-700">{row.label}</th>
                <td className="px-2 py-2 text-stone-800">{row.value}</td>
                <td className="px-2 py-2 text-stone-500">{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MonthlyReportAvailabilityTable({
  rows,
}: {
  rows: WeatherMonthlyReportRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-stone-300 text-left text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">
            <th className="px-2 py-2.5 font-medium">Year</th>
            {WEATHER_SUMMARY_MONTH_LABELS.map((month) => (
              <th key={month} className="px-2 py-2.5 text-center font-medium">{month}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year} className="border-b border-stone-200 last:border-b-0">
              <th className="px-2 py-2.5 text-left font-normal text-stone-700">{row.year}</th>
              {row.months.map((hasData, index) => (
                <td key={`${row.year}-${index + 1}`} className="px-2 py-2.5 text-center text-stone-700">
                  {hasData ? (
                    <span className="inline-flex min-w-[3.4rem] justify-center border border-stone-300 bg-stone-50 px-2 py-1 text-xs">
                      {String(index + 1).padStart(2, "0")}-{String(row.year).slice(-2)}
                    </span>
                  ) : (
                    <span className="text-stone-400">-</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyClimateTable({ matrix }: { matrix: WeatherMonthlyMatrix }) {
  return (
    <TablePanel
      id={`matrix-${matrix.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      title={matrix.title}
      subtitle={matrix.unitLabel}
      compact
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-300 text-left text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">
              <th className="px-2 py-2.5 font-medium">{matrix.unitLabel}</th>
              {WEATHER_SUMMARY_MONTH_LABELS.map((month) => (
                <th key={month} className="px-2 py-2.5 text-right font-medium">{month}</th>
              ))}
              <th className="px-2 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={`${matrix.title}-${row.year}`} className="border-b border-stone-200 last:border-b-0">
                <th className="px-2 py-2.5 text-left font-normal text-stone-700">{row.year}</th>
                {row.months.map((value, index) => (
                  <td key={`${row.year}-${index + 1}`} className="px-2 py-2.5 text-right text-stone-800">
                    {value}
                  </td>
                ))}
                <td className="px-2 py-2.5 text-right font-medium text-stone-800">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TablePanel>
  );
}

function TablePanel({
  id,
  title,
  subtitle,
  children,
  className = "",
  compact = false,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      id={id}
      className={`overflow-hidden border border-stone-200 bg-white ${className}`.trim()}
    >
      <div className={`border-b border-stone-200 ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
        <h2 className={`${compact ? "text-[1.65rem]" : "text-[2rem]"} font-light tracking-[-0.03em] text-stone-700`}>
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-xs uppercase tracking-[0.16em] text-stone-500">{subtitle}</p>
      </div>
      <div className={compact ? "px-4 py-3" : "px-5 py-4"}>{children}</div>
    </section>
  );
}

function TwoColumnTable({
  rows,
  emptyMessage,
  monoLabels = false,
}: {
  rows: FactRow[];
  emptyMessage: string;
  monoLabels?: boolean;
}) {
  if (!rows.length) {
    return <PanelState message={emptyMessage} />;
  }

  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-stone-200 last:border-b-0">
            <th
              className={`w-[46%] px-2 py-2.5 text-left align-top text-[0.98rem] font-normal text-stone-700 ${monoLabels ? "font-mono text-sm uppercase tracking-[0.14em] text-stone-500" : ""}`}
            >
              {row.label}
            </th>
            <td className="px-2 py-2.5 text-left text-[0.98rem] text-stone-800">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ThreeColumnTable({
  rows,
  emptyMessage,
}: {
  rows: SummaryRow[];
  emptyMessage: string;
}) {
  if (!rows.length) {
    return <PanelState message={emptyMessage} />;
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-stone-300 text-left text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">
          <th className="px-2 py-2.5 font-medium">Reading</th>
          <th className="px-2 py-2.5 font-medium">Value</th>
          <th className="px-2 py-2.5 font-medium">Time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-stone-200 last:border-b-0">
            <th className="px-2 py-2.5 text-left font-normal text-stone-700">{row.label}</th>
            <td className="px-2 py-2.5 text-stone-800">{row.value}</td>
            <td className="px-2 py-2.5 text-stone-500">{row.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ForecastTable({ periods }: { periods: WeatherForecastPeriod[] }) {
  if (!periods.length) {
    return (
      <PanelState message="NOAA did not return an hourly forecast for this fetch, so the live station data on this page is the most reliable read for now." />
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-stone-300 text-left text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">
          <th className="px-2 py-2.5 font-medium">Period</th>
          <th className="px-2 py-2.5 font-medium">Temp</th>
          <th className="px-2 py-2.5 font-medium">Conditions</th>
          <th className="px-2 py-2.5 font-medium">Wind</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((period) => (
          <tr key={period.startTime} className="border-b border-stone-200 last:border-b-0">
            <td className="px-2 py-2.5 text-stone-700">
              {formatWeatherDateTime(period.startTime)}
            </td>
            <td className="px-2 py-2.5 text-stone-800">
              {period.temperature === null
                ? "Not reported"
                : `${period.temperature} ${period.temperatureUnit}`}
            </td>
            <td className="px-2 py-2.5 text-stone-800">{period.shortForecast}</td>
            <td className="px-2 py-2.5 text-stone-500">
              {period.windSpeed} {period.windDirection}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StationTrendPanel({
  panel,
  view,
  coordinates,
}: {
  panel: StationGraphPanel;
  view: WeatherDashboardView;
  coordinates: { latitude: number; longitude: number };
}) {
  const { title, subtitle, seriesList } = panel;
  const width = 500;
  const height = 180;
  const left = 38;
  const right = 10;
  const top = 14;
  const bottom = 28;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const timeStart = Math.min(
    ...seriesList.flatMap((series) => series.points.map((point) => point.timestamp)),
  );
  const timeEnd = Math.max(
    ...seriesList.flatMap((series) => series.points.map((point) => point.timestamp)),
  );
  const scale =
    panel.plotType === "vector"
      ? null
      : buildSeriesScale(seriesList, panel);
  const xTicks = panel.plotType === "vector" ? [] : buildTimeTicks(timeStart, timeEnd, view);
  const dotStride = panel.plotType === "line" ? pickDotStride(seriesList) : 1;
  const nightBands =
    panel.showDayNight && panel.plotType !== "vector"
      ? buildNightBands(timeStart, timeEnd, coordinates)
      : [];
  const latestSummary = seriesList
    .map(
      (series) =>
        `${series.label} ${formatSeriesValue(
          series.points.at(-1)?.value ?? null,
          series.decimals,
          series.unit,
        )}`,
    )
    .join("  •  ");
  const unitLabel = buildUnitLabel(seriesList);
  const zeroY =
    scale && scale.min <= 0 && scale.max >= 0
      ? projectY(0, scale.min, scale.max, top, plotHeight)
      : top + plotHeight;

  return (
    <article className={styles.stationTrendCard}>
      <div className="border-b border-stone-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-[1rem] font-normal text-stone-800">{title}</h3>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-stone-500">
              {subtitle}
            </p>
          </div>
          <p className="text-right text-[10px] leading-4 text-stone-500">{latestSummary}</p>
        </div>
      </div>

      <div className="px-2 py-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${title} station plot`}
          className={styles.stationTrendPlot}
        >
          <rect
            x={left}
            y={top}
            width={plotWidth}
            height={plotHeight}
            className={styles.stationTrendPlotCanvas}
          />

          {panel.plotType === "vector" ? (
            renderWindVectorPlot({
              title,
              seriesList,
              left,
              top,
              plotWidth,
              plotHeight,
            })
          ) : scale ? (
            <>
              {nightBands.map((band) => {
                const x = projectX(band.startMs, timeStart, timeEnd, left, plotWidth);
                const bandRight = projectX(band.endMs, timeStart, timeEnd, left, plotWidth);

                return (
                    <rect
                      key={`${panel.id}-night-${band.startMs}`}
                      x={x}
                      y={top}
                      width={Math.max(bandRight - x, 0)}
                      height={plotHeight}
                      className={styles.stationTrendNightBand}
                    />
                );
              })}

              {scale.ticks.map((tick) => {
                const y = projectY(tick, scale.min, scale.max, top, plotHeight);

                return (
                  <g key={`${title}-y-${tick}`}>
                      <line
                        x1={left}
                        y1={y}
                        x2={left + plotWidth}
                        y2={y}
                        className={styles.stationTrendGridLine}
                      />
                      <text x={left - 6} y={y + 3} textAnchor="end" className={styles.stationTrendAxisText}>
                        {formatTickValue(tick, seriesList[0]?.decimals ?? 0)}
                      </text>
                  </g>
                );
              })}

              {xTicks.map((tick) => {
                const x = projectX(tick.timestamp, timeStart, timeEnd, left, plotWidth);

                return (
                  <g key={`${title}-x-${tick.timestamp}`}>
                      <line
                        x1={x}
                        y1={top}
                        x2={x}
                        y2={top + plotHeight}
                        className={styles.stationTrendTickLine}
                      />
                      <text
                        x={x}
                        y={top + plotHeight + 14}
                        textAnchor="middle"
                        className={styles.stationTrendAxisText}
                      >
                        {tick.label}
                      </text>
                  </g>
                );
              })}

              {panel.plotType === "bar"
                ? seriesList.map((series) =>
                    renderBarSeries({
                      series,
                      scale,
                      left,
                      top,
                      plotWidth,
                      plotHeight,
                      timeStart,
                      timeEnd,
                      zeroY,
                    }),
                  )
                : panel.plotType === "scatter"
                  ? seriesList.map((series) =>
                      renderScatterSeries({
                        series,
                        scale,
                        left,
                        top,
                        plotWidth,
                        plotHeight,
                        timeStart,
                        timeEnd,
                      }),
                    )
                  : seriesList.map((series) =>
                      renderLineSeries({
                        series,
                        scale,
                        left,
                        top,
                        plotWidth,
                        plotHeight,
                        timeStart,
                        timeEnd,
                        dotStride,
                      }),
                    )}
            </>
          ) : null}

          <text x={left + 2} y={11} className={styles.stationTrendAxisText}>
            {unitLabel}
          </text>
        </svg>
      </div>
    </article>
  );
}

function renderLineSeries(input: {
  series: WeatherSeries;
  scale: { min: number; max: number; ticks: number[] };
  left: number;
  top: number;
  plotWidth: number;
  plotHeight: number;
  timeStart: number;
  timeEnd: number;
  dotStride: number;
}) {
  const { series, scale, left, top, plotWidth, plotHeight, timeStart, timeEnd, dotStride } = input;
  const accent = pickSeriesAccent(series.id);
  const points = series.points.map((point) => ({
    x: projectX(point.timestamp, timeStart, timeEnd, left, plotWidth),
    y: projectY(point.value, scale.min, scale.max, top, plotHeight),
    timestamp: point.timestamp,
  }));
  const linePath = buildSegmentedLinePath(points, (timeEnd - timeStart) * 0.05);

  return (
    <g key={series.id}>
      <path
        d={linePath}
        fill="none"
        stroke={accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((point, index) =>
        index % dotStride === 0 || index === points.length - 1 ? (
          <circle key={`${series.id}-${index}`} cx={point.x} cy={point.y} r="1.2" fill={accent} />
        ) : null,
      )}
    </g>
  );
}

function renderBarSeries(input: {
  series: WeatherSeries;
  scale: { min: number; max: number; ticks: number[] };
  left: number;
  top: number;
  plotWidth: number;
  plotHeight: number;
  timeStart: number;
  timeEnd: number;
  zeroY: number;
}) {
  const { series, scale, left, top, plotWidth, plotHeight, timeStart, timeEnd, zeroY } = input;
  const accent = pickSeriesAccent(series.id);
  const barWidth = pickBarWidth(series.points, timeStart, timeEnd, plotWidth);

  return (
    <g key={series.id}>
      {series.points.map((point, index) => {
        const xCenter = projectX(point.timestamp, timeStart, timeEnd, left, plotWidth);
        const y = projectY(point.value, scale.min, scale.max, top, plotHeight);
        const barHeight = Math.max(Math.abs(zeroY - y), 1);

        return (
          <rect
            key={`${series.id}-${index}`}
            x={xCenter - barWidth / 2}
            y={Math.min(y, zeroY)}
            width={barWidth}
            height={barHeight}
            fill={accent}
            opacity="0.75"
          />
        );
      })}
    </g>
  );
}

function renderScatterSeries(input: {
  series: WeatherSeries;
  scale: { min: number; max: number; ticks: number[] };
  left: number;
  top: number;
  plotWidth: number;
  plotHeight: number;
  timeStart: number;
  timeEnd: number;
}) {
  const { series, scale, left, top, plotWidth, plotHeight, timeStart, timeEnd } = input;
  const accent = pickSeriesAccent(series.id);

  return (
    <g key={series.id}>
      {series.points.map((point, index) => {
        const x = projectX(point.timestamp, timeStart, timeEnd, left, plotWidth);
        const y = projectY(point.value, scale.min, scale.max, top, plotHeight);

        return (
          <rect
            key={`${series.id}-${index}`}
            x={x - 1.5}
            y={y - 1.5}
            width="3"
            height="3"
            fill={accent}
          />
        );
      })}
    </g>
  );
}

function renderWindVectorPlot(input: {
  title: string;
  seriesList: WeatherSeries[];
  left: number;
  top: number;
  plotWidth: number;
  plotHeight: number;
}) {
  const { title, seriesList, left, top, plotWidth, plotHeight } = input;
  const windSeries = seriesList.find((series) => series.id === "wind") ?? null;
  const directionSeries = seriesList.find((series) => series.id === "windDirection") ?? null;

  if (!windSeries || !directionSeries) {
    return null;
  }

  const vectorPoints = buildWindVectorSeries(windSeries.points, directionSeries.points);

  if (vectorPoints.length < 2) {
    return null;
  }

  const maxAbs = Math.max(
    ...vectorPoints.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
    1,
  );
  const scale = (Math.min(plotWidth, plotHeight) * 0.45) / maxAbs;
  const centerX = left + plotWidth / 2;
  const centerY = top + plotHeight / 2;
  const path = vectorPoints
    .map((point, index) => {
      const x = centerX + point.x * scale;
      const y = centerY - point.y * scale;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <g>
      <line
        x1={centerX}
        y1={top + 8}
        x2={centerX}
        y2={top + plotHeight - 8}
        className={styles.stationTrendCenterLine}
      />
      <line
        x1={left + 8}
        y1={centerY}
        x2={left + plotWidth - 8}
        y2={centerY}
        className={styles.stationTrendCenterLine}
      />
      <circle
        cx={centerX}
        cy={centerY}
        r={Math.min(plotWidth, plotHeight) * 0.34}
        className={styles.stationTrendVectorFrame}
      />
      <path
        d={path}
        fill="none"
        stroke={pickSeriesAccent("wind")}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={centerX + vectorPoints.at(-1)!.x * scale}
        cy={centerY - vectorPoints.at(-1)!.y * scale}
        r="2"
        fill={pickSeriesAccent("gust")}
      />
      <text x={centerX} y={top + 10} textAnchor="middle" className={styles.stationTrendAxisText}>
        N
      </text>
      <text x={left + 6} y={top + plotHeight - 6} className={styles.stationTrendAxisText}>
        Progressive vector
      </text>
      <text x={left + plotWidth - 6} y={top + plotHeight - 6} textAnchor="end" className={styles.stationTrendAxisText}>
        {title}
      </text>
    </g>
  );
}

function buildWindVectorSeries(
  windPoints: WeatherSeriesPoint[],
  directionPoints: WeatherSeriesPoint[],
) {
  const directionByTimestamp = new Map(directionPoints.map((point) => [point.timestamp, point.value]));
  let x = 0;
  let y = 0;
  const path = [{ x, y }];

  for (const point of windPoints) {
    const direction = directionByTimestamp.get(point.timestamp);

    if (direction === undefined) {
      continue;
    }

    const radians = ((direction - 90) * Math.PI) / 180;
    x += Math.cos(radians) * point.value;
    y += Math.sin(radians) * point.value;
    path.push({ x, y });
  }

  return path;
}

function buildSegmentedLinePath(
  points: Array<{ x: number; y: number; timestamp: number }>,
  maxGapMs: number,
) {
  let path = "";

  points.forEach((point, index) => {
    const previous = points[index - 1];
    const command =
      !previous || point.timestamp - previous.timestamp > maxGapMs ? "M" : "L";
    path += `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
  });

  return path.trim();
}

function pickBarWidth(points: WeatherSeriesPoint[], timeStart: number, timeEnd: number, plotWidth: number) {
  if (points.length < 2) {
    return 6;
  }

  const positions = points.map((point) => projectX(point.timestamp, timeStart, timeEnd, 0, plotWidth));
  let minGap = Number.POSITIVE_INFINITY;

  for (let index = 1; index < positions.length; index += 1) {
    minGap = Math.min(minGap, positions[index] - positions[index - 1]);
  }

  return Math.max(Math.min(minGap * 0.7, 14), 3);
}

function buildUnitLabel(seriesList: WeatherSeries[]) {
  const units = [...new Set(seriesList.map((series) => series.unit).filter(Boolean))];
  return units.length ? units.join(" / ") : "station plot";
}

function buildNightBands(
  startMs: number,
  endMs: number,
  coordinates: { latitude: number; longitude: number },
) {
  const startParts = getWeatherCalendarParts(new Date(startMs));
  const firstLocalNoon = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day - 1, 12));
  const bands: Array<{ startMs: number; endMs: number }> = [];

  for (
    let cursor = firstLocalNoon.getTime();
    cursor <= endMs + 24 * 60 * 60 * 1000;
    cursor += 24 * 60 * 60 * 1000
  ) {
    const tonight = getTimes(new Date(cursor), coordinates.latitude, coordinates.longitude).sunset.getTime();
    const tomorrow = getTimes(
      new Date(cursor + 24 * 60 * 60 * 1000),
      coordinates.latitude,
      coordinates.longitude,
    ).sunrise.getTime();
    const bandStart = Math.max(tonight, startMs);
    const bandEnd = Math.min(tomorrow, endMs);

    if (bandEnd > bandStart) {
      bands.push({ startMs: bandStart, endMs: bandEnd });
    }
  }

  return bands;
}

function PanelState({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm leading-6 text-stone-500">
      {message}
    </div>
  );
}

function CameraGrid({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<WeatherCamera>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-light text-stone-700">{title}</h3>
        <p className="text-[0.68rem] uppercase tracking-[0.14em] text-stone-500">
          Tap any card for live view
        </p>
      </div>
      <div className="mt-2">
        <WeatherCameraGrid items={items} />
      </div>
    </div>
  );
}

function TrafficMapPanel({
  title,
  src,
  href,
}: {
  title: string;
  src: string;
  href: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-light text-stone-700">{title}</h3>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500 underline decoration-stone-300 underline-offset-4 hover:text-stone-700"
        >
          Open Full Map
        </a>
      </div>
      <div className="mt-2 overflow-hidden border border-stone-200 bg-white">
        <iframe
          title={title}
          src={src}
          loading="lazy"
          className="h-[430px] w-full"
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-stone-500">
        Live SDOT traveler map for incidents, congestion, and camera context around the station area.
      </p>
    </div>
  );
}

function SummaryCardPanel({ card }: { card: SummaryCard }) {
  return (
    <section className="bg-white px-4 py-3">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-stone-500">{card.label}</p>
      <p className="mt-1 text-[1.45rem] font-light tracking-[-0.03em] text-stone-800">{card.value}</p>
      <p className="mt-1 text-xs leading-5 text-stone-500">{card.note}</p>
    </section>
  );
}

function RecordCardPanel({ card }: { card: RecordCard }) {
  return (
    <section className="bg-white px-4 py-3">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-stone-500">{card.label}</p>
      <p className="mt-1 text-[1.35rem] font-light tracking-[-0.03em] text-stone-800">{card.value}</p>
      <p className="mt-1 text-xs leading-5 text-stone-500">{card.note}</p>
    </section>
  );
}

function ArchivePanel({
  id,
  panel,
}: {
  id: string;
  panel: ComparisonPanel;
}) {
  return (
    <section id={id} className="bg-white px-4 py-3">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-stone-500">Archive Window</p>
      <p className="mt-1 text-base font-light tracking-[-0.02em] text-stone-700">{panel.title}</p>
      <p className="mt-1 text-xs leading-5 text-stone-500">{panel.subtitle}</p>
      <div className="mt-3 space-y-2">
        {panel.rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1.1fr_0.9fr] gap-3 border-t border-stone-200 pt-2 first:border-t-0 first:pt-0"
          >
            <div>
              <p className="text-sm text-stone-700">{row.label}</p>
              <p className="text-xs text-stone-500">{row.detail}</p>
            </div>
            <p className="text-right text-sm font-medium text-stone-800">{row.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildCurrentConditionRows(observations: WeatherObservation[]): FactRow[] {
  const latest = observations.at(-1) ?? null;

  if (!latest) {
    return [];
  }

  const rows: FactRow[] = [];

  for (const definition of currentConditionDefinitions) {
    const value =
      "render" in definition
        ? definition.render(latest)
        : formatObservationValue(latest, definition.keys, definition.decimals, definition.unit);

    if (!value) {
      continue;
    }

    rows.push({
      label: definition.label,
      value,
    });

    if (definition.label === "Barometer") {
      const trend = buildTrendValue(
        observations,
        ["baromrelin", "baromabsin"],
        3 * 60 * 60 * 1000,
        3,
        "inHg",
      );

      if (trend) {
        rows.push({
          label: "Barometer Trend (3 Hours)",
          value: trend,
        });
      }
    }
  }

  return rows;
}

function buildPeriodSummaryRows(
  data: WeatherOverview,
  view: WeatherDashboardView,
): SummaryRow[] {
  const observations = view === "current"
    ? filterObservationsForLatestDay(data.observations)
    : data.observations;

  if (!observations.length) {
    return [];
  }

  return buildPeriodSummaryRowsFromObservations(observations);
}

function buildRecentSummaryRows(data: WeatherOverview): SummaryRow[] {
  const { observations } = data;

  if (!observations.length) {
    return [];
  }

  return [
    {
      label: "Loaded Window",
      value: `${formatWeatherDateTime(data.timeRange.startAt || data.fetchedAt)} to ${formatWeatherDateTime(data.timeRange.endAt || data.fetchedAt)}`,
      detail: formatSpan(data.timeRange.spanMs),
    },
    {
      label: "Observations Loaded",
      value: String(data.observationCount),
      detail: "Most recent local history",
    },
    createRangeRow(observations, "Temperature Range", ["tempf"], 1, "F"),
    createRangeRow(observations, "Humidity Range", ["humidity"], 0, "%"),
    createRangeRow(observations, "Pressure Range", ["baromrelin", "baromabsin"], 3, "inHg"),
    createExtremeRow(observations, "Peak Gust", ["windgustmph"], "max", 1, "mph"),
    createAverageRow(observations, "Average Wind", ["windspeedmph"], 1, "mph"),
    createLatestValueRow(observations, "Rain So Far", ["dailyrainin"], 2, "in"),
    createExtremeRow(observations, "High UV", ["uv"], "max", 1, ""),
    createExtremeRow(observations, "High Solar", ["solarradiation"], "max", 0, "W/m2"),
  ].filter((row): row is SummaryRow => row !== null);
}

function buildMastheadRows(data: WeatherOverview, view: WeatherDashboardView): FactRow[] {
  return [
    { label: "Station", value: data.station.name || "Unknown station" },
    { label: "View", value: getViewMeta(view).label },
    { label: "Software", value: "Ambient Weather + Firestore + NOAA" },
    {
      label: "Last report",
      value: data.station.lastObservationAt || formatWeatherLong(data.fetchedAt),
    },
    { label: "Loaded", value: `${data.observationCount} observations` },
    { label: "History", value: formatSpan(data.timeRange.spanMs) },
  ];
}

function buildStationDetailRows(data: WeatherOverview, notice?: string): FactRow[] {
  const coordinates = resolveDisplayCoordinates(data);

  return [
    { label: "Station", value: data.station.name || "Unknown station" },
    { label: "Location", value: data.station.location || "Location not provided" },
    {
      label: "Coordinates",
      value: `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`,
    },
    { label: "MAC Address", value: data.station.macAddress || "Not reported" },
    {
      label: "Last Station Report",
      value: data.station.lastObservationAt || formatWeatherLong(data.fetchedAt),
    },
    { label: "Local Refresh", value: formatWeatherLong(data.fetchedAt) },
    { label: "Loaded Observations", value: String(data.observationCount) },
    { label: "Loaded History", value: formatSpan(data.timeRange.spanMs) },
    { label: "Forecast Source", value: data.forecast.length ? "NOAA hourly forecast" : "Unavailable on this fetch" },
    { label: "Feed Status", value: notice ? "Serving cached or persisted data" : "Serving latest fetch" },
  ];
}

function shouldDisplayWeatherNotice(notice?: string) {
  if (!notice) {
    return false;
  }

  return !(
    notice.includes("recently cached station snapshot") ||
    notice.includes("rate-limited the live fetch") ||
    notice.includes("persisted logger history from Firestore")
  );
}

function getViewMeta(view: WeatherDashboardView) {
  if (view === "year") {
  return {
    label: "Year",
    heading: "Yearly Weather History",
    subtitle: "Persisted yearly station history.",
    primaryTitle: "This Year",
    primarySubtitle: "Stored station readings collected across the yearly view.",
    periodTitle: "This Year",
    periodSubtitle: "Highs, lows, and peaks across the stored yearly view.",
  };
  }

  if (view === "month") {
    return {
      label: "Month",
      heading: "Monthly Weather History",
      subtitle: "Month-scale station archive.",
      primaryTitle: "This Month",
      primarySubtitle: "Stored station readings collected across the monthly view.",
      periodTitle: "This Month",
      periodSubtitle: "Highs, lows, and peaks across the stored monthly view.",
    };
  }

  if (view === "week") {
    return {
      label: "Week",
      heading: "Weekly Weather History",
      subtitle: "Seven-day station archive.",
      primaryTitle: "This Week",
      primarySubtitle: "Stored station readings collected across the weekly view.",
      periodTitle: "This Week",
      periodSubtitle: "Highs, lows, and peaks across the stored weekly view.",
    };
  }

  return {
    label: "Current",
    heading: "Current Weather Conditions",
    subtitle: "Latest live station conditions.",
    primaryTitle: "Current Conditions",
    primarySubtitle: "Latest station reading from the current live view.",
    periodTitle: "Since Midnight",
    periodSubtitle: "Today's highs, lows, and peaks from the loaded station observations.",
  };
}

function buildSummaryCards(data: WeatherOverview): SummaryCard[] {
  const humidityRow = createLatestValueRow(data.observations, "Humidity", ["humidity"], 0, "%");
  const rainRow = createLatestValueRow(data.observations, "Rain", ["dailyrainin"], 2, "in");
  const avgWindRow = createAverageRow(data.observations, "Average Wind", ["windspeedmph"], 1, "mph");
  const gustRow = createExtremeRow(data.observations, "Peak Gust", ["windgustmph"], "max", 1, "mph");
  const uvRow = createExtremeRow(data.observations, "High UV", ["uv"], "max", 1, "");
  const solarRow = createExtremeRow(
    data.observations,
    "High Solar",
    ["solarradiation"],
    "max",
    0,
    "W/m2",
  );
  const tempTrend = buildTrendValue(data.observations, ["tempf"], 3 * 60 * 60 * 1000, 1, "F");
  const pressureTrend = buildTrendValue(
    data.observations,
    ["baromrelin", "baromabsin"],
    3 * 60 * 60 * 1000,
    3,
    "inHg",
  );

  return [
    {
      label: "Temperature Trend",
      value: tempTrend ?? "Not enough history",
      note: "3-hour change.",
    },
    {
      label: "Pressure Trend",
      value: pressureTrend ?? "Not enough history",
      note: "3-hour barometer swing.",
    },
    {
      label: "Wind Window",
      value:
        avgWindRow && gustRow
          ? `${avgWindRow.value} avg / ${gustRow.value} gust`
          : avgWindRow?.value ?? gustRow?.value ?? "Not reported",
      note: "Average and strongest gust.",
    },
    {
      label: "Moisture Snapshot",
      value:
        [humidityRow ? `${humidityRow.value} RH` : null, rainRow ? `${rainRow.value} rain` : null]
          .filter((part): part is string => Boolean(part))
          .join(" / ") ||
        [uvRow ? `${uvRow.value} UV` : null, solarRow ? `${solarRow.value} solar` : null]
          .filter((part): part is string => Boolean(part))
          .join(" / ") ||
        "Not reported",
      note: "Humidity, rainfall, UV, solar.",
    },
  ];
}

function buildRecordCards(data: WeatherOverview, view: WeatherDashboardView): RecordCard[] {
  const observations =
    view === "current" ? filterObservationsForLatestDay(data.observations) : data.observations;

  const warmest = createExtremeRow(observations, "Warmest", ["tempf"], "max", 1, "F");
  const coolest = createExtremeRow(observations, "Coolest", ["tempf"], "min", 1, "F");
  const strongestGust = createExtremeRow(
    observations,
    "Strongest Gust",
    ["windgustmph"],
    "max",
    1,
    "mph",
  );
  const highestUv = createExtremeRow(observations, "Highest UV", ["uv"], "max", 1, "");
  const highestPressure = createExtremeRow(
    observations,
    "Highest Pressure",
    ["baromrelin", "baromabsin"],
    "max",
    3,
    "inHg",
  );

  return [
    warmest
      ? { label: "Warmest", value: warmest.value, note: `Reached ${warmest.detail}` }
      : null,
    coolest
      ? { label: "Coolest", value: coolest.value, note: `Reached ${coolest.detail}` }
      : null,
    strongestGust
      ? { label: "Strongest Gust", value: strongestGust.value, note: `Observed ${strongestGust.detail}` }
      : null,
    highestUv
      ? { label: "Highest UV", value: highestUv.value, note: `Observed ${highestUv.detail}` }
      : null,
    highestPressure
      ? { label: "Highest Pressure", value: highestPressure.value, note: `Observed ${highestPressure.detail}` }
      : null,
  ].filter((card): card is RecordCard => card !== null);
}

async function getHistoricalComparisonPanels(
  data: WeatherOverview,
  view: WeatherDashboardView,
) {
  const window = resolveComparisonWindow(data, view);

  if (!window || !data.station.macAddress) {
    return [];
  }

  if (view === "current") {
    const latestDate = new Date(window.endMs);
    const parts = getWeatherCalendarParts(latestDate);
    const priorYear = parts.year - 1;
    const [yesterday, weekEarlier, priorYearDay] = await Promise.all([
      readStoredWeatherObservationsBetween({
        macAddress: data.station.macAddress,
        startMs: window.startMs - 24 * 60 * 60 * 1000,
        endMs: window.endMs - 24 * 60 * 60 * 1000,
      }).catch(() => []),
      readStoredWeatherObservationsBetween({
        macAddress: data.station.macAddress,
        startMs: window.startMs - 7 * 24 * 60 * 60 * 1000,
        endMs: window.endMs - 7 * 24 * 60 * 60 * 1000,
      }).catch(() => []),
      readStoredWeatherObservationsForDay({
        macAddress: data.station.macAddress,
        year: priorYear,
        month: parts.month,
        day: parts.day,
      }).catch(() => []),
    ]);

    return [
      buildComparisonPanel(
        "Yesterday",
        "The previous day in the same local station window.",
        yesterday,
      ),
      buildComparisonPanel(
        "One Week Earlier",
        "A same-window comparison from seven days earlier in the archive.",
        weekEarlier,
      ),
      buildComparisonPanel(
        `Last ${formatWeatherDayLabel(parts.month, parts.day)} (${priorYear})`,
        "A same-day comparison from the stored station archive one year back.",
        priorYearDay,
      ),
    ].filter((panel): panel is ComparisonPanel => panel !== null);
  }

  const spanMs = Math.max(window.endMs - window.startMs, 60 * 60 * 1000);
  const priorWindowTitle =
    view === "week" ? "Previous Week" : view === "month" ? "Previous Month" : "Previous Year";
  const earlierWindowTitle =
    view === "week" ? "Two Weeks Earlier" : view === "month" ? "Two Months Earlier" : "Two Years Earlier";

  const queries = [
    {
      title: priorWindowTitle,
      subtitle: "The immediately preceding stored window for this same station view.",
      startMs: window.startMs - spanMs,
      endMs: window.startMs,
    },
    {
      title: earlierWindowTitle,
      subtitle: "An older archive window so the page feels more like a classic station summary stack.",
      startMs: window.startMs - spanMs * 2,
      endMs: window.startMs - spanMs,
    },
  ];

  if (view === "year") {
    queries.push({
      title: "Three Years Earlier",
      subtitle: "A deeper annual archive comparison when enough stored history exists.",
      startMs: window.startMs - spanMs * 3,
      endMs: window.startMs - spanMs * 2,
    });
  } else {
    queries.push({
      title: `Same ${getViewMeta(view).label} Last Year`,
      subtitle: "The matching window shifted back one year to show seasonality.",
      startMs: shiftTimestampByYears(window.startMs, -1),
      endMs: shiftTimestampByYears(window.endMs, -1),
    });
  }

  const results = await Promise.all(
    queries.map(async (query) => ({
      ...query,
      observations: await readStoredWeatherObservationsBetween({
        macAddress: data.station.macAddress,
        startMs: query.startMs,
        endMs: query.endMs,
      }).catch(() => []),
    })),
  );

  return results
    .map((result) => buildComparisonPanel(result.title, result.subtitle, result.observations))
    .filter((panel): panel is ComparisonPanel => panel !== null);
}

function buildComparisonPanel(
  title: string,
  subtitle: string,
  observations: WeatherObservation[],
) {
  if (!observations.length) {
    return null;
  }

  const rows = buildComparisonRowsFromObservations(observations);

  if (!rows.length) {
    return null;
  }

  return {
    title,
    subtitle,
    rows,
  };
}

function buildComparisonRowsFromObservations(observations: WeatherObservation[]) {
  return [
    createExtremeRow(observations, "High Temperature", ["tempf"], "max", 1, "F"),
    createExtremeRow(observations, "Low Temperature", ["tempf"], "min", 1, "F"),
    createExtremeRow(observations, "Peak Gust", ["windgustmph"], "max", 1, "mph"),
    createLatestValueRow(observations, "Rain", ["dailyrainin"], 2, "in"),
    createExtremeRow(observations, "High Pressure", ["baromrelin", "baromabsin"], "max", 3, "inHg"),
  ].filter((row): row is SummaryRow => row !== null);
}

function resolveComparisonWindow(data: WeatherOverview, view: WeatherDashboardView) {
  const observations =
    view === "current" ? filterObservationsForLatestDay(data.observations) : data.observations;

  const startMs = observations[0]?.timestamp ?? 0;
  const endMs = observations.at(-1)?.timestamp ?? 0;

  if (!startMs || !endMs) {
    return null;
  }

  return { startMs, endMs };
}

function shiftTimestampByYears(timestamp: number, years: number) {
  const value = new Date(timestamp);
  value.setUTCFullYear(value.getUTCFullYear() + years);
  return value.getTime();
}

function buildHeaderMeta(
  data: WeatherOverview,
  coordinates: { latitude: number; longitude: number },
) {
  const parts = [];

  if (data.station.location) {
    parts.push(data.station.location);
  }

  parts.push(
    `${formatCoordinate(coordinates.latitude, "N", "S")} | ${formatCoordinate(coordinates.longitude, "E", "W")}`,
  );

  return parts.join(" | ");
}

function resolveDisplayCoordinates(data: WeatherOverview) {
  return {
    latitude: data.station.latitude ?? DISPLAY_COORDINATES.latitude,
    longitude: data.station.longitude ?? DISPLAY_COORDINATES.longitude,
  };
}

function buildMapUrl(latitude: number, longitude: number) {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

function buildRadarEmbedUrl(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    lat: latitude.toFixed(4),
    lon: longitude.toFixed(4),
    detailLat: latitude.toFixed(4),
    detailLon: longitude.toFixed(4),
    width: "650",
    height: "520",
    zoom: "7",
    level: "surface",
    overlay: "radar",
    product: "radar",
    menu: "",
    message: "true",
    marker: "true",
    calendar: "now",
    pressure: "true",
    type: "map",
    location: "coordinates",
    detail: "true",
    metricWind: "mph",
    metricTemp: "°F",
  });

  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

function createExtremeRow(
  observations: WeatherObservation[],
  label: string,
  keys: string[],
  mode: "min" | "max",
  decimals: number,
  unit: string,
) {
  const matches = observations
    .map((observation) => {
      const value = pickNumber(observation, keys);

      if (value === null) {
        return null;
      }

      return {
        value,
        timestamp: observation.timestamp ?? 0,
      };
    })
    .filter((entry): entry is { value: number; timestamp: number } => entry !== null);

  if (!matches.length) {
    return null;
  }

  const winner = matches.reduce((current, entry) => {
    if (mode === "max") {
      return entry.value > current.value ? entry : current;
    }

    return entry.value < current.value ? entry : current;
  });

  return {
    label,
    value: formatSeriesValue(winner.value, decimals, unit),
    detail: winner.timestamp ? formatWeatherClock(winner.timestamp) : "--",
  };
}

function buildPeriodSummaryRowsFromObservations(observations: WeatherObservation[]) {
  return [
    createExtremeRow(observations, "High Temperature", ["tempf"], "max", 1, "F"),
    createExtremeRow(observations, "Low Temperature", ["tempf"], "min", 1, "F"),
    createExtremeRow(observations, "High Heat Index", ["heatindexf"], "max", 1, "F"),
    createExtremeRow(observations, "Low Wind Chill", ["windchillf"], "min", 1, "F"),
    createExtremeRow(observations, "High Dewpoint", ["dewPoint", "dewpointf"], "max", 1, "F"),
    createExtremeRow(observations, "Low Dewpoint", ["dewPoint", "dewpointf"], "min", 1, "F"),
    createExtremeRow(observations, "High Humidity", ["humidity"], "max", 0, "%"),
    createExtremeRow(observations, "Low Humidity", ["humidity"], "min", 0, "%"),
    createExtremeRow(observations, "High Barometer", ["baromrelin", "baromabsin"], "max", 3, "inHg"),
    createExtremeRow(observations, "Low Barometer", ["baromrelin", "baromabsin"], "min", 3, "inHg"),
    createLatestValueRow(observations, "Rain", ["dailyrainin"], 2, "in"),
    createExtremeRow(observations, "High Rain Rate", ["hourlyrainin"], "max", 2, "in/h"),
    createExtremeRow(observations, "High Wind", ["windspeedmph"], "max", 1, "mph"),
    createAverageRow(observations, "Average Wind", ["windspeedmph"], 1, "mph"),
    createExtremeRow(observations, "Peak Gust", ["windgustmph"], "max", 1, "mph"),
    createExtremeRow(observations, "High UV", ["uv"], "max", 1, ""),
    createExtremeRow(observations, "High Radiation", ["solarradiation"], "max", 0, "W/m2"),
    createExtremeRow(observations, "High Brightness", ["brightness", "lux"], "max", 0, "lx"),
    createLatestValueRow(observations, "Lightning Strikes", ["lightning_day", "lightning"], 0, ""),
  ].filter((row): row is SummaryRow => row !== null);
}

function createAverageRow(
  observations: WeatherObservation[],
  label: string,
  keys: string[],
  decimals: number,
  unit: string,
) {
  const values = observations
    .map((observation) => pickNumber(observation, keys))
    .filter((value): value is number => value !== null);

  if (!values.length) {
    return null;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    label,
    value: formatSeriesValue(average, decimals, unit),
    detail: `${values.length} samples`,
  };
}

function createLatestValueRow(
  observations: WeatherObservation[],
  label: string,
  keys: string[],
  decimals: number,
  unit: string,
) {
  let latest: WeatherObservation | null = null;

  for (let index = observations.length - 1; index >= 0; index -= 1) {
    const candidate = observations[index];

    if (pickNumber(candidate, keys) !== null) {
      latest = candidate;
      break;
    }
  }

  if (!latest) {
    return null;
  }

  const value = pickNumber(latest, keys);

  if (value === null) {
    return null;
  }

  return {
    label,
    value: formatSeriesValue(value, decimals, unit),
    detail: latest.timestamp ? formatWeatherClock(latest.timestamp) : "--",
  };
}

function createRangeRow(
  observations: WeatherObservation[],
  label: string,
  keys: string[],
  decimals: number,
  unit: string,
) {
  const matches = observations
    .map((observation) => {
      const value = pickNumber(observation, keys);

      if (value === null) {
        return null;
      }

      return {
        value,
        timestamp: observation.timestamp ?? 0,
      };
    })
    .filter((entry): entry is { value: number; timestamp: number } => entry !== null);

  if (matches.length < 2) {
    return null;
  }

  const min = matches.reduce((current, entry) =>
    entry.value < current.value ? entry : current,
  );
  const max = matches.reduce((current, entry) =>
    entry.value > current.value ? entry : current,
  );

  return {
    label,
    value: `${formatSeriesValue(min.value, decimals, unit)} to ${formatSeriesValue(max.value, decimals, unit)}`,
    detail: `${formatWeatherClock(min.timestamp)} / ${formatWeatherClock(max.timestamp)}`,
  };
}

function buildTrendValue(
  observations: WeatherObservation[],
  keys: string[],
  lookbackMs: number,
  decimals: number,
  unit: string,
) {
  if (observations.length < 2) {
    return null;
  }

  const latest = observations.at(-1) ?? null;
  const latestValue = latest ? pickNumber(latest, keys) : null;
  const latestTimestamp = latest?.timestamp ?? 0;

  if (latestValue === null || latestTimestamp === 0) {
    return null;
  }

  const cutoff = latestTimestamp - lookbackMs;
  let prior: WeatherObservation | null = null;

  for (let index = observations.length - 1; index >= 0; index -= 1) {
    const candidate = observations[index];

    if ((candidate.timestamp ?? 0) <= cutoff && pickNumber(candidate, keys) !== null) {
      prior = candidate;
      break;
    }
  }

  if (!prior) {
    return null;
  }

  const priorValue = pickNumber(prior, keys);

  if (priorValue === null) {
    return null;
  }

  const delta = latestValue - priorValue;
  const sign = delta > 0 ? "+" : "";

  return `${sign}${formatCompact(delta, decimals)} ${unit}`.trim();
}

async function loadWeatherSummaryArchive(macAddress: string) {
  if (!macAddress) {
    return null;
  }

  try {
    const observations = await readStoredWeatherObservationsBetween({
      macAddress,
      startMs: 0,
      endMs: Date.now() + 24 * 60 * 60 * 1000,
      limit: 100_000,
    });

    return buildWeatherSummaryArchive(observations);
  } catch {
    return null;
  }
}

function getPageMeta(
  activeView: WeatherDashboardView,
  activeDocumentTab: WeatherDocumentTab,
  viewMeta: ReturnType<typeof getViewMeta>,
  summaryArchive: WeatherSummaryArchive | null,
  defaultTimestampLabel: string,
) {
  if (activeDocumentTab === "summaries") {
    return {
      heading: "Summaries and Records",
      timestampLabel: summaryArchive?.lastUpdatedLabel ?? "Archive update unavailable",
    };
  }

  if (activeDocumentTab === "radar") {
    return {
      heading: "Regional Radar",
      timestampLabel: defaultTimestampLabel,
    };
  }

  if (activeDocumentTab === "cameras") {
    return {
      heading: "Local Cameras",
      timestampLabel: defaultTimestampLabel,
    };
  }

  if (activeDocumentTab === "graphs") {
    return {
      heading: `${viewMeta.label === "Current" ? "Daily" : viewMeta.label} Weather Graphs`,
      timestampLabel: defaultTimestampLabel,
    };
  }

  if (activeDocumentTab === "about") {
    return {
      heading: "About This Station",
      timestampLabel: defaultTimestampLabel,
    };
  }

  return {
    heading: viewMeta.heading,
    timestampLabel: defaultTimestampLabel,
  };
}

function filterObservationsForLatestDay(observations: WeatherObservation[]) {
  const latestTimestamp = observations.at(-1)?.timestamp ?? 0;
  const latestDayKey = formatDayKey(latestTimestamp);

  return observations.filter(
    (observation) => formatDayKey(observation.timestamp ?? 0) === latestDayKey,
  );
}

function formatObservationValue(
  observation: WeatherObservation,
  keys: readonly string[],
  decimals: number,
  unit: string,
) {
  const value = pickNumber(observation, keys);

  if (value === null) {
    return null;
  }

  return formatSeriesValue(value, decimals, unit);
}

function formatSeriesValue(value: number | null, decimals: number, unit: string) {
  if (value === null) {
    return "Not reported";
  }

  const suffix = unit ? ` ${unit}` : "";

  return `${formatCompact(value, decimals)}${suffix}`;
}

function formatCompact(value: number, decimals: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatWind(
  observation: WeatherObservation,
  speedKey: string,
  directionKey: string,
) {
  const speed = pickNumber(observation, [speedKey]);
  const direction = pickNumber(observation, [directionKey]);

  if (speed === null) {
    return null;
  }

  const directionLabel =
    direction === null ? "" : ` ${degreesToCompass(direction)} (${Math.round(direction)} degrees)`;

  return `${formatCompact(speed, 1)} mph${directionLabel}`;
}

function pickNumber(source: WeatherObservation, keys: readonly string[]) {
  for (const key of keys) {
    const raw = source[key];

    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }

    if (typeof raw === "string" && raw.trim() !== "") {
      const parsed = Number(raw);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function degreesToCompass(degrees: number) {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % points.length;
  return points[index];
}

function formatDayKey(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatCoordinate(value: number, positive: string, negative: string) {
  const suffix = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(4)} ${suffix}`;
}

function formatSpan(spanMs: number) {
  if (spanMs <= 0) {
    return "No history loaded";
  }

  const totalMinutes = Math.round(spanMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (days) {
    parts.push(`${days}d`);
  }

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (minutes && parts.length < 2) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ") || "Less than 1m";
}

function prepareGraphSeries(
  seriesList: WeatherSeries[],
  view: WeatherDashboardView,
) {
  return seriesList
    .map((series) => ({
      ...series,
      points: normalizeSeriesPointsForView(series, view),
    }))
    .filter((series) => series.points.length > 1);
}

function buildStationGraphPanels(
  seriesList: WeatherSeries[],
  view: WeatherDashboardView,
  rawSeriesList: WeatherSeries[] = seriesList,
): StationGraphPanel[] {
  const byId = new Map(seriesList.map((series) => [series.id, series] as const));
  const rawById = new Map(rawSeriesList.map((series) => [series.id, series] as const));
  const periodLabel =
    view === "current"
      ? "Daily"
      : view === "week"
        ? "Weekly"
        : view === "month"
          ? "Monthly"
          : "Yearly";
  const specs = [
    {
      id: "temperatures",
      title: "Temperatures",
      subtitle: `${periodLabel} outdoor temperature and dew point`,
      ids: ["temperature", "dewpoint", "indoorTemperature"],
      plotType: "line",
      showDayNight: view === "current" || view === "week",
    },
    {
      id: "rain",
      title: "Rain",
      subtitle: `${periodLabel} rain totals`,
      ids: ["rain"],
      plotType: "bar",
      showDayNight: false,
      fixedScale: { min: 0, max: 0, minInterval: 0.02 },
    },
    {
      id: "wind",
      title: "Wind",
      subtitle: `${periodLabel} sustained wind speed`,
      ids: ["wind"],
      plotType: "line",
      showDayNight: view === "current" || view === "week",
    },
    {
      id: "high-wind",
      title: "Hi Wind",
      subtitle: `${periodLabel} peak gust plot`,
      ids: ["gust"],
      plotType: "line",
      showDayNight: view === "current" || view === "week",
    },
    {
      id: "wind-direction",
      title: "Wind Direction",
      subtitle: `${periodLabel} direction markers`,
      ids: ["windDirection"],
      plotType: "scatter",
      showDayNight: false,
      fixedScale: { min: 0, max: 360, minInterval: 45 },
    },
    {
      id: "wind-vector",
      title: "Wind Vector",
      subtitle: `${periodLabel} progressive vector plot`,
      ids: ["wind", "windDirection"],
      plotType: "vector",
      showDayNight: false,
    },
    {
      id: "barometer",
      title: "Barometer",
      subtitle: `${periodLabel} pressure trend`,
      ids: ["pressure"],
      plotType: "line",
      showDayNight: view === "current" || view === "week",
    },
    {
      id: "humidity",
      title: "Inside/Outside Humidity",
      subtitle: `${periodLabel} humidity comparison`,
      ids: ["humidity", "indoorHumidity"],
      plotType: "line",
      showDayNight: view === "current" || view === "week",
    },
    {
      id: "radiation",
      title: "Radiation",
      subtitle: `${periodLabel} solar radiation`,
      ids: ["solar"],
      plotType: "line",
      showDayNight: view === "current" || view === "week",
    },
    {
      id: "uv",
      title: "UV Index",
      subtitle: `${periodLabel} UV trend`,
      ids: ["uv"],
      plotType: "line",
      showDayNight: view === "current" || view === "week",
    },
    {
      id: "lightning",
      title: "Lightning",
      subtitle: `${periodLabel} lightning count`,
      ids: ["lightning"],
      plotType: "bar",
      showDayNight: false,
      fixedScale: { min: 0, max: 0, minInterval: 1 },
    },
  ] satisfies Array<Omit<StationGraphPanel, "seriesList"> & { ids: string[] }>;

  const panels = specs
    .map((spec) => {
      const panelSeries = spec.ids
        .map((id) => byId.get(id))
        .filter((series): series is WeatherSeries => Boolean(series));

      if (panelSeries.length === 0) {
        return null;
      }

      return {
        id: spec.id,
        title: spec.title,
        subtitle: spec.subtitle,
        seriesList: panelSeries,
        plotType: spec.plotType,
        showDayNight: spec.showDayNight,
        fixedScale: spec.fixedScale,
      };
    })
    .filter(Boolean) as StationGraphPanel[];

  if (view === "year") {
    const yearHiLowPanel = buildYearHiLowPanel(rawById.get("temperature"));

    if (yearHiLowPanel) {
      panels.splice(1, 0, yearHiLowPanel);
    }
  }

  return panels;
}

function buildYearHiLowPanel(temperatureSeries?: WeatherSeries) {
  if (!temperatureSeries) {
    return null;
  }

  const highPoints = aggregateSeriesPoints(temperatureSeries.points, 24 * 60 * 60 * 1000, "max");
  const lowPoints = aggregateSeriesPoints(temperatureSeries.points, 24 * 60 * 60 * 1000, "min");

  if (highPoints.length < 2 || lowPoints.length < 2) {
    return null;
  }

  return {
    id: "year-hi-low",
    title: "Year Hi/Low",
    subtitle: "Daily high and low temperatures",
    plotType: "line" as const,
    showDayNight: false,
    seriesList: [
      {
        ...temperatureSeries,
        id: "yearHigh",
        label: "High",
        points: highPoints,
      },
      {
        ...temperatureSeries,
        id: "yearLow",
        label: "Low",
        points: lowPoints,
      },
    ],
  };
}

function trimSeriesPointsForView(points: WeatherSeries["points"], view: WeatherDashboardView) {
  if (!points.length) {
    return points;
  }

  const latestTimestamp = points.at(-1)?.timestamp ?? 0;
  const windowMs =
    view === "current"
      ? 27 * 60 * 60 * 1000
      : view === "week"
        ? 7 * 24 * 60 * 60 * 1000
        : view === "month"
          ? 30 * 24 * 60 * 60 * 1000
          : 365 * 24 * 60 * 60 * 1000;
  const cutoff = latestTimestamp - windowMs;

  return points.filter((point) => point.timestamp >= cutoff);
}

function resolveAggregationConfig(seriesId: string, view: WeatherDashboardView) {
  if (view === "current") {
    if (seriesId === "rain" || seriesId === "lightning") {
      return { intervalMs: 60 * 60 * 1000, mode: "sum" as const };
    }

    return { intervalMs: 0, mode: "last" as const };
  }

  const defaultIntervalMs =
    view === "week"
      ? 60 * 60 * 1000
      : view === "month"
        ? 3 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

  if (seriesId === "rain" || seriesId === "lightning") {
    return {
      intervalMs:
        view === "week" || view === "month"
          ? 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000,
      mode: "sum" as const,
    };
  }

  if (seriesId === "gust") {
    return { intervalMs: defaultIntervalMs, mode: "max" as const };
  }

  if (seriesId === "windDirection") {
    return { intervalMs: defaultIntervalMs, mode: "vecdir" as const };
  }

  return { intervalMs: defaultIntervalMs, mode: "avg" as const };
}

function averageDegrees(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const vector = values.reduce(
    (accumulator, value) => {
      const radians = (value * Math.PI) / 180;
      return {
        x: accumulator.x + Math.cos(radians),
        y: accumulator.y + Math.sin(radians),
      };
    },
    { x: 0, y: 0 },
  );

  const angle = (Math.atan2(vector.y, vector.x) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function condenseSeriesPoints(points: WeatherSeries["points"], maxPoints: number) {
  if (points.length <= maxPoints) {
    return points;
  }

  const step = Math.ceil(points.length / maxPoints);
  const condensed = points.filter((_, index) => index % step === 0);
  const last = points.at(-1);

  if (last && condensed.at(-1)?.timestamp !== last.timestamp) {
    condensed.push(last);
  }

  return condensed;
}

function normalizeSeriesPointsForView(
  series: WeatherSeries,
  view: WeatherDashboardView,
) {
  const trimmedPoints = trimSeriesPointsForView(series.points, view);
  const { intervalMs, mode } = resolveAggregationConfig(series.id, view);
  const aggregated = aggregateSeriesPoints(
    trimmedPoints,
    intervalMs,
    mode,
  );
  const maxPoints =
    view === "current" ? 288 : view === "week" ? 700 : view === "month" ? 1000 : 800;

  return condenseSeriesPoints(aggregated, maxPoints);
}

function aggregateSeriesPoints(
  points: WeatherSeries["points"],
  intervalMs: number,
  mode: WeatherAggregationMode,
) {
  if (intervalMs <= 0 || points.length < 3) {
    return points;
  }

  const buckets = new Map<number, WeatherSeries["points"]>();

  for (const point of points) {
    const bucketStart = Math.floor(point.timestamp / intervalMs) * intervalMs;
    const bucket = buckets.get(bucketStart) ?? [];
    bucket.push(point);
    buckets.set(bucketStart, bucket);
  }

  return [...buckets.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([, bucket]) => {
      const lastPoint = bucket.at(-1) ?? bucket[0]!;
      const value =
        mode === "max"
          ? Math.max(...bucket.map((point) => point.value))
          : mode === "min"
            ? Math.min(...bucket.map((point) => point.value))
            : mode === "sum"
              ? bucket.reduce((sum, point) => sum + point.value, 0)
              : mode === "vecdir"
                ? averageDegrees(bucket.map((point) => point.value))
          : mode === "last"
            ? lastPoint.value
            : bucket.reduce((sum, point) => sum + point.value, 0) / bucket.length;

      return {
        timestamp: lastPoint.timestamp,
        value,
        label: lastPoint.label,
      };
    });
}

function buildSeriesScale(seriesList: WeatherSeries[], panel: StationGraphPanel) {
  if (panel.fixedScale) {
    return buildConfiguredScale(seriesList, panel.fixedScale);
  }

  const values = seriesList.flatMap((series) => series.points.map((point) => point.value));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const seriesIds = new Set(seriesList.map((series) => series.id));
  const forceZero =
    [...seriesIds].every((id) =>
      ["humidity", "indoorHumidity", "wind", "gust", "uv", "solar", "rain", "rainRate", "lightning"].includes(id),
    ) || seriesIds.has("windDirection");
  const baseMin = seriesIds.has("windDirection") ? 0 : minValue;
  const baseMax = seriesIds.has("windDirection") ? 360 : maxValue;
  return buildNiceScale(baseMin, baseMax, 5, forceZero);
}

function buildConfiguredScale(
  seriesList: WeatherSeries[],
  config: { min: number; max: number; minInterval: number },
) {
  if (config.max > config.min) {
    const ticks: number[] = [];

    for (let value = config.min; value <= config.max + config.minInterval / 2; value += config.minInterval) {
      ticks.push(Number(value.toFixed(6)));
    }

    return { min: config.min, max: config.max, ticks };
  }

  const maxSeriesValue = Math.max(
    ...seriesList.flatMap((series) => series.points.map((point) => point.value)),
    0,
  );
  const max = Math.max(config.max > config.min ? config.max : maxSeriesValue, config.min + config.minInterval);
  const scale = buildNiceScale(config.min, max, 5, true);

  if (scale.ticks.length >= 2) {
    const currentInterval = scale.ticks[1] - scale.ticks[0];

    if (currentInterval >= config.minInterval) {
      return scale;
    }
  }

  const ticks: number[] = [];

  for (let value = scale.min; value <= scale.max + config.minInterval / 2; value += config.minInterval) {
    ticks.push(Number(value.toFixed(6)));
  }

  return { min: scale.min, max: scale.max, ticks };
}

function buildNiceScale(min: number, max: number, tickCount: number, forceZero = false) {
  let localMin = forceZero ? Math.min(0, min) : min;
  let localMax = max;

  if (localMin === localMax) {
    localMin -= 1;
    localMax += 1;
  }

  const range = niceNumber(localMax - localMin, false);
  const step = niceNumber(range / Math.max(tickCount - 1, 1), true);
  const scaleMin = Math.floor(localMin / step) * step;
  const scaleMax = Math.ceil(localMax / step) * step;
  const ticks: number[] = [];

  for (let value = scaleMin; value <= scaleMax + step / 2; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }

  return {
    min: scaleMin,
    max: scaleMax,
    ticks,
  };
}

function niceNumber(value: number, round: boolean) {
  const exponent = Math.floor(Math.log10(Math.abs(value || 1)));
  const fraction = value / 10 ** exponent;
  let niceFraction = 1;

  if (round) {
    if (fraction < 1.5) {
      niceFraction = 1;
    } else if (fraction < 3) {
      niceFraction = 2;
    } else if (fraction < 7) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }
  } else if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  return niceFraction * 10 ** exponent;
}

function projectX(timestamp: number, min: number, max: number, left: number, width: number) {
  const span = Math.max(max - min, 1);
  return left + ((timestamp - min) / span) * width;
}

function projectY(value: number, min: number, max: number, top: number, height: number) {
  const span = Math.max(max - min, 1);
  return top + (1 - (value - min) / span) * height;
}

function buildTimeTicks(
  startMs: number,
  endMs: number,
  view: WeatherDashboardView,
) {
  if (view === "year") {
    return buildMonthlyTicks(startMs, endMs);
  }

  const intervalMs =
    view === "current"
      ? 3 * 60 * 60 * 1000
      : view === "week"
        ? 24 * 60 * 60 * 1000
        : 5 * 24 * 60 * 60 * 1000;
  const firstTick = Math.floor(startMs / intervalMs) * intervalMs;
  const ticks: Array<{ timestamp: number; label: string }> = [];

  for (let timestamp = firstTick; timestamp <= endMs + intervalMs; timestamp += intervalMs) {
    if (timestamp < startMs - intervalMs * 0.25) {
      continue;
    }

    ticks.push({
      timestamp,
      label: formatGraphTimeLabel(timestamp, view),
    });
  }

  return ticks;
}

function buildMonthlyTicks(startMs: number, endMs: number) {
  const ticks: Array<{ timestamp: number; label: string }> = [];
  const start = new Date(startMs);
  const end = new Date(endMs);
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 0, 0, 0, 0));

  while (cursor.getTime() <= endMs + 31 * 24 * 60 * 60 * 1000) {
    const timestamp = cursor.getTime();

    if (timestamp >= startMs - 31 * 24 * 60 * 60 * 1000) {
      ticks.push({
        timestamp,
        label: formatGraphTimeLabel(timestamp, "year"),
      });
    }

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return ticks.filter((tick) => tick.timestamp <= end.getTime() + 31 * 24 * 60 * 60 * 1000);
}

function formatGraphTimeLabel(value: number, view: WeatherDashboardView) {
  if (view === "current") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  if (view === "week") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      day: "numeric",
    }).format(new Date(value));
  }

  if (view === "month") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      month: "numeric",
      day: "numeric",
    }).format(new Date(value));
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "2-digit",
  }).format(new Date(value));
}

function pickDotStride(seriesList: WeatherSeries[]) {
  const maxPoints = Math.max(...seriesList.map((series) => series.points.length));

  if (maxPoints <= 240) {
    return 1;
  }

  if (maxPoints <= 720) {
    return 2;
  }

  if (maxPoints <= 1440) {
    return 4;
  }

  return 8;
}

function formatTickValue(value: number, decimals: number) {
  return formatCompact(value, Math.min(decimals, 3));
}

function pickSeriesAccent(seriesId: string) {
  if (seriesId === "temperature" || seriesId === "indoorTemperature") {
    return "var(--weather-series-temperature)";
  }

  if (seriesId === "yearHigh") {
    return "var(--weather-series-year-high)";
  }

  if (seriesId === "yearLow") {
    return "var(--weather-series-year-low)";
  }

  if (seriesId === "dewpoint") {
    return "var(--weather-series-dewpoint)";
  }

  if (seriesId === "humidity" || seriesId === "indoorHumidity") {
    return "var(--weather-series-humidity)";
  }

  if (seriesId === "wind" || seriesId === "gust") {
    return "var(--weather-series-wind)";
  }

  if (seriesId === "windDirection") {
    return "var(--weather-series-wind-direction)";
  }

  if (seriesId === "pressure") {
    return "var(--weather-series-pressure)";
  }

  if (seriesId === "uv" || seriesId === "solar" || seriesId === "brightness") {
    return "var(--weather-series-solar)";
  }

  if (seriesId === "rain" || seriesId === "rainRate") {
    return "var(--weather-series-rain)";
  }

  return "var(--weather-series-default)";
}

function getWeatherCalendarParts(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return { year, month, day };
}

function formatWeatherDayLabel(month: number, day: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(2026, month - 1, day, 12, 0, 0, 0));
}
