import styles from "./quilt-guide.module.css";

type Stage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const PATCHES = [
  "#c23e31", "#167471", "#e3a52e", "#725b99", "#233451",
  "#167471", "#f3e5c8", "#c23e31", "#233451", "#e3a52e",
  "#e3a52e", "#c23e31", "#167471", "#f3e5c8", "#725b99",
  "#725b99", "#233451", "#e3a52e", "#167471", "#c23e31",
] as const;

function PatchGrid({ x = 24, y = 17, cell = 33, gap = 2 }: { x?: number; y?: number; cell?: number; gap?: number }) {
  return (
    <g>
      {PATCHES.map((fill, index) => {
        const column = index % 5;
        const row = Math.floor(index / 5);
        return <rect key={`${fill}-${index}`} x={x + column * cell} y={y + row * cell} width={cell - gap} height={cell - gap} rx="1.5" fill={fill} />;
      })}
    </g>
  );
}

export function FusibleGridStepDiagram({ stage }: { stage: Stage }) {
  const label = [
    "Match the cut square size to the grid spacing",
    "Arrange cut fabric squares on the fusible grid",
    "Fuse by lifting and setting down the iron",
    "Fold and sew every seam in the first direction",
    "Clip intersections and press adjacent seam allowances in opposite directions",
    "Fold, nest, and sew every seam in the second direction",
    "Press and measure the completed patchwork panel",
  ][stage - 1];

  return (
    <svg className={styles.stepSvg} viewBox="0 0 220 175" role="img" aria-label={label}>
      <rect x="1" y="1" width="218" height="173" rx="9" fill="#fffaf0" stroke="rgba(48,43,40,.28)" />
      {stage === 1 ? (
        <>
          <rect x="62" y="24" width="96" height="96" fill="#d7e4df" stroke="#0d5553" strokeWidth="2" strokeDasharray="6 4" />
          <rect x="70" y="32" width="80" height="80" fill="#c23e31" stroke="#302b28" strokeWidth="2" />
          <path d="M70 15h80M70 10v10M150 10v10M51 32v80M46 32h10M46 112h10" stroke="#302b28" strokeWidth="2" />
          <text x="110" y="142" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="800" fill="#302b28">CUT SQUARE = GRID SPACE</text>
          <text x="110" y="161" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#0d5553">READ THE PRODUCT SIZE</text>
        </>
      ) : null}
      {stage === 2 ? (
        <>
          <rect x="17" y="10" width="181" height="148" fill="#d7e4df" stroke="#0d5553" strokeWidth="2" strokeDasharray="5 4" />
          <PatchGrid />
          <text x="110" y="169" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#302b28">RIGHT SIDES UP · ROUGH SIDE BELOW</text>
        </>
      ) : null}
      {stage === 3 ? (
        <>
          <g opacity=".94"><PatchGrid x={31} y={35} cell={31} /></g>
          <path d="M62 14h92l-10 34H72z" fill="#d9dde0" stroke="#302b28" strokeWidth="2" />
          <path d="M77 14V6h62v8" fill="none" stroke="#302b28" strokeWidth="5" strokeLinecap="round" />
          <path d="M57 30h102" stroke="#c23e31" strokeWidth="3" strokeDasharray="6 4" />
          <path d="M40 158v-13m38 13v-13m38 13v-13m38 13v-13" stroke="#0d5553" strokeWidth="2.5" />
          <text x="110" y="169" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#302b28">PRESS · LIFT · MOVE · PRESS</text>
        </>
      ) : null}
      {stage === 4 ? (
        <>
          <PatchGrid x={25} y={19} cell={34} gap={1} />
          {[59, 93, 127, 161].map((x) => <path key={x} d={`M${x} 16v139`} stroke="#fff" strokeWidth="5" />)}
          {[59, 93, 127, 161].map((x) => <path key={`seam-${x}`} d={`M${x} 16v139`} stroke="#233451" strokeWidth="2" strokeDasharray="5 4" />)}
          <path d="M35 160h150" stroke="#302b28" strokeWidth="2" markerEnd="url(#grid-arrow)" />
          <defs><marker id="grid-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0l10 5-10 5z" fill="#302b28" /></marker></defs>
          <text x="110" y="171" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#302b28">SEW EVERY VERTICAL FOLD</text>
        </>
      ) : null}
      {stage === 5 ? (
        <>
          <path d="M24 88h172M110 18v140" stroke="#233451" strokeWidth="16" />
          <path d="M24 88h172M110 18v140" stroke="#fffaf0" strokeWidth="10" />
          <path d="M24 88h172M110 18v140" stroke="#c23e31" strokeWidth="2.5" />
          <path d="M82 59l25 25M138 59l-25 25" stroke="#0d5553" strokeWidth="5" strokeLinecap="round" />
          <circle cx="80" cy="57" r="8" fill="none" stroke="#0d5553" strokeWidth="4" />
          <circle cx="140" cy="57" r="8" fill="none" stroke="#0d5553" strokeWidth="4" />
          <path d="M110 65v18" stroke="#e3a52e" strokeWidth="6" strokeLinecap="round" />
          <path d="M32 125h55m0 0-11-8m11 8-11 8M188 125h-55m0 0 11-8m-11 8 11 8" fill="none" stroke="#c23e31" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="110" y="169" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#302b28">CLIP TO SEAM · ALTERNATE PRESS</text>
        </>
      ) : null}
      {stage === 6 ? (
        <>
          <PatchGrid x={25} y={19} cell={34} gap={1} />
          {[53, 87, 121].map((y) => <path key={y} d={`M22 ${y}h176`} stroke="#fff" strokeWidth="5" />)}
          {[53, 87, 121].map((y) => <path key={`seam-${y}`} d={`M22 ${y}h176`} stroke="#233451" strokeWidth="2" strokeDasharray="5 4" />)}
          <path d="M207 29v118" stroke="#302b28" strokeWidth="2" markerEnd="url(#grid-arrow-2)" />
          <defs><marker id="grid-arrow-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0l10 5-10 5z" fill="#302b28" /></marker></defs>
          <text x="110" y="169" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#302b28">SEW EVERY HORIZONTAL FOLD</text>
        </>
      ) : null}
      {stage === 7 ? (
        <>
          <g transform="translate(27 20)">
            <PatchGrid x={0} y={0} cell={32} gap={2} />
            <rect x="0" y="0" width="160" height="128" fill="none" stroke="#302b28" strokeWidth="3" />
          </g>
          <path d="M27 157h160M27 151v12M187 151v12" stroke="#0d5553" strokeWidth="2.5" />
          <text x="107" y="171" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#302b28">PRESS FLAT · MEASURE RAW SIZE</text>
        </>
      ) : null}
    </svg>
  );
}
