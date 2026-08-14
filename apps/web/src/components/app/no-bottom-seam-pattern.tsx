import styles from "@/app/app/boxy-bag/boxy-bag.module.css";

type PatternProps = {
  finishedLength: string;
  panelLength: string;
  panelWidth: string;
  cornerCut: string;
  finishedDepth: string;
  finishedHeight: string;
  seamAllowance: string;
};

function RectanglePiece({ layer, panelLength, panelWidth }: {
  layer: "Outer" | "Lining";
  panelLength: string;
  panelWidth: string;
}) {
  const outer = layer === "Outer";
  return (
    <article className={`${styles.panelPiece} ${outer ? styles.outerPiece : styles.liningPiece}`}>
      <header><span>{layer}</span><strong>Cut 1 rectangle</strong></header>
      <svg viewBox="0 0 360 210" role="img" aria-label={`${layer} rectangle ${panelLength} by ${panelWidth}; leave all four corners uncut`}>
        <defs>
          <pattern id={`rectangle-grid-${layer}`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke={outer ? "#a78bfa" : "#4de1ff"} strokeOpacity=".12" /></pattern>
        </defs>
        <rect x="55" y="22" width="250" height="160" rx="3" fill={outer ? "#302052" : "#12364b"} stroke={outer ? "#a78bfa" : "#4de1ff"} strokeWidth="2.5" />
        <rect x="55" y="22" width="250" height="160" fill={`url(#rectangle-grid-${layer})`} />
        <path d="M55 22h250M55 182h250" stroke="#ffd75e" strokeWidth="6" />
        <text x="180" y="91" textAnchor="middle" fill="#f6f2ff" fontSize="18" fontWeight="700">{layer.toUpperCase()} · CUT 1</text>
        <text x="180" y="116" textAnchor="middle" fill={outer ? "#cabaff" : "#a7efff"} fontFamily="var(--font-ibm-plex-mono)" fontSize="11">FULL RECTANGLE</text>
        <text x="180" y="138" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">DO NOT CUT CORNERS YET</text>
        <text x="180" y="17" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="9">SHORT ZIPPER EDGE</text>
        <text x="180" y="199" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="9">OPPOSITE SHORT ZIPPER EDGE</text>
      </svg>
      <p><strong>{panelLength} × {panelWidth}</strong><span>short zipper edge × long wrap edge</span></p>
    </article>
  );
}

export function NoBottomSeamPattern({
  finishedLength,
  panelLength,
  panelWidth,
  cornerCut,
  finishedDepth,
  finishedHeight,
  seamAllowance,
}: PatternProps) {
  return (
    <figure className={styles.patternFigure}>
      <div className={styles.figureTitle}>
        <div><span>Full illustrated pattern</span><strong>One outer + one lining · corners cut only after assembly</strong></div>
        <span className={styles.figureScale}>diagram · not to scale</span>
      </div>
      <div className={styles.diagramLegend} aria-label="Diagram color key">
        <span><i className={styles.legendCut} /> pink = cut later</span>
        <span><i className={styles.legendSew} /> yellow = sew / zipper</span>
        <span><i className={styles.legendSeam} /> cyan = lining</span>
      </div>

      <div className={styles.methodCompare} aria-label="Construction method comparison">
        <article>
          <span>Not this pattern</span>
          <strong>Four separate panels or a bottom seam</strong>
          <p>Those methods create a different layout and different corner-cut sequence.</p>
        </article>
        <b aria-hidden="true">→</b>
        <article className={styles.methodSelected}>
          <span>This pattern</span>
          <strong>One-piece wrap + zipper-side turning gap</strong>
          <p>The zipper sits across the center of the flat unit; the outer and lining are folded on opposite sides.</p>
        </article>
      </div>

      <section className={styles.allPanelsSection}>
        <div className={styles.sectionHeading}>
          <span>Step 1</span>
          <div><strong>Cut the beginning pieces</strong><small>Both fabric pieces stay rectangular. The acrylic tool is not used yet.</small></div>
        </div>
        <div className={styles.panelSet}>
          <RectanglePiece layer="Outer" panelLength={panelLength} panelWidth={panelWidth} />
          <RectanglePiece layer="Lining" panelLength={panelLength} panelWidth={panelWidth} />
        </div>
        <div className={styles.interfacingStrip}>
          <span>Also cut</span>
          <strong>1 interfacing rectangle + 2 zipper-tab squares</strong>
          <p>Fuse the interfacing to the outer wrong side. Cut two 2½″ / 6 cm squares for the folded zipper tabs.</p>
        </div>
      </section>

      <section className={styles.zipperSection}>
        <div className={styles.sectionHeading}>
          <span>Step 2</span>
          <div><strong>Sew the first zipper sandwich</strong><small>Use one matching short edge from each rectangle.</small></div>
        </div>
        <div className={styles.zipperSteps}>
          <article>
            <div className={styles.miniStep}><span>A</span><strong>Stack the three layers</strong></div>
            <div className={styles.layerStack} aria-label="First zipper sandwich from top to bottom">
              <div className={styles.liningLayer}><b>TOP · LINING</b><small>right side down · wrong side visible</small></div>
              <div className={styles.zipperLayer}><b>ZIPPER</b><small>right side down · teeth face the outer</small></div>
              <div className={styles.outerLayer}><b>BOTTOM · OUTER</b><small>right side up</small></div>
            </div>
            <p>Align one short raw edge of all three layers and sew {seamAllowance} from the edge with a zipper foot.</p>
          </article>
          <article>
            <div className={styles.miniStep}><span>B</span><strong>Open the seam</strong></div>
            <svg viewBox="0 0 320 150" role="img" aria-label="Outer and lining opened away from the first zipper tape and topstitched">
              <rect x="22" y="25" width="121" height="100" fill="#302052" stroke="#a78bfa" strokeWidth="2" />
              <rect x="177" y="25" width="121" height="100" fill="#12364b" stroke="#4de1ff" strokeWidth="2" />
              <rect x="143" y="25" width="34" height="100" rx="3" fill="#d3a72e" />
              <path d="M160 30v90" stroke="#20152e" strokeWidth="5" strokeDasharray="4 4" />
              <path d="M137 25v100M183 25v100" stroke="#ffd75e" strokeWidth="3" strokeDasharray="5 3" />
              <text x="82" y="78" textAnchor="middle" fill="#f7f3ff" fontSize="12">OUTER</text>
              <text x="238" y="78" textAnchor="middle" fill="#dffaff" fontSize="12">LINING</text>
              <text x="160" y="143" textAnchor="middle" fill="#fff3b0" fontSize="9">PRESS AWAY + TOPSTITCH</text>
            </svg>
            <p>Press both fabrics away from the zipper teeth and topstitch through the outer and lining close to the fold.</p>
          </article>
        </div>
      </section>

      <section className={styles.shellSection}>
        <div className={styles.sectionHeading}>
          <span>Step 3</span>
          <div><strong>Wrap both rectangles around the second zipper edge</strong><small>The two opposite short edges return to the free zipper tape.</small></div>
        </div>
        <div className={styles.shellGrid}>
          <article>
            <header><span>Outer first</span><strong>Fold the outer around to the free zipper tape</strong></header>
            <svg viewBox="0 0 330 180" role="img" aria-label="Outer rectangle folded around and sewn to the second zipper tape">
              <path d="M64 145V40h202v105" fill="none" stroke="#a78bfa" strokeWidth="30" strokeLinejoin="round" />
              <rect x="145" y="28" width="40" height="52" rx="4" fill="#d3a72e" />
              <path d="M165 31v46" stroke="#20152e" strokeWidth="5" strokeDasharray="4 4" />
              <path d="M64 145h77M189 145h77" stroke="#ffd75e" strokeWidth="5" />
              <path d="M141 145h48" stroke="#ffd75e" strokeWidth="7" />
              <text x="165" y="105" textAnchor="middle" fill="#f6f2ff" fontSize="12">FOLDED OUTER LOOP</text>
              <text x="165" y="169" textAnchor="middle" fill="#fff3b0" fontSize="9">SEW OPPOSITE SHORT EDGE</text>
            </svg>
          </article>
          <article>
            <header><span>Lining second</span><strong>Leave a centered 2″ / 5 cm gap beside the zipper</strong></header>
            <svg viewBox="0 0 330 180" role="img" aria-label="Lining folded to the second zipper tape with a centered turning gap">
              <path d="M64 145V40h202v105" fill="none" stroke="#4de1ff" strokeWidth="30" strokeLinejoin="round" />
              <rect x="145" y="28" width="40" height="52" rx="4" fill="#d3a72e" />
              <path d="M165 31v46" stroke="#20152e" strokeWidth="5" strokeDasharray="4 4" />
              <path d="M64 145h77M189 145h77" stroke="#ffd75e" strokeWidth="5" />
              <path d="M141 145h48" stroke="#ff7aac" strokeWidth="6" strokeDasharray="7 5" />
              <text x="165" y="105" textAnchor="middle" fill="#dffaff" fontSize="12">FOLDED LINING LOOP</text>
              <text x="165" y="169" textAnchor="middle" fill="#ffb3d2" fontSize="9">KEEP THIS TURNING GAP OPEN</text>
            </svg>
          </article>
        </div>
        <div className={styles.criticalStrip}><strong>Keep the zipper pull accessible:</strong> open the zipper and park its pull inside the 2″ / 5 cm lining gap before sewing the two sides of that gap. Press and topstitch the second zipper edge without closing the opening.</div>
      </section>

      <section className={styles.panelAnatomy}>
        <div className={styles.sectionHeading}>
          <span>Step 4</span>
          <div><strong>Flatten the sewn tube in this exact orientation</strong><small>This is the checkpoint before the two end seams and corner cutting.</small></div>
        </div>
        <svg viewBox="0 0 760 440" role="img" aria-label="Flat sewn unit with folded outer above, zipper horizontal through the center, folded lining below, and straight seams at both short ends">
          <defs>
            <pattern id="assembled-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0v28" fill="none" stroke="#a78bfa" strokeOpacity=".12" /></pattern>
          </defs>
          <g transform="translate(82 48)">
            <rect width="596" height="300" rx="5" fill="#241744" stroke="#a78bfa" strokeWidth="3" />
            <rect width="596" height="150" fill="#302052" />
            <rect y="150" width="596" height="150" fill="#12364b" />
            <rect width="596" height="300" fill="url(#assembled-grid)" />
            <rect y="137" width="596" height="26" fill="#d3a72e" />
            <path d="M0 150h596" stroke="#23152f" strokeWidth="7" strokeDasharray="7 6" />
            <path d="M25 0v300M571 0v300" stroke="#ffd75e" strokeWidth="7" />
            <path d="M38 0v300M558 0v300" stroke="#ffd75e" strokeOpacity=".42" strokeWidth="2" strokeDasharray="6 5" />
            <rect x="-8" y="138" width="22" height="24" rx="4" fill="#ff7aac" />
            <rect x="582" y="138" width="22" height="24" rx="4" fill="#ff7aac" />
            <text x="298" y="76" textAnchor="middle" fill="#f7f3ff" fontSize="24" fontWeight="700">FOLDED OUTER</text>
            <text x="298" y="104" textAnchor="middle" fill="#cabaff" fontFamily="var(--font-ibm-plex-mono)" fontSize="12">ONE HALF OF THE FLAT UNIT</text>
            <text x="298" y="220" textAnchor="middle" fill="#e7fbff" fontSize="24" fontWeight="700">FOLDED LINING</text>
            <text x="298" y="248" textAnchor="middle" fill="#a7efff" fontFamily="var(--font-ibm-plex-mono)" fontSize="12">THE OTHER HALF</text>
            <text x="298" y="132" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">ZIPPER RUNS HORIZONTALLY THROUGH THE CENTER</text>
            <text x="25" y="325" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">SEW</text>
            <text x="571" y="325" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">SEW</text>
            <text x="298" y="365" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="13">CENTER ZIPPER · ALIGN RAW ENDS · SEW BOTH ENDS AT {seamAllowance}</text>
          </g>
        </svg>
        <div className={styles.criticalStrip}><strong>The relationship that matters:</strong> the zipper is the horizontal center line—not a top edge. One folded fabric half is the outer and the other folded half is the lining. Sew straight down both short ends through outer, zipper/tab and lining. There is no bottom seam.</div>
      </section>

      <section className={styles.sewingMap}>
        <div className={styles.sectionHeading}>
          <span>Step 5</span>
          <div><strong>Now use the acrylic template on all four raw corners</strong><small>Put the chosen square flush to the raw edges; do not measure from the end seam.</small></div>
        </div>
        <svg viewBox="0 0 760 405" role="img" aria-label={`Four ${cornerCut} squares cut from the four raw corners of the flat assembled zipper unit`}>
          <defs>
            <pattern id="corner-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#ff7aac" fillOpacity=".18" /><path d="M0 0v9" stroke="#ff7aac" strokeOpacity=".7" strokeWidth="2" /></pattern>
          </defs>
          <g transform="translate(90 48)">
            <rect width="580" height="286" fill="#241744" stroke="#a78bfa" strokeWidth="3" />
            <rect width="580" height="143" fill="#302052" />
            <rect y="143" width="580" height="143" fill="#12364b" />
            <rect y="132" width="580" height="22" fill="#d3a72e" />
            <path d="M0 143h580" stroke="#23152f" strokeWidth="6" strokeDasharray="6 5" />
            <path d="M24 0v286M556 0v286" stroke="#ffd75e" strokeWidth="5" />
            <g fill="url(#corner-hatch)" stroke="#ff7aac" strokeWidth="2.5" strokeDasharray="7 5"><rect width="72" height="72" /><rect x="508" width="72" height="72" /><rect y="214" width="72" height="72" /><rect x="508" y="214" width="72" height="72" /></g>
            <g fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11"><text x="36" y="39" textAnchor="middle">CUT 1</text><text x="544" y="39" textAnchor="middle">CUT 2</text><text x="36" y="253" textAnchor="middle">CUT 3</text><text x="544" y="253" textAnchor="middle">CUT 4</text></g>
            <text x="290" y="80" textAnchor="middle" fill="#f7f3ff" fontSize="18" fontWeight="700">FOLDED OUTER</text>
            <text x="290" y="221" textAnchor="middle" fill="#e7fbff" fontSize="18" fontWeight="700">FOLDED LINING</text>
            <text x="290" y="127" textAnchor="middle" fill="#fff3b0" fontSize="10">CENTER ZIPPER</text>
            <text x="290" y="319" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="12">4 TOTAL TOOL CUTS · EACH {cornerCut} × {cornerCut}</text>
          </g>
        </svg>
        <div className={styles.criticalStrip}><strong>Raw-edge rule:</strong> the template intentionally crosses the new short-end stitch line. Reinforce the exposed seam ends after cutting. A {cornerCut} raw square with a {seamAllowance} cap seam makes about {finishedDepth} finished depth: 2 × ({cornerCut} − {seamAllowance}).</div>
      </section>

      <section className={styles.anchorSection}>
        <div className={styles.sectionHeading}>
          <span>Step 6</span>
          <div><strong>Open, match and sew each outer/lining corner pair</strong><small>Each corner becomes one continuous straight cap seam across both fabrics.</small></div>
        </div>
        <div className={styles.sewingSteps}>
          <article><span>A</span><strong>Open the paired cutout</strong><svg viewBox="0 0 200 125" aria-hidden="true"><path d="M22 20h75v42H63v43H22Z" fill="#302052" stroke="#a78bfa" strokeWidth="2" /><path d="M103 20h75v85h-41V62h-34Z" fill="#12364b" stroke="#4de1ff" strokeWidth="2" /><path d="M63 105V62h34M103 62h34v43" fill="none" stroke="#ff7aac" strokeWidth="4" /><text x="47" y="47" textAnchor="middle" fill="#fff" fontSize="9">OUTER</text><text x="153" y="47" textAnchor="middle" fill="#dffaff" fontSize="9">LINING</text></svg><p>The outer cut and its lining mate sit next to each other at the same end of the unit.</p></article>
          <article><span>B</span><strong>Pull both openings straight</strong><svg viewBox="0 0 200 125" aria-hidden="true"><path d="M18 34 94 61 182 34" fill="none" stroke="#a78bfa" strokeWidth="23" strokeLinejoin="round" /><path d="M18 86 94 61 182 86" fill="none" stroke="#4de1ff" strokeWidth="23" strokeLinejoin="round" /><path d="M94 17v88" stroke="#ffd75e" strokeWidth="4" strokeDasharray="6 4" /><path d="M29 108h142" stroke="#d9d2ef" strokeDasharray="5 4" /></svg><p>Align the raw cap edges into one line. Keep the short-end seam centered and the lining untwisted.</p></article>
          <article><span>C</span><strong>Sew one joined cap seam</strong><svg viewBox="0 0 200 125" aria-hidden="true"><path d="M19 28 181 74 171 108 9 62Z" fill="#302052" stroke="#a78bfa" strokeWidth="2" /><path d="M19 28 100 51 181 74" stroke="#4de1ff" strokeWidth="5" /><path d="M13 53 175 99" stroke="#ffd75e" strokeWidth="6" /><path d="M100 34v39" stroke="#ff7aac" strokeWidth="3" strokeDasharray="4 3" /></svg><p>Sew {seamAllowance} from the raw edge, continuously across outer and lining. Backstitch both ends.</p></article>
        </div>
        <div className={styles.cornerCount}><span>LEFT END</span><b>top + bottom</b><i aria-hidden="true">＋</i><span>RIGHT END</span><b>top + bottom</b><strong>= 4 joined cap seams</strong></div>
      </section>

      <section className={styles.finishSection}>
        <div className={styles.sectionHeading}>
          <span>Step 7</span>
          <div><strong>Turn through the zipper-side gap and close it</strong><small>All raw cap and end seams finish hidden between the outer and lining.</small></div>
        </div>
        <div className={styles.finishChecks}>
          <article><b>1</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="M7 9h62v36H7Z" fill="#12364b" stroke="#4de1ff" /><path d="M8 27h60" stroke="#ffd75e" strokeWidth="4" /><path d="M27 27h22" stroke="#ff7aac" strokeWidth="5" strokeDasharray="4 3" /></svg><span><strong>Find the gap</strong> Reach through the 2″ / 5 cm opening left beside the zipper—not through a bottom seam.</span></article>
          <article><b>2</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="M8 11h32v31H8Z" fill="#12364b" stroke="#4de1ff" /><path d="M32 18h35v27H32Z" fill="#302052" stroke="#a78bfa" /><path d="M24 27h20" stroke="#ffd75e" strokeWidth="3" /><path d="m39 21 7 6-7 6" fill="none" stroke="#ffd75e" strokeWidth="2" /></svg><span><strong>Turn</strong> Pull the pouch right side out through that zipper-seam gap and open the zipper fully.</span></article>
          <article><b>3</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="m11 17 40-7 14 10-40 7Z" fill="#ffd75e" /><path d="m11 17 14 10v18L11 35Z" fill="#177f9c" /><path d="m25 27 40-7v18l-40 7Z" fill="#5f38b4" /></svg><span><strong>Shape</strong> Push out all four corners and settle the lining neatly inside the outer.</span></article>
          <article><b>4</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="M8 10h60v35H8Z" fill="#12364b" stroke="#4de1ff" /><path d="M10 27h56" stroke="#ffd75e" strokeWidth="5" /><path d="M26 22h24M26 32h24" stroke="#4de1ff" strokeWidth="2" strokeDasharray="3 2" /></svg><span><strong>Close</strong> Fold the gap allowances inward and topstitch close to the zipper to seal the opening.</span></article>
        </div>
      </section>

      <section className={styles.fullPattern}>
        <div className={styles.sectionHeading}>
          <span>Full pattern</span>
          <div><strong>Complete order of construction</strong><small>Use {seamAllowance} seam allowance unless a step says otherwise.</small></div>
        </div>
        <ol>
          <li><strong>Cut the full rectangles.</strong> Cut one outer and one lining at {panelLength} × {panelWidth}. Cut one matching interfacing piece, fuse it to the outer wrong side and trim it even. Do not remove any corner squares.</li>
          <li><strong>Make the zipper tabs.</strong> Cut two 2½″ / 6 cm squares. Fold each in half, open it, fold both raw edges to the center crease, fold again and topstitch. Set aside.</li>
          <li><strong>Attach zipper edge 1.</strong> Place the outer right side up. Put the nylon zipper right side down along one short edge. Place the lining right side down on top. Align the raw edges and sew through all three layers at {seamAllowance}.</li>
          <li><strong>Press and topstitch edge 1.</strong> Fold the outer and lining away from the teeth, press the seam flat and topstitch close to the fabric fold.</li>
          <li><strong>Attach zipper edge 2 to the outer.</strong> Bring the opposite short edge of the outer around to the free zipper tape, right sides together. Align and sew at {seamAllowance}; the outer now forms a loop around the zipper.</li>
          <li><strong>Attach zipper edge 2 to the lining.</strong> Open the zipper. Mark a centered 2″ / 5 cm turning gap on the opposite lining short edge and park the pull inside that gap. Bring the lining right side to the free tape and sew from each end only to the gap marks.</li>
          <li><strong>Topstitch edge 2 and add tabs.</strong> Press and topstitch both sides of the turning gap without sewing it closed. Close the zipper and baste one folded tab over each zipper end, with each tab fold pointing into the bag.</li>
          <li><strong>Make the flat checkpoint.</strong> Put the zipper pull back inside the turning gap. Turn the tube wrong side out and flatten it with the zipper horizontal through the center, the folded outer entirely above it and the folded lining entirely below it.</li>
          <li><strong>Center the zipper and sew both ends.</strong> Match the raw short ends and center the zipper precisely. Sew each end straight across at {seamAllowance} through outer, zipper/tab and lining. Hand-wheel slowly over nylon coil teeth; never sew over a metal stop.</li>
          <li><strong>Cut four assembled corners.</strong> Put the {cornerCut} acrylic corner flush with both raw edges at one corner of the flat sewn unit. Cut the square—even though the tool crosses the end stitch line. Repeat at the other three corners, then reinforce the exposed seam ends.</li>
          <li><strong>Sew four joined corner caps.</strong> At one cutout, open the outer and its lining mate, bring their cap edges into one continuous straight line and center the short-end seam. Sew across at {seamAllowance}. Repeat at all four corners. This joins the matching outer and lining corners and hides the allowances between them.</li>
          <li><strong>Turn and finish.</strong> Pull the pouch right side out through the zipper-seam gap, open the zipper fully, shape every corner and seat the lining. Fold the gap edges inward and topstitch them closed beside the zipper. The bag finishes about {finishedLength} long × {finishedDepth} deep × {finishedHeight} high.</li>
        </ol>
      </section>
    </figure>
  );
}
