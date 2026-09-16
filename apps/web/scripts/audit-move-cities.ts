import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { cityShardKey, normalizeCityQuery, searchCities, type CityRow } from "../src/lib/move/cities";

const root = join(process.cwd(), "public/move/cities");
function search(query: string) {
  const key = cityShardKey(query);
  return key ? searchCities(JSON.parse(readFileSync(join(root, `${key}.json`), "utf8")), query) : [];
}
test("city suggestions distinguish same-name places and accept regional abbreviations", () => {
  assert.equal(search("sea")[0].label, "Seattle, Washington");
  assert.equal(search("Seattle WA")[0].label, "Seattle, Washington");
  assert.equal(search("shoreline")[0].label, "Shoreline, Washington");
  const vancouver = search("Vancouver").map((city) => city.label);
  assert.ok(vancouver.every((label) => !label.includes("Canada")));
  assert.ok(vancouver.includes("Vancouver, Washington"));
  assert.deepEqual(search("Vancouver BC"), []);
  assert.equal(search("Paris TX")[0].label, "Paris, Texas");
  assert.deepEqual(search("Paris France"), []);
});
test("city search handles diacritics, casing, punctuation, partial and empty input", () => {
  assert.equal(cityShardKey(" SÃO"), cityShardKey("sao"));
  assert.equal(normalizeCityQuery("  Seattle, WA "), "seattle wa");
  assert.deepEqual(search("San José"), search("San Jose"));
  assert.equal(search("San José CA")[0].label, "San Jose, California");
  assert.ok(search("san fr")[0].label.startsWith("San Francisco,"));
  assert.equal(cityShardKey("s"), null);
  assert.equal(cityShardKey("  "), null);
  assert.equal(cityShardKey("../"), null);
  assert.deepEqual(searchCities([], "A missing town"), []);
  assert.equal(searchCities([[1, "Custom", ["custom"], "country"]], "c").length, 0);
});
test("exact city names precede prefix matches and indistinguishable labels collapse", () => {
  const rows: CityRow[] = [
    [1, "Parisville, France", ["parisville"], "france fr"],
    [2, "Paris, France", ["paris"], "france fr"],
    [3, "Paris, France", ["paris"], "france fr"],
  ];
  assert.deepEqual(searchCities(rows, "Paris").map((city) => city.id), [2, 1]);
});
test("generated city shards have portable paths, unique IDs, normalized search, and saveable labels", () => {
  let records = 0;
  for (const file of readdirSync(root).filter((name) => name !== "source.json")) {
    assert.match(file, /^[0-9a-f]+-[0-9a-f]+\.json$/);
    const rows = JSON.parse(readFileSync(join(root, file), "utf8")) as CityRow[];
    const ids = new Set<number>();
    for (const [id, label, names, context] of rows) {
      assert.ok(Number.isInteger(id) && !ids.has(id));
      ids.add(id);
      assert.ok(label.length > 0 && label.length <= 100);
      assert.ok(names.some((name) => cityShardKey(name) === file.slice(0, -5)));
      for (const name of names) assert.equal(normalizeCityQuery(name), name);
      assert.equal(normalizeCityQuery(context), context);
      assert.ok(context.includes("united states us usa"));
      records++;
    }
  }
  assert.ok(records > 20000);
});
