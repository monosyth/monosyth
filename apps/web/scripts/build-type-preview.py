"""Build the limited public web demo. Requires fontTools[woff]. Paid kits stay private."""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / "public/shop/type/EverydayCarved-Demo.woff2"
font = TTFont(source)
options = subset.Options()
options.layout_features = ["kern", "tnum"]
options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13]
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=range(0x20, 0x7f))
subsetter.subset(font)
for entry in font["name"].names:
    value = {1: "Everyday Carved Demo", 2: "Bold", 3: "MonosythType:EverydayCarvedDemo:1.400", 4: "Everyday Carved Demo Bold", 6: "EverydayCarvedDemo-Bold", 13: "Limited web preview for the Monosyth Type storefront. No license to install or use in other projects."}.get(entry.nameID)
    if value is not None:
        entry.string = value.encode(entry.getEncoding())
font.flavor = "woff2"
font.save(target)
check = TTFont(target)
assert set(check.getBestCmap()) == set(range(0x20, 0x7f))
print(f"Public demo: {len(check.getBestCmap())} encoded characters; {target.stat().st_size} bytes")
