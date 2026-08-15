import { auditBlockLibrary } from "../src/lib/quilting/block-geometry";
import { QUILT_BLOCKS } from "../src/lib/quilting/data";

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
