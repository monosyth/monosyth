type WeatherPendingOverlayProps = {
  title: string;
  detail: string;
};

export function WeatherPendingOverlay({ title }: WeatherPendingOverlayProps) {
  return <span className="sr-only" role="status" aria-live="polite">{title}</span>;
}
