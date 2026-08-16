import assert from "node:assert/strict";

import { auditBlockLibrary } from "../src/lib/quilting/block-geometry";
import { QUILT_BLOCKS } from "../src/lib/quilting/data";
import { fabricOutcomePlan, squareSubcutPlan, stripSetOutcomePlan, unitProjectPlan } from "../src/lib/quilting/math";
import { getRulerProfile, rulerCutPlan } from "../src/lib/quilting/rulers";

const audits = auditBlockLibrary(QUILT_BLOCKS);
const failures = audits.filter((audit) => audit.status === "fail");
const coverage = Object.groupBy(audits, (audit) => audit.coverage);

console.log(`Quilt geometry audit: ${audits.length - failures.length}/${audits.length} blocks passed.`);
Object.entries(coverage).forEach(([level, records]) => {
  console.log(`- ${level}: ${records?.length ?? 0}`);
});

if (failures.length) {
  failures.forEach((failure) => {
    console.error(`\n${failure.name}`);
    failure.errors.forEach((error) => console.error(`  - ${error}`));
  });
  process.exitCode = 1;
}

const charmEight = fabricOutcomePlan({ startSize: 5, startCount: 18, method: "hst-eight", easyIncrement: 0.5 });
assert.equal(charmEight.practicalFinished, 1.5, "Two 5-inch charms should make trim-friendly 1.5-inch-finished Magic 8 HSTs.");
assert.equal(charmEight.totalUnits, 72, "Eighteen charms should make nine Magic 8 batches / 72 HSTs.");

const nineCharmBlocks = unitProjectPlan({
  unitFinished: charmEight.practicalFinished,
  availableUnits: charmEight.totalUnits,
  yieldPerBatch: charmEight.yieldPerBatch,
  piecesPerBatch: charmEight.piecesPerBatch,
  unitRowsPerBlock: 3,
  unitColumnsPerBlock: 3,
  plainCellsPerBlock: 1,
  blockRows: 3,
  blockColumns: 3,
});
assert.equal(nineCharmBlocks.requiredUnits, 72);
assert.equal(nineCharmBlocks.requiredStartingPieces, 18);
assert.equal(nineCharmBlocks.blockFinishedWidth, 4.5);
assert.equal(nineCharmBlocks.projectFinishedWidth, 13.5);
assert.equal(nineCharmBlocks.projectFinishedHeight, 13.5);

const rectangularEight = unitProjectPlan({
  unitFinished: charmEight.practicalFinished,
  availableUnits: charmEight.totalUnits,
  yieldPerBatch: charmEight.yieldPerBatch,
  piecesPerBatch: charmEight.piecesPerBatch,
  unitRowsPerBlock: 2,
  unitColumnsPerBlock: 4,
  plainCellsPerBlock: 0,
  blockRows: 3,
  blockColumns: 3,
});
assert.equal(rectangularEight.blockFinishedWidth, 6);
assert.equal(rectangularEight.blockFinishedHeight, 3);
assert.equal(rectangularEight.projectFinishedWidth, 18);
assert.equal(rectangularEight.projectFinishedHeight, 9);

assert.equal(squareSubcutPlan({ parentSize: 10, parentCount: 1, subcutSize: 2.5 }).totalPieces, 16);
const threeRailStripSet = stripSetOutcomePlan({ stripWidth: 2.5, usableLength: 40, stripCount: 3 });
assert.equal(threeRailStripSet.rawSetWidth, 6.5);
assert.equal(threeRailStripSet.squareSubcuts, 6);

console.log("Fabric-first checks: charm Magic 8, nested block layouts, square subcuts, and strip sets passed.");

const mini = getRulerProfile("stripology-mini");
const miniJellyStrips = rulerCutPlan({ ruler: mini, pieceWidth: 2.5, quantity: 16 });
assert.equal(miniJellyStrips.directSlots, true);
assert.equal(miniJellyStrips.piecesPerSetup, 2);
assert.equal(miniJellyStrips.setups, 8);
assert.deepEqual(miniJellyStrips.slots, [0, 2.5, 5]);

const miniQuarterOffset = rulerCutPlan({ ruler: mini, pieceWidth: 2.25, quantity: 16 });
assert.equal(miniQuarterOffset.directSlots, false);
assert.equal(miniQuarterOffset.supportedOffset, true);
assert.equal(miniQuarterOffset.piecesPerSetup, 1);
assert.equal(miniQuarterOffset.setups, 16);

const quartersMini = getRulerProfile("stripology-quarters-mini");
const quartersDirect = rulerCutPlan({ ruler: quartersMini, pieceWidth: 2.25, quantity: 16 });
assert.equal(quartersDirect.directSlots, true);
assert.equal(quartersDirect.piecesPerSetup, 2);
assert.deepEqual(quartersDirect.slots, [0, 2.25, 4.5]);

const fiskars = getRulerProfile("fiskars-624");
assert.equal(rulerCutPlan({ ruler: fiskars, pieceWidth: 6.5, quantity: 1 }).valid, false);
assert.equal(rulerCutPlan({ ruler: fiskars, pieceWidth: 5, quantity: 4 }).standard, true);

console.log("Ruler-profile checks: Mini direct slots, offset cuts, Quarters Mini, and long-ruler reach passed.");
