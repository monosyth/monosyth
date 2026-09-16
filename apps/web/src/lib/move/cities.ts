/** Compact rows generated from GeoNames; kept out of the application bundle. */
export type CityRow = [id: number, label: string, names: string[], context: string];
export type CitySuggestion = { id: number; label: string };

export function normalizeCityQuery(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function cityShardKey(query: string): string | null {
  const characters = Array.from(normalizeCityQuery(query));
  if (characters.length < 2) return null;
  return characters.slice(0, 2).map((c) => c.codePointAt(0)!.toString(16)).join("-");
}

export function searchCities(rows: CityRow[], query: string): CitySuggestion[] {
  const normalized = normalizeCityQuery(query);
  if (!cityShardKey(normalized)) return [];
  const tokens = normalized.split(" ");
  const exact: CityRow[] = [];
  const partial: CityRow[] = [];
  for (const row of rows) {
    let rank = 2;
    const context = row[3].split(" ");
    for (const name of row[2]) {
      const words = name.split(" ");
      for (let n = Math.min(tokens.length, words.length); n > 0; n--) {
        if (tokens.slice(0, n).every((token, i) => words[i].startsWith(token)) &&
            tokens.slice(n).every((token) => context.some((word) => word.startsWith(token)))) {
          rank = Math.min(rank, tokens.slice(0, n).join(" ") === name ? 0 : 1);
        }
      }
    }
    if (rank === 0) exact.push(row);
    if (rank === 1) partial.push(row);
  }
  // Shards are population-ranked. Prefer an exact city name before larger
  // prefix matches and collapse indistinguishable city/state labels.
  const seen = new Set<string>();
  return [...exact, ...partial].filter((row) => {
    if (seen.has(row[1])) return false;
    seen.add(row[1]);
    return true;
  }).slice(0, 8).map(([id, label]) => ({ id, label }));
}
