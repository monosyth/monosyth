# MoveMorrow city suggestions

The setup form searches a self-hosted snapshot of the GeoNames `cities500` database in both city fields. It includes U.S. cities and towns (country code `US`) with population over 500, plus administrative seats covered by the source. It is not a complete list of every settlement. Free text and blank cities remain valid; selected labels fit the existing 100-character setup fields. Existing plans and stored city strings need no migration.

## Source and attribution

- Data: [GeoNames](https://www.geonames.org/), [official downloadable exports](https://download.geonames.org/export/dump/).
- License: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
- Derived from `cities500.zip`, `admin1CodesASCII.txt`. The form credits GeoNames and links the license.
- Transformations: combine city and state labels; normalize primary and ASCII city names for search; add U.S. country codes and state abbreviations; sort by population; partition into two-character prefix files. Coordinates, alternate-name lists, and personal information are not included. Exceptionally long labels use country codes; names that cannot fit are omitted.
- Snapshot date, counts, and input SHA-256 hashes: `apps/web/public/move/cities/source.json`. Initial snapshot: September 16, 2026, 21,785 places and 267 files, about 1.8 MB total. Only a matching prefix file is downloaded as needed, never the entire catalog.

## Behavior and privacy

Suggestions begin at two characters, after a short typing delay. Both fields reuse a bounded in-memory cache of 16 downloaded prefix files. Queries match primary/ASCII names without accents and may include region or country qualifiers. Exact city names rank ahead of prefix matches; population breaks ties. Results have distinct city/state labels and are capped at eight. Identical labels collapse.

Arrow keys navigate; Enter selects an active suggestion; Escape dismisses; Tab leaves the field without changing its text. Picking a city does not submit the form. Loading, missing matches, and network failures preserve typed input and allow manual entry. Async results are tied to their prefix so responses from an earlier query cannot replace the current suggestions.

Data files are served by Monosyth's existing Firebase hosting. No search text is sent to GeoNames or a third-party lookup API. Normal Monosyth hosting logs may contain the requested two-character prefix encoded in a file path. No API key, new database account, browser location permission, or subscription is required.

## Refresh

Download these two files to a temporary directory from the official HTTPS export location, then run from the repository root:

```sh
python3 apps/web/scripts/build-city-index.py /path/to/geonames-downloads
```

The script regenerates only its city-prefix files and source manifest. Review count/size changes, run the city audit and MoveMorrow audit, and deploy through the repository's normal Firebase flow. Updates are deliberate snapshots; there is no automatic daily sync.

```sh
cd apps/web
node --import tsx --test scripts/audit-move-cities.ts
npm run audit:move
```
