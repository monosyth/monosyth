"""Build a limited public web demo. Requires fontTools[woff]. Paid kits stay private.

Everyday Carved:  build-type-preview.py <EverydayCarved-Bold.woff2>
Other families:   build-type-preview.py <source> <public target> <demo family> <style> <version>
"""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

public = Path(__file__).resolve().parents[1] / "public"
if len(sys.argv) == 2:
    source, target, family, style, version = Path(sys.argv[1]), public / "shop/type/v1.600/EverydayCarved-Demo.woff2", "Everyday Carved Demo", "Bold", "1.600"
else:
    source, target, family, style, version = Path(sys.argv[1]), public / sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
postscript = f"{family.replace(' ', '')}-{style.replace(' ', '')}"
font = TTFont(source)
options = subset.Options()
options.layout_features = ["kern", "tnum"]
options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13]
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=range(0x20, 0x7f))
subsetter.subset(font)
for entry in font["name"].names:
    value = {1: family, 2: style, 3: f"MonosythType:{postscript}:{version}", 4: f"{family} {style}", 6: postscript, 13: "Limited web preview for the Monosyth Type storefront. No license to install or use in other projects."}.get(entry.nameID)
    if value is not None:
        entry.string = value.encode(entry.getEncoding())
font.flavor = "woff2"
target.parent.mkdir(parents=True, exist_ok=True)
font.save(target)
check = TTFont(target)
assert set(check.getBestCmap()) == set(range(0x20, 0x7f))
assert all("Demo" in check["name"].getDebugName(n) for n in (1, 4, 6))
print(f"Public demo {target.name}: {len(check.getBestCmap())} encoded characters; {target.stat().st_size} bytes")
