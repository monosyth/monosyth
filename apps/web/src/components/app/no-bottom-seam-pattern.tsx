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

function PanelPiece({ layer, number, panelLength, panelWidth }: {
  layer: "Outer" | "Lining";
  number: 1 | 2;
  panelLength: string;
  panelWidth: string;
}) {
  const outer = layer === "Outer";
  return (
    <article className={`${styles.panelPiece} ${outer ? styles.outerPiece : styles.liningPiece}`}>
      <header><span>{layer}</span><strong>Panel {number} · cut 1</strong></header>
      <svg viewBox="0 0 360 205" role="img" aria-label={`${layer} panel ${number}, ${panelLength} by ${panelWidth}; leave all four corners uncut`}>
        <defs>
          <pattern id={`panel-grid-${layer}-${number}`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke={outer ? "#a78bfa" : "#4de1ff"} strokeOpacity=".12" /></pattern>
        </defs>
        <rect x="49" y="27" width="262" height="146" rx="3" fill={outer ? "#302052" : "#12364b"} stroke={outer ? "#a78bfa" : "#4de1ff"} strokeWidth="2.5" />
        <rect x="49" y="27" width="262" height="146" fill={`url(#panel-grid-${layer}-${number})`} />
        <path d="M49 27h262" stroke="#ffd75e" strokeWidth="6" />
        <text x="180" y="90" textAnchor="middle" fill="#f6f2ff" fontSize="18" fontWeight="700">{layer.toUpperCase()} {number}</text>
        <text x="180" y="115" textAnchor="middle" fill={outer ? "#cabaff" : "#a7efff"} fontFamily="var(--font-ibm-plex-mono)" fontSize="11">FULL RECTANGLE</text>
        <text x="180" y="138" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">DO NOT CUT CORNERS YET</text>
        <text x="180" y="20" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="9">ZIPPER EDGE</text>
        <text x="180" y="193" textAnchor="middle" fill="#bcb2d4" fontFamily="var(--font-ibm-plex-mono)" fontSize="9">BOTTOM-SEAM EDGE</text>
      </svg>
      <p><strong>{panelLength} × {panelWidth}</strong><span>zipper width × panel height</span></p>
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
        <div><span>Full illustrated pattern</span><strong>Two outer + two lining panels · four stacked tool cuts</strong></div>
        <span className={styles.figureScale}>diagram · not to scale</span>
      </div>
      <div className={styles.diagramLegend} aria-label="Diagram color key">
        <span><i className={styles.legendCut} /> pink = cut</span>
        <span><i className={styles.legendSew} /> yellow = zipper / sew</span>
        <span><i className={styles.legendSeam} /> cyan = lining</span>
      </div>

      <div className={styles.methodCompare} aria-label="Construction method comparison">
        <article>
          <span>Not this pattern</span>
          <strong>One-piece wrap with no bottom seam</strong>
          <p>That version starts with one long outer rectangle and one long lining rectangle.</p>
        </article>
        <b aria-hidden="true">→</b>
        <article className={styles.methodSelected}>
          <span>This pattern</span>
          <strong>Four panels + centered zipper</strong>
          <p>Two outer panels make the outer bottom seam; two lining panels make a separate lining seam with the turning gap.</p>
        </article>
      </div>

      <section className={styles.allPanelsSection}>
        <div className={styles.sectionHeading}>
          <span>Step 1</span>
          <div><strong>Cut four complete rectangular panels</strong><small>The acrylic tool is not used on the separate pieces.</small></div>
        </div>
        <div className={styles.panelSet}>
          <PanelPiece layer="Outer" number={1} panelLength={panelLength} panelWidth={panelWidth} />
          <PanelPiece layer="Outer" number={2} panelLength={panelLength} panelWidth={panelWidth} />
          <PanelPiece layer="Lining" number={1} panelLength={panelLength} panelWidth={panelWidth} />
          <PanelPiece layer="Lining" number={2} panelLength={panelLength} panelWidth={panelWidth} />
        </div>
        <div className={styles.interfacingStrip}>
          <span>Also cut</span>
          <strong>2 interfacing panels + 2 zipper-tab squares</strong>
          <p>Fuse one interfacing panel to each outer wrong side. Cut two 2½″ / 6 cm squares for folded zipper tabs.</p>
        </div>
      </section>

      <section className={styles.zipperSection}>
        <div className={styles.sectionHeading}>
          <span>Step 2</span>
          <div><strong>Attach one outer/lining pair to each zipper tape</strong><small>Both panel pairs use the same three-layer sandwich.</small></div>
        </div>
        <div className={styles.zipperSteps}>
          <article>
            <div className={styles.miniStep}><span>A</span><strong>Zipper side 1</strong></div>
            <div className={styles.layerStack} aria-label="First zipper sandwich from top to bottom">
              <div className={styles.liningLayer}><b>TOP · LINING 1</b><small>right side down · wrong side visible</small></div>
              <div className={styles.zipperLayer}><b>ZIPPER · RIGHT SIDE DOWN</b><small>teeth face Outer 1</small></div>
              <div className={styles.outerLayer}><b>BOTTOM · OUTER 1</b><small>right side up</small></div>
            </div>
            <p>Align the three zipper edges and sew {seamAllowance} from the raw edge.</p>
          </article>
          <article>
            <div className={styles.miniStep}><span>B</span><strong>Zipper side 2</strong></div>
            <div className={styles.layerStack} aria-label="Second zipper sandwich from top to bottom">
              <div className={styles.liningLayer}><b>TOP · LINING 2</b><small>right side down · wrong side visible</small></div>
              <div className={styles.zipperLayer}><b>FREE ZIPPER TAPE</b><small>teeth face Outer 2</small></div>
              <div className={styles.outerLayer}><b>BOTTOM · OUTER 2</b><small>right side up</small></div>
            </div>
            <p>Keep the first panel pair clear and sew the second sandwich the same way.</p>
          </article>
          <article>
            <div className={styles.miniStep}><span>C</span><strong>Open + topstitch</strong></div>
            <svg viewBox="0 0 320 150" role="img" aria-label="Two fabric pairs opened away from the centered zipper and topstitched">
              <rect x="22" y="25" width="121" height="100" fill="#302052" stroke="#a78bfa" strokeWidth="2" />
              <rect x="177" y="25" width="121" height="100" fill="#302052" stroke="#a78bfa" strokeWidth="2" />
              <rect x="143" y="25" width="34" height="100" rx="3" fill="#d3a72e" />
              <path d="M160 30v90" stroke="#20152e" strokeWidth="5" strokeDasharray="4 4" />
              <path d="M137 25v100M183 25v100" stroke="#ffd75e" strokeWidth="3" strokeDasharray="5 3" />
              <text x="82" y="78" textAnchor="middle" fill="#f7f3ff" fontSize="11">PAIR 1</text>
              <text x="238" y="78" textAnchor="middle" fill="#f7f3ff" fontSize="11">PAIR 2</text>
              <text x="160" y="143" textAnchor="middle" fill="#fff3b0" fontSize="9">PRESS AWAY + TOPSTITCH BOTH SIDES</text>
            </svg>
            <p>Press every fabric layer away from the teeth. Topstitch close to both folds, then baste the tabs over the zipper ends.</p>
          </article>
        </div>
      </section>

      <section className={styles.panelAnatomy}>
        <div className={styles.sectionHeading}>
          <span>Step 3</span>
          <div><strong>Open the zipper halfway and make this flat stack</strong><small>Outer panels pair on one side; lining panels pair on the other.</small></div>
        </div>
        <svg viewBox="0 0 760 440" role="img" aria-label="Two outer panels right sides together above a horizontal centered zipper and two lining panels right sides together below it">
          <defs><pattern id="four-panel-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0v28" fill="none" stroke="#a78bfa" strokeOpacity=".13" /></pattern></defs>
          <g transform="translate(82 48)">
            <rect width="596" height="300" rx="5" fill="#241744" stroke="#a78bfa" strokeWidth="3" />
            <rect width="596" height="150" fill="#302052" />
            <rect y="150" width="596" height="150" fill="#12364b" />
            <rect width="596" height="300" fill="url(#four-panel-grid)" />
            <rect y="137" width="596" height="26" fill="#d3a72e" />
            <path d="M0 150h596" stroke="#23152f" strokeWidth="7" strokeDasharray="7 6" />
            <path d="M0 0h596M0 300h596M0 0v300M596 0v300" stroke="#ff7aac" strokeWidth="2" strokeDasharray="7 5" />
            <text x="298" y="70" textAnchor="middle" fill="#f7f3ff" fontSize="24" fontWeight="700">OUTER 1 + OUTER 2</text>
            <text x="298" y="101" textAnchor="middle" fill="#cabaff" fontFamily="var(--font-ibm-plex-mono)" fontSize="12">RIGHT SIDES TOGETHER · TWO LAYERS</text>
            <text x="298" y="219" textAnchor="middle" fill="#e7fbff" fontSize="24" fontWeight="700">LINING 1 + LINING 2</text>
            <text x="298" y="250" textAnchor="middle" fill="#a7efff" fontFamily="var(--font-ibm-plex-mono)" fontSize="12">RIGHT SIDES TOGETHER · TWO LAYERS</text>
            <text x="298" y="132" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">ZIPPER RUNS HORIZONTALLY THROUGH THE CENTER</text>
            <text x="298" y="356" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="13">ALIGN ALL RAW EDGES · KEEP THE ZIPPER HALF OPEN</text>
          </g>
        </svg>
        <div className={styles.criticalStrip}><strong>Exact layout:</strong> the two outer panels are stacked above the zipper and the two lining panels are stacked below it. The zipper is the horizontal center line. No shell seam has been sewn and no corner has been cut yet.</div>
      </section>

      <section className={styles.sewingMap}>
        <div className={styles.sectionHeading}>
          <span>Step 4</span>
          <div><strong>Use the acrylic tool on the four stacked raw corners</strong><small>Each placement cuts through two matching fabric layers.</small></div>
        </div>
        <svg viewBox="0 0 760 405" role="img" aria-label={`Four ${cornerCut} stacked squares cut from the four raw corners of the flat four-panel zipper unit`}>
          <defs><pattern id="stacked-corner-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#ff7aac" fillOpacity=".18" /><path d="M0 0v9" stroke="#ff7aac" strokeOpacity=".7" strokeWidth="2" /></pattern></defs>
          <g transform="translate(90 48)">
            <rect width="580" height="286" fill="#241744" stroke="#a78bfa" strokeWidth="3" />
            <rect width="580" height="143" fill="#302052" />
            <rect y="143" width="580" height="143" fill="#12364b" />
            <rect y="132" width="580" height="22" fill="#d3a72e" />
            <path d="M0 143h580" stroke="#23152f" strokeWidth="6" strokeDasharray="6 5" />
            <g fill="url(#stacked-corner-hatch)" stroke="#ff7aac" strokeWidth="2.5" strokeDasharray="7 5"><rect width="72" height="72" /><rect x="508" width="72" height="72" /><rect y="214" width="72" height="72" /><rect x="508" y="214" width="72" height="72" /></g>
            <g fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11"><text x="36" y="39" textAnchor="middle">CUT 1</text><text x="544" y="39" textAnchor="middle">CUT 2</text><text x="36" y="253" textAnchor="middle">CUT 3</text><text x="544" y="253" textAnchor="middle">CUT 4</text></g>
            <text x="290" y="80" textAnchor="middle" fill="#f7f3ff" fontSize="18" fontWeight="700">2 OUTER LAYERS</text>
            <text x="290" y="221" textAnchor="middle" fill="#e7fbff" fontSize="18" fontWeight="700">2 LINING LAYERS</text>
            <text x="290" y="127" textAnchor="middle" fill="#fff3b0" fontSize="10">CENTER ZIPPER</text>
            <text x="290" y="319" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="12">4 TOOL PLACEMENTS · 8 FABRIC CORNERS REMOVED</text>
          </g>
        </svg>
        <div className={styles.criticalStrip}><strong>Raw-edge rule:</strong> put the {cornerCut} corner of the tool flush with both raw edges. Do not measure from a seam and do not add seam allowance to the template. A {cornerCut} raw square with a {seamAllowance} cap seam makes about {finishedDepth} finished depth.</div>
      </section>

      <section className={styles.shellSection}>
        <div className={styles.sectionHeading}>
          <span>Step 5</span>
          <div><strong>Sew the shell seams—leave all four corner openings free</strong><small>The end seams cross the zipper; the outer and lining bottom seams stay separate.</small></div>
        </div>
        <svg viewBox="0 0 760 420" role="img" aria-label="Four-panel unit with both short ends sewn across the zipper, outer bottom seam sewn, and lining bottom seam sewn with a turning gap">
          <g transform="translate(88 55)">
            <path d="M72 0h440v72h72v142h-72v72H72v-72H0V72h72Z" fill="#241744" stroke="#a78bfa" strokeWidth="3" />
            <path d="M72 0h440v72h72v71H0V72h72Z" fill="#302052" />
            <path d="M0 143h584v71h-72v72H72v-72H0Z" fill="#12364b" />
            <rect y="132" width="584" height="22" fill="#d3a72e" />
            <path d="M0 143h584" stroke="#23152f" strokeWidth="6" strokeDasharray="6 5" />
            <path d="M18 72v142M566 72v142" stroke="#ffd75e" strokeWidth="7" />
            <path d="M72 18h440" stroke="#ffd75e" strokeWidth="7" />
            <path d="M72 268h176M336 268h176" stroke="#ffd75e" strokeWidth="7" />
            <path d="M248 268h88" stroke="#4de1ff" strokeWidth="5" strokeDasharray="8 6" />
            <text x="292" y="59" textAnchor="middle" fill="#f7f3ff" fontSize="16" fontWeight="700">OUTER BOTTOM SEAM</text>
            <text x="292" y="234" textAnchor="middle" fill="#dffaff" fontSize="16" fontWeight="700">LINING BOTTOM SEAM</text>
            <text x="292" y="261" textAnchor="middle" fill="#a7efff" fontSize="10">LEAVE 3–4″ / 8–10 CM TURNING GAP</text>
            <text x="18" y="306" textAnchor="middle" fill="#fff3b0" fontSize="9">SEW END</text>
            <text x="566" y="306" textAnchor="middle" fill="#fff3b0" fontSize="9">SEW END</text>
            <text x="292" y="335" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">PINK CUTOUT EDGES REMAIN OPEN</text>
          </g>
        </svg>
        <div className={styles.criticalStrip}><strong>Sewing order:</strong> stitch both short ends straight across at {seamAllowance}, hand-wheeling over the nylon zipper coil. Sew the outer bottom edge between its cutouts. Sew the lining bottom edge separately and leave the turning gap. Never sew across a metal zipper stop.</div>
      </section>

      <section className={styles.anchorSection}>
        <div className={styles.sectionHeading}>
          <span>Step 6</span>
          <div><strong>Box the two outer and two lining corners separately</strong><small>Each square cutout becomes one straight diagonal cap seam.</small></div>
        </div>
        <div className={styles.sewingSteps}>
          <article><span>A</span><strong>Open one cutout</strong><svg viewBox="0 0 200 125" aria-hidden="true"><path d="M34 18h132v45h-48v44H34Z" fill="#302052" stroke="#a78bfa" strokeWidth="2" /><path d="M118 107V63h48" fill="none" stroke="#ff7aac" strokeWidth="5" /><text x="91" y="54" textAnchor="middle" fill="#fff" fontSize="10">ONE SHELL CORNER</text></svg><p>Pull the two sides of the square opening away from one another.</p></article>
          <article><span>B</span><strong>Match the two seams</strong><svg viewBox="0 0 200 125" aria-hidden="true"><path d="M25 31 100 62 175 31" fill="none" stroke="#a78bfa" strokeWidth="23" strokeLinejoin="round" /><path d="M42 96h116" stroke="#d9d2ef" strokeDasharray="6 5" /><path d="M100 20v83" stroke="#ff7aac" strokeWidth="4" strokeDasharray="5 4" /><path d="m88 82 12 12 12-12" fill="none" stroke="#d9d2ef" strokeWidth="2" /></svg><p>Flatten the cap edge. Nest the short-end seam directly on the matching bottom seam.</p></article>
          <article><span>C</span><strong>Sew diagonally across</strong><svg viewBox="0 0 200 125" aria-hidden="true"><path d="M19 28 181 74 171 108 9 62Z" fill="#302052" stroke="#a78bfa" strokeWidth="2" /><path d="M13 53 175 99" stroke="#ffd75e" strokeWidth="6" /><path d="M100 34v39" stroke="#ff7aac" strokeWidth="3" strokeDasharray="4 3" /></svg><p>Sew {seamAllowance} from the raw edge and backstitch. Repeat on all four shell corners.</p></article>
        </div>
        <div className={styles.cornerCount}><span>OUTER</span><b>left + right</b><i aria-hidden="true">＋</i><span>LINING</span><b>left + right</b><strong>= 4 separate cap seams</strong></div>
        <div className={styles.criticalStrip}><strong>Optional lining anchor:</strong> through the turning gap, tack each outer cap seam allowance to its matching lining cap allowance inside the existing seam allowance. Check that the lining is not twisted before sewing.</div>
      </section>

      <section className={styles.finishSection}>
        <div className={styles.sectionHeading}>
          <span>Step 7</span>
          <div><strong>Turn through the lining gap and finish</strong><small>The half-open zipper is the second opening needed to reach the right side.</small></div>
        </div>
        <div className={styles.finishChecks}>
          <article><b>1</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="M7 9h62v36H7Z" fill="#12364b" stroke="#4de1ff" /><path d="M20 39h36" stroke="#4de1ff" strokeWidth="4" strokeDasharray="5 3" /></svg><span><strong>Find the gap</strong> Reach through the 3–4″ / 8–10 cm opening in the lining bottom seam.</span></article>
          <article><b>2</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="M8 11h32v31H8Z" fill="#12364b" stroke="#4de1ff" /><path d="M32 18h35v27H32Z" fill="#302052" stroke="#a78bfa" /><path d="M24 27h20" stroke="#ffd75e" strokeWidth="3" /><path d="m39 21 7 6-7 6" fill="none" stroke="#ffd75e" strokeWidth="2" /></svg><span><strong>Turn</strong> Pull the outer through the lining gap and then through the half-open zipper.</span></article>
          <article><b>3</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="m11 17 40-7 14 10-40 7Z" fill="#ffd75e" /><path d="m11 17 14 10v18L11 35Z" fill="#177f9c" /><path d="m25 27 40-7v18l-40 7Z" fill="#5f38b4" /></svg><span><strong>Shape</strong> Push out all four corners and settle the lining neatly inside the outer.</span></article>
          <article><b>4</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="M8 10h60v35H8Z" fill="#12364b" stroke="#4de1ff" /><path d="M18 38h40" stroke="#4de1ff" strokeWidth="3" /><path d="M26 38h24" stroke="#ffd75e" strokeWidth="4" /></svg><span><strong>Close</strong> Fold the lining gap allowances inward and edgestitch or ladder-stitch the opening closed.</span></article>
        </div>
      </section>

      <section className={styles.fullPattern}>
        <div className={styles.sectionHeading}>
          <span>Full pattern</span>
          <div><strong>Complete order of construction</strong><small>Use {seamAllowance} seam allowance unless a step says otherwise.</small></div>
        </div>
        <ol>
          <li><strong>Cut all four panels.</strong> Cut two outer and two lining panels at {panelLength} × {panelWidth}. Cut two matching interfacing panels, fuse one to each outer wrong side and trim even. Keep every panel rectangular.</li>
          <li><strong>Make the zipper tabs.</strong> Cut two 2½″ / 6 cm squares. Fold each in half, open it, fold both raw edges to the center crease, fold again and topstitch. Set aside.</li>
          <li><strong>Attach zipper side 1.</strong> Place Outer 1 right side up. Put the nylon zipper right side down along its zipper edge. Place Lining 1 right side down on top. Align the raw edges and sew through all three layers at {seamAllowance}.</li>
          <li><strong>Attach zipper side 2.</strong> Repeat on the free zipper tape with Outer 2 right side up and Lining 2 right side down. Keep the first panel pair away from the needle.</li>
          <li><strong>Press, topstitch and add tabs.</strong> Press both fabric pairs away from the teeth and topstitch close to each fold. Baste a folded tab over each zipper end with its fold pointing inward.</li>
          <li><strong>Make the flat four-panel stack.</strong> Open the zipper halfway. Bring the two outer panels right sides together on one side of the zipper and the two lining panels right sides together on the other. Align every raw edge so the zipper runs horizontally through the exact center.</li>
          <li><strong>Cut four stacked corners.</strong> Put the {cornerCut} acrylic corner flush with both raw edges at the upper-left outer corner and cut through both outer layers. Repeat upper-right. Cut through both lining layers at the lower-left and lower-right. This is four tool placements and eight individual fabric corners.</li>
          <li><strong>Sew both short ends.</strong> Sew {seamAllowance} straight down each end, crossing outer, tab/nylon zipper and lining. Hand-wheel over the coil and backstitch; never sew over a metal stop.</li>
          <li><strong>Sew the two bottom seams.</strong> Sew the outer bottom edge between its open cutouts. Sew the lining bottom edge separately, leaving a centered 3–4″ / 8–10 cm turning gap. Leave all four square corner openings unsewn.</li>
          <li><strong>Box four corners.</strong> Open one cutout and flatten it so the short-end seam nests directly on the bottom seam. Align the raw cap edges and sew {seamAllowance} across. Repeat for the second outer and both lining corners.</li>
          <li><strong>Anchor the lining if desired.</strong> Reach through the lining gap, confirm the lining is not twisted and tack each outer cap seam allowance to its matching lining cap allowance inside the seam allowance.</li>
          <li><strong>Turn and finish.</strong> Pull the pouch through the lining gap and then through the half-open zipper. Shape the corners, close the lining gap and seat the lining. The bag finishes about {finishedLength} long × {finishedDepth} deep × {finishedHeight} high.</li>
        </ol>
      </section>
    </figure>
  );
}
