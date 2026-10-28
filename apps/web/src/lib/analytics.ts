// Only public browsing belongs in the Monosyth stream. Other sites have their
// own properties; signed-in tools, wedding pages and order links stay private.
export function isPublicAnalyticsPath(pathname: string): boolean {
  return pathname === "/" ||
    pathname === "/weather" ||
    pathname === "/weather/birds" ||
    pathname.startsWith("/weather/birds/") ||
    pathname === "/shop" ||
    /^\/shop\/(?!order(?:$|\/)|checkout(?:$|\/)|cart(?:$|\/))[^/]+$/.test(pathname);
}

export function analyticsReferrer(value: string): string {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return "";
    if (["monosyth.com", "www.monosyth.com"].includes(url.hostname) &&
      !isPublicAnalyticsPath(url.pathname)) return "";
    return url.origin + url.pathname;
  } catch {
    return "";
  }
}
