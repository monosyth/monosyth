export type WeatherStationSummary = {
  name: string;
  location: string;
  macAddress: string;
  lastObservationAt: string;
  latitude: number | null;
  longitude: number | null;
};

export type WeatherMetric = {
  id: string;
  label: string;
  displayValue: string;
  value: number;
  unit: string;
};

export type WeatherHighlight = {
  label: string;
  value: string;
};

export type WeatherSeriesPoint = {
  timestamp: number;
  value: number;
  label: string;
};

export type WeatherSeries = {
  id: string;
  label: string;
  unit: string;
  decimals: number;
  min: number;
  max: number;
  points: WeatherSeriesPoint[];
};

export type WeatherSnapshotItem = {
  key: string;
  value: string;
};

export type WeatherForecastPeriod = {
  startTime: string;
  endTime: string;
  temperature: number | null;
  temperatureUnit: string;
  shortForecast: string;
  detailedForecast: string;
  windSpeed: string;
  windDirection: string;
  isDaytime: boolean;
};

export type WeatherOverview = {
  fetchedAt: string;
  observationCount: number;
  station: WeatherStationSummary;
  metrics: WeatherMetric[];
  highlights: WeatherHighlight[];
  series: WeatherSeries[];
  snapshot: WeatherSnapshotItem[];
  forecast: WeatherForecastPeriod[];
};

export type WeatherPageData =
  | {
      state: "ready";
      data: WeatherOverview;
      notice?: string;
    }
  | {
      state: "missing-config";
      missing: string[];
      message: string;
    }
  | {
      state: "error";
      message: string;
    };
