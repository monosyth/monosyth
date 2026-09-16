"""Build the self-hosted GeoNames city index from official downloaded exports.

python3 scripts/build-city-index.py /path/to/geonames-downloads
Inputs: cities500.zip, admin1CodesASCII.txt. Only country code US is included.
See docs/movemorrow-city-data.md for sources, license, and refresh instructions.
"""
import hashlib
import json
import re
import sys
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile

source = Path(sys.argv[1])
output = Path(__file__).resolve().parents[1] / 'public' / 'move' / 'cities'
output.mkdir(parents=True, exist_ok=True)


def normalize(value):
    value = ''.join(c for c in unicodedata.normalize('NFKD', value.lower())
                    if not unicodedata.category(c).startswith('M'))
    return re.sub(r'[^\w]+', ' ', value.replace('_', ' ')).strip()


def key(value):
    # Hex names keep paths portable, including non-Latin city names.
    return '-'.join(format(ord(c), 'x') for c in value[:2])


regions = {}
for line in (source / 'admin1CodesASCII.txt').read_text().splitlines():
    fields = line.split('\t')
    regions[fields[0]] = fields[1]
shards = defaultdict(list)
count = 0
with ZipFile(source / 'cities500.zip') as archive:
    for line in archive.read('cities500.txt').decode().splitlines():
        f = line.split('\t')
        if f[8] != 'US':
            continue
        region = regions.get(f'{f[8]}.{f[10]}', '')
        label = ', '.join(dict.fromkeys(p for p in [f[1], region] if p))
        # Saved setup fields allow 100 characters; use a shorter country code
        # for exceptionally long names, retaining the full context for search.
        if len(label.encode('utf-16-le')) // 2 > 100:
            label = ', '.join([f[1], f[8]])
        if len(label.encode('utf-16-le')) // 2 > 100:
            continue
        names = sorted(set(normalize(name) for name in f[1:3] if name))
        context = normalize(' '.join([region, 'United States US USA', f[10]]))
        row = [int(f[0]), label, names, context]
        for prefix in set(key(name) for name in names if len(name) >= 2):
            shards[prefix].append((int(f[14] or 0), row))
        count += 1
# Only remove generated shard files, never unrelated public assets.
for old in output.glob('*.json'):
    if re.fullmatch(r'[0-9a-f]+-[0-9a-f]+\.json', old.name):
        old.unlink()
for prefix, rows in sorted(shards.items()):
    rows.sort(key=lambda entry: (-entry[0], entry[1][0]))
    (output / f'{prefix}.json').write_text(
        json.dumps([row for _, row in rows], ensure_ascii=False, separators=(',', ':')) + '\n')
manifest = {
    'source': 'GeoNames cities500',
    'countryFilter': 'US',
    'sourceUrl': 'https://download.geonames.org/export/dump/',
    'license': 'CC BY 4.0',
    'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/',
    'generatedAt': datetime.now(timezone.utc).isoformat(),
    'cities': count,
    'shards': len(shards),
    'sha256': {name: hashlib.sha256((source / name).read_bytes()).hexdigest()
               for name in ['cities500.zip', 'admin1CodesASCII.txt']},
}
(output / 'source.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
print('Total bytes:', sum(f.stat().st_size for f in output.glob('*.json')))
