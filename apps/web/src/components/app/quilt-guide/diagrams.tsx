import type { ReactNode } from "react";
import type { BlockStepDiagramKind } from "@/lib/quilting/data";

import styles from "./quilt-guide.module.css";

const COLORS = {
  background: "#f7edd9",
  cream: "#fffaf0",
  feature: "#c23e31",
  featureDark: "#a7352f",
  accent: "#167471",
  gold: "#e3a52e",
  navy: "#233451",
  lilac: "#9078b6",
  pink: "#df8194",
  line: "#302b28",
};

type Corner = "nw" | "ne" | "se" | "sw";

function Square({
  x,
  y,
  size,
  fill,
  stroke = COLORS.cream,
  strokeWidth = 0.8,
}: {
  x: number;
  y: number;
  size: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  return <rect x={x} y={y} width={size} height={size} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

function Hst({
  x,
  y,
  size,
  corner,
  featureFill = COLORS.feature,
  backgroundFill = COLORS.background,
}: {
  x: number;
  y: number;
  size: number;
  corner: Corner;
  featureFill?: string;
  backgroundFill?: string;
}) {
  const points: Record<Corner, string> = {
    nw: `${x},${y} ${x + size},${y} ${x},${y + size}`,
    ne: `${x},${y} ${x + size},${y} ${x + size},${y + size}`,
    se: `${x + size},${y} ${x + size},${y + size} ${x},${y + size}`,
    sw: `${x},${y} ${x + size},${y + size} ${x},${y + size}`,
  };
  return (
    <g>
      <Square x={x} y={y} size={size} fill={backgroundFill} />
      <polygon points={points[corner]} fill={featureFill} stroke={COLORS.cream} strokeWidth="0.7" />
    </g>
  );
}

function Qst({ x, y, size, rotate = false }: { x: number; y: number; size: number; rotate?: boolean }) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const first = rotate ? COLORS.background : COLORS.feature;
  const second = rotate ? COLORS.feature : COLORS.background;
  return (
    <g stroke={COLORS.cream} strokeWidth="0.7">
      <polygon points={`${x},${y} ${x + size},${y} ${cx},${cy}`} fill={first} />
      <polygon points={`${x + size},${y} ${x + size},${y + size} ${cx},${cy}`} fill={second} />
      <polygon points={`${x + size},${y + size} ${x},${y + size} ${cx},${cy}`} fill={first} />
      <polygon points={`${x},${y + size} ${x},${y} ${cx},${cy}`} fill={second} />
    </g>
  );
}

function SplitCell({
  x,
  y,
  size,
  direction,
}: {
  x: number;
  y: number;
  size: number;
  direction: "horizontal" | "vertical";
}) {
  return (
    <g stroke={COLORS.cream} strokeWidth="0.7">
      <rect x={x} y={y} width={direction === "vertical" ? size / 2 : size} height={direction === "horizontal" ? size / 2 : size} fill={COLORS.feature} />
      <rect x={direction === "vertical" ? x + size / 2 : x} y={direction === "horizontal" ? y + size / 2 : y} width={direction === "vertical" ? size / 2 : size} height={direction === "horizontal" ? size / 2 : size} fill={COLORS.background} />
    </g>
  );
}

function FourPatchCell({ x, y, size, reverse = false }: { x: number; y: number; size: number; reverse?: boolean }) {
  const half = size / 2;
  return (
    <g>
      <Square x={x} y={y} size={half} fill={reverse ? COLORS.background : COLORS.feature} />
      <Square x={x + half} y={y} size={half} fill={reverse ? COLORS.feature : COLORS.background} />
      <Square x={x} y={y + half} size={half} fill={reverse ? COLORS.feature : COLORS.background} />
      <Square x={x + half} y={y + half} size={half} fill={reverse ? COLORS.background : COLORS.feature} />
    </g>
  );
}

function Grid({
  size,
  cells,
}: {
  size: number;
  cells: (x: number, y: number, cell: number, row: number, column: number) => ReactNode;
}) {
  const cell = 120 / size;
  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const column = index % size;
    return <g key={`${row}-${column}`}>{cells(column * cell, row * cell, cell, row, column)}</g>;
  });
}

function LogCabin({
  offset = false,
  upto = 12,
  numbered = false,
}: {
  offset?: boolean;
  upto?: number;
  numbered?: boolean;
}) {
  const dark = offset ? COLORS.featureDark : COLORS.feature;
  const rounds = [
    { x: 45, y: 45, width: 30, height: 30, fill: COLORS.accent },
    { x: 45, y: 30, width: 30, height: 15, fill: COLORS.background },
    { x: 30, y: 30, width: 15, height: 45, fill: COLORS.background },
    { x: 30, y: 75, width: 45, height: 15, fill: dark },
    { x: 75, y: 30, width: 15, height: 60, fill: dark },
    { x: 30, y: 15, width: 60, height: 15, fill: COLORS.background },
    { x: 15, y: 15, width: 15, height: 75, fill: COLORS.background },
    { x: 15, y: 90, width: 75, height: 15, fill: dark },
    { x: 90, y: 15, width: 15, height: 90, fill: dark },
    { x: 15, y: 0, width: 90, height: 15, fill: COLORS.background },
    { x: 0, y: 0, width: 15, height: 105, fill: COLORS.background },
    { x: 0, y: 105, width: 105, height: 15, fill: dark },
    { x: 105, y: 0, width: 15, height: 120, fill: dark },
  ];
  const visibleRounds = rounds.filter((_, index) => index === 0 || index <= upto);
  return (
    <g stroke={COLORS.cream} strokeWidth="0.8">
      {visibleRounds.map((part, index) => (
        <g key={index}>
          <rect {...part} />
          {numbered ? (
            <text
              x={part.x + part.width / 2}
              y={part.y + part.height / 2 + 3}
              textAnchor="middle"
              fill={index === 0 || part.fill === dark ? COLORS.cream : COLORS.line}
              stroke="none"
              fontSize={index === 0 ? 10 : 9}
              fontWeight="900"
            >
              {index === 0 ? "C" : index}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
}

function CourthouseSteps() {
  return (
    <g stroke={COLORS.cream} strokeWidth="0.8">
      <rect x="40" y="40" width="40" height="40" fill={COLORS.accent} />
      <rect x="20" y="40" width="20" height="40" fill={COLORS.feature} />
      <rect x="80" y="40" width="20" height="40" fill={COLORS.feature} />
      <rect x="20" y="20" width="80" height="20" fill={COLORS.background} />
      <rect x="20" y="80" width="80" height="20" fill={COLORS.background} />
      <rect x="0" y="20" width="20" height="80" fill={COLORS.featureDark} />
      <rect x="100" y="20" width="20" height="80" fill={COLORS.featureDark} />
      <rect x="0" y="0" width="120" height="20" fill={COLORS.background} />
      <rect x="0" y="100" width="120" height="20" fill={COLORS.background} />
    </g>
  );
}

function SawtoothStar() {
  return (
    <g>
      <Square x={0} y={0} size={30} fill={COLORS.background} />
      <Square x={90} y={0} size={30} fill={COLORS.background} />
      <Square x={0} y={90} size={30} fill={COLORS.background} />
      <Square x={90} y={90} size={30} fill={COLORS.background} />
      <FlyingGoose x={30} y={0} width={60} height={30} direction="down" fill={COLORS.background} skyFill={COLORS.feature} />
      <FlyingGoose x={90} y={30} width={30} height={60} direction="left" fill={COLORS.background} skyFill={COLORS.feature} />
      <FlyingGoose x={30} y={90} width={60} height={30} direction="up" fill={COLORS.background} skyFill={COLORS.feature} />
      <FlyingGoose x={0} y={30} width={30} height={60} direction="right" fill={COLORS.background} skyFill={COLORS.feature} />
      <rect x="30" y="30" width="60" height="60" fill={COLORS.accent} stroke={COLORS.cream} />
    </g>
  );
}

function Snowball() {
  return (
    <g stroke={COLORS.cream} strokeWidth="0.9">
      <rect width="120" height="120" fill={COLORS.feature} />
      <polygon points="0,0 38,0 0,38" fill={COLORS.background} />
      <polygon points="120,0 82,0 120,38" fill={COLORS.background} />
      <polygon points="120,120 82,120 120,82" fill={COLORS.background} />
      <polygon points="0,120 38,120 0,82" fill={COLORS.background} />
    </g>
  );
}

function BearPaw() {
  const paw = (x: number, y: number, rotate: number) => (
    <g transform={`translate(${x} ${y}) rotate(${rotate} 26 26)`}>
      <rect x="18" y="18" width="34" height="34" fill={COLORS.feature} stroke={COLORS.cream} />
      <Hst x={0} y={18} size={18} corner="se" />
      <Hst x={0} y={36} size={18} corner="ne" />
      <Hst x={18} y={0} size={18} corner="se" />
      <Hst x={36} y={0} size={18} corner="sw" />
      <Square x={0} y={0} size={18} fill={COLORS.background} />
    </g>
  );
  return (
    <g>
      {paw(0, 0, 0)}
      {paw(68, 0, 90)}
      {paw(68, 68, 180)}
      {paw(0, 68, 270)}
      <rect x="54" y="0" width="12" height="120" fill={COLORS.background} stroke={COLORS.cream} />
      <rect x="0" y="54" width="120" height="12" fill={COLORS.background} stroke={COLORS.cream} />
      <rect x="54" y="54" width="12" height="12" fill={COLORS.background} stroke={COLORS.cream} />
    </g>
  );
}

function WonkyStar() {
  return (
    <g stroke={COLORS.cream} strokeWidth="0.8">
      <rect width="120" height="120" fill={COLORS.background} />
      <rect x="40" y="40" width="40" height="40" fill={COLORS.feature} />
      <polygon points="40,40 27,2 54,40" fill={COLORS.feature} />
      <polygon points="54,40 71,0 70,40" fill={COLORS.gold} />
      <polygon points="80,40 120,25 80,57" fill={COLORS.feature} />
      <polygon points="80,57 118,76 80,70" fill={COLORS.pink} />
      <polygon points="80,80 92,120 65,80" fill={COLORS.feature} />
      <polygon points="65,80 47,117 51,80" fill={COLORS.gold} />
      <polygon points="40,80 0,95 40,64" fill={COLORS.feature} />
      <polygon points="40,64 2,45 40,50" fill={COLORS.lilac} />
    </g>
  );
}

function ImprovMosaic() {
  return (
    <g stroke={COLORS.cream} strokeWidth="1">
      <polygon points="0,0 35,0 25,35 0,48" fill={COLORS.feature} />
      <polygon points="35,0 70,0 62,26 25,35" fill={COLORS.gold} />
      <polygon points="70,0 120,0 120,32 62,26" fill={COLORS.accent} />
      <polygon points="0,48 25,35 54,63 0,72" fill={COLORS.navy} />
      <polygon points="25,35 62,26 75,55 54,63" fill={COLORS.background} />
      <polygon points="62,26 120,32 120,66 75,55" fill={COLORS.pink} />
      <polygon points="0,72 54,63 43,120 0,120" fill={COLORS.lilac} />
      <polygon points="54,63 75,55 90,120 43,120" fill={COLORS.featureDark} />
      <polygon points="75,55 120,66 120,120 90,120" fill={COLORS.gold} />
    </g>
  );
}

function FlyingGoose({
  x,
  y,
  width,
  height,
  direction,
  fill,
  skyFill = COLORS.background,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: "up" | "right" | "down" | "left";
  fill: string;
  skyFill?: string;
}) {
  const points = {
    up: `${x},${y + height} ${x + width},${y + height} ${x + width / 2},${y}`,
    right: `${x},${y} ${x},${y + height} ${x + width},${y + height / 2}`,
    down: `${x},${y} ${x + width},${y} ${x + width / 2},${y + height}`,
    left: `${x + width},${y} ${x + width},${y + height} ${x},${y + height / 2}`,
  };
  return (
    <g stroke={COLORS.cream} strokeWidth="0.8">
      <rect x={x} y={y} width={width} height={height} fill={skyFill} />
      <polygon points={points[direction]} fill={fill} />
    </g>
  );
}

function PatternForSlug({ slug }: { slug: string }) {
  if (slug === "four-patch") {
    return <Grid size={2} cells={(x, y, size, row, column) => <Square x={x} y={y} size={size} fill={(row + column) % 2 ? COLORS.background : COLORS.feature} />} />;
  }
  if (slug === "nine-patch") {
    return <Grid size={3} cells={(x, y, size, row, column) => <Square x={x} y={y} size={size} fill={(row + column) % 2 ? COLORS.background : COLORS.feature} />} />;
  }
  if (slug === "sixteen-patch") {
    return <Grid size={4} cells={(x, y, size, row, column) => <Square x={x} y={y} size={size} fill={(row + column) % 2 ? COLORS.background : COLORS.feature} />} />;
  }
  if (slug === "rail-fence") {
    return <Grid size={2} cells={(x, y, size, row, column) => {
      const vertical = (row + column) % 2 === 1;
      const fills = [COLORS.feature, COLORS.accent, COLORS.background];
      return fills.map((fill, index) => <rect key={fill} x={vertical ? x + index * size / 3 : x} y={vertical ? y : y + index * size / 3} width={vertical ? size / 3 : size} height={vertical ? size : size / 3} fill={fill} stroke={COLORS.cream} strokeWidth="0.7" />);
    }} />;
  }
  if (slug === "log-cabin") return <LogCabin />;
  if (slug === "offset-log-cabin") return <LogCabin offset />;
  if (slug === "courthouse-steps") return <CourthouseSteps />;
  if (slug === "pinwheel") {
    const corners: Corner[] = ["ne", "se", "nw", "sw"];
    return <Grid size={2} cells={(x, y, size, row, column) => <Hst x={x} y={y} size={size} corner={corners[row * 2 + column]} />} />;
  }
  if (slug === "friendship-star") {
    const map: (Corner | "f" | "b")[] = ["b", "se", "b", "ne", "f", "sw", "b", "nw", "b"];
    return <Grid size={3} cells={(x, y, size, row, column) => {
      const token = map[row * 3 + column];
      return token === "f" || token === "b" ? <Square x={x} y={y} size={size} fill={token === "f" ? COLORS.feature : COLORS.background} /> : <Hst x={x} y={y} size={size} corner={token} />;
    }} />;
  }
  if (slug === "shoo-fly") {
    const map: (Corner | "f" | "b")[] = ["se", "b", "sw", "b", "f", "b", "ne", "b", "nw"];
    return <Grid size={3} cells={(x, y, size, row, column) => {
      const token = map[row * 3 + column];
      return token === "f" || token === "b" ? <Square x={x} y={y} size={size} fill={token === "f" ? COLORS.feature : COLORS.background} /> : <Hst x={x} y={y} size={size} corner={token} />;
    }} />;
  }
  if (slug === "hourglass-quartet") return <Grid size={2} cells={(x, y, size, row, column) => <Qst x={x} y={y} size={size} rotate={(row + column) % 2 > 0} />} />;
  if (slug === "ohio-star") {
    return <Grid size={3} cells={(x, y, size, row, column) => {
      const isCenter = row === 1 && column === 1;
      const isCorner = row !== 1 && column !== 1;
      return isCenter ? <Square x={x} y={y} size={size} fill={COLORS.feature} /> : isCorner ? <Square x={x} y={y} size={size} fill={COLORS.background} /> : <Qst x={x} y={y} size={size} rotate={(row + column) % 2 > 0} />;
    }} />;
  }
  if (slug === "churn-dash") {
    const cornerMap: Record<string, Corner> = { "0-0": "se", "0-2": "sw", "2-0": "ne", "2-2": "nw" };
    return <Grid size={3} cells={(x, y, size, row, column) => {
      const corner = cornerMap[`${row}-${column}`];
      if (corner) return <Hst x={x} y={y} size={size} corner={corner} />;
      if (row === 1 && column === 1) return <Square x={x} y={y} size={size} fill={COLORS.background} />;
      return <SplitCell x={x} y={y} size={size} direction={row === 1 ? "horizontal" : "vertical"} />;
    }} />;
  }
  if (slug === "sawtooth-star") return <SawtoothStar />;
  if (slug === "dutchmans-puzzle") {
    return (
      <g>
        <FlyingGoose x={0} y={0} width={30} height={60} direction="right" fill={COLORS.feature} />
        <FlyingGoose x={30} y={0} width={30} height={60} direction="right" fill={COLORS.accent} />
        <FlyingGoose x={60} y={0} width={60} height={30} direction="down" fill={COLORS.feature} />
        <FlyingGoose x={60} y={30} width={60} height={30} direction="down" fill={COLORS.accent} />
        <FlyingGoose x={60} y={60} width={30} height={60} direction="left" fill={COLORS.feature} />
        <FlyingGoose x={90} y={60} width={30} height={60} direction="left" fill={COLORS.accent} />
        <FlyingGoose x={0} y={60} width={60} height={30} direction="up" fill={COLORS.feature} />
        <FlyingGoose x={0} y={90} width={60} height={30} direction="up" fill={COLORS.accent} />
      </g>
    );
  }
  if (slug === "jacobs-ladder") {
    return <Grid size={3} cells={(x, y, size, row, column) => {
      if ((row + column) % 2 === 0) return <FourPatchCell x={x} y={y} size={size} reverse={row === 1} />;
      const corners: Corner[] = ["se", "sw", "ne", "nw"];
      const index = row === 0 ? column === 1 ? 0 : 1 : row === 1 ? column === 0 ? 2 : 3 : column === 1 ? 3 : 0;
      return <Hst x={x} y={y} size={size} corner={corners[index]} />;
    }} />;
  }
  if (slug === "snowball") return <Snowball />;
  if (slug === "bear-paw") return <BearPaw />;
  if (slug === "economy-block") {
    return (
      <g stroke={COLORS.cream} strokeWidth="0.8">
        <rect width="120" height="120" fill={COLORS.background} />
        <polygon points="60,0 120,60 60,120 0,60" fill={COLORS.accent} />
        <rect x="30" y="30" width="60" height="60" fill={COLORS.feature} />
      </g>
    );
  }
  if (slug === "maple-leaf") {
    const map: (Corner | "f" | "b" | "stem")[] = ["b", "sw", "se", "se", "f", "f", "ne", "f", "stem"];
    return <Grid size={3} cells={(x, y, size, row, column) => {
      const token = map[row * 3 + column];
      if (token === "stem") return <g><Square x={x} y={y} size={size} fill={COLORS.background} /><polygon points={`${x},${y + size} ${x + 8},${y + size} ${x + size},${y}`} fill={COLORS.feature} /></g>;
      if (token === "f" || token === "b") return <Square x={x} y={y} size={size} fill={token === "f" ? COLORS.feature : COLORS.background} />;
      return <Hst x={x} y={y} size={size} corner={token} />;
    }} />;
  }
  if (slug === "maple-star") {
    return (
      <g stroke={COLORS.cream} strokeWidth="0.8">
        <Square x={40} y={40} size={40} fill={COLORS.feature} />
        <g><Square x={0} y={0} size={20} fill={COLORS.accent} /><Square x={20} y={0} size={20} fill={COLORS.background} /><rect x={0} y={20} width={40} height={20} fill={COLORS.background} /></g>
        <g transform="rotate(90 60 60)"><Square x={0} y={0} size={20} fill={COLORS.accent} /><Square x={20} y={0} size={20} fill={COLORS.background} /><rect x={0} y={20} width={40} height={20} fill={COLORS.background} /></g>
        <g transform="rotate(180 60 60)"><Square x={0} y={0} size={20} fill={COLORS.accent} /><Square x={20} y={0} size={20} fill={COLORS.background} /><rect x={0} y={20} width={40} height={20} fill={COLORS.background} /></g>
        <g transform="rotate(270 60 60)"><Square x={0} y={0} size={20} fill={COLORS.accent} /><Square x={20} y={0} size={20} fill={COLORS.background} /><rect x={0} y={20} width={40} height={20} fill={COLORS.background} /></g>
        <g><rect x="40" y="0" width="40" height="40" fill={COLORS.background} /><polygon points="40,0 60,40 80,0" fill={COLORS.accent} /></g>
        <g transform="rotate(90 60 60)"><rect x="40" y="0" width="40" height="40" fill={COLORS.background} /><polygon points="40,0 60,40 80,0" fill={COLORS.accent} /></g>
        <g transform="rotate(180 60 60)"><rect x="40" y="0" width="40" height="40" fill={COLORS.background} /><polygon points="40,0 60,40 80,0" fill={COLORS.accent} /></g>
        <g transform="rotate(270 60 60)"><rect x="40" y="0" width="40" height="40" fill={COLORS.background} /><polygon points="40,0 60,40 80,0" fill={COLORS.accent} /></g>
      </g>
    );
  }
  if (slug === "turnstile") {
    const quadrant = <g stroke={COLORS.cream} strokeWidth="0.8"><rect width="60" height="30" fill={COLORS.background} /><polygon points="0,30 30,0 60,30" fill={COLORS.feature} /><rect y="30" width="60" height="30" fill={COLORS.accent} /></g>;
    return <g>{quadrant}<g transform="rotate(90 60 60)">{quadrant}</g><g transform="rotate(180 60 60)">{quadrant}</g><g transform="rotate(270 60 60)">{quadrant}</g></g>;
  }
  if (slug === "bow-tie") {
    return (
      <g stroke={COLORS.cream} strokeWidth="0.8">
        <Square x={0} y={0} size={60} fill={COLORS.feature} />
        <Square x={60} y={60} size={60} fill={COLORS.feature} />
        <Square x={60} y={0} size={60} fill={COLORS.background} />
        <polygon points="60,60 90,60 60,30" fill={COLORS.feature} />
        <Square x={0} y={60} size={60} fill={COLORS.background} />
        <polygon points="60,60 30,60 60,90" fill={COLORS.feature} />
      </g>
    );
  }
  if (slug === "pinwheel-star") {
    const map: (Corner | "b")[] = ["b", "ne", "nw", "b", "se", "ne", "se", "sw", "ne", "nw", "sw", "nw", "b", "se", "sw", "b"];
    return <Grid size={4} cells={(x, y, size, row, column) => {
      const token = map[row * 4 + column];
      return token === "b" ? <Square x={x} y={y} size={size} fill={COLORS.background} /> : <Hst x={x} y={y} size={size} corner={token} />;
    }} />;
  }
  if (slug === "basket") {
    return (
      <g stroke={COLORS.cream} strokeWidth="0.9">
        <rect width="120" height="120" fill={COLORS.background} />
        <polygon points="5,40 80,115 5,115" fill={COLORS.feature} />
        <path d="M58 10 110 62" stroke={COLORS.accent} strokeWidth="15" />
        <path d="M58 10 110 62" stroke={COLORS.cream} strokeWidth="0.9" />
        <path d="M40 5v110M80 5v110M5 40h110M5 80h110" fill="none" opacity="0.7" />
      </g>
    );
  }
  if (slug === "heart") {
    return (
      <g stroke={COLORS.cream} strokeWidth="0.8">
        <rect width="120" height="120" fill={COLORS.feature} />
        <polygon points="0,0 30,0 0,30" fill={COLORS.background} />
        <polygon points="30,0 60,0 60,30" fill={COLORS.background} />
        <polygon points="60,0 90,0 60,30" fill={COLORS.background} />
        <polygon points="90,0 120,0 120,30" fill={COLORS.background} />
        <polygon points="0,60 60,120 0,120" fill={COLORS.background} />
        <polygon points="120,60 60,120 120,120" fill={COLORS.background} />
        <path d="M60 0v120" />
      </g>
    );
  }
  if (slug === "annies-choice") {
    const map: Corner[] = ["ne", "nw", "sw", "se", "nw", "sw", "ne", "se", "ne", "se", "nw", "sw", "sw", "se", "ne", "nw"];
    return <Grid size={4} cells={(x, y, size, row, column) => <Hst x={x} y={y} size={size} corner={map[row * 4 + column]} />} />;
  }
  if (slug === "butterfly-cross") {
    const corner = (x: number, y: number, rotate: number) => <g transform={`translate(${x} ${y}) rotate(${rotate} 25 25)`}><Hst x={0} y={0} size={25} corner="se" /><Square x={25} y={0} size={25} fill={COLORS.background} /><Square x={0} y={25} size={25} fill={COLORS.feature} /><Hst x={25} y={25} size={25} corner="nw" /></g>;
    return <g>{corner(0, 0, 0)}{corner(70, 0, 90)}{corner(70, 70, 180)}{corner(0, 70, 270)}<rect x="50" width="20" height="120" fill={COLORS.background} stroke={COLORS.cream} /><rect y="50" width="120" height="20" fill={COLORS.background} stroke={COLORS.cream} /><rect x="50" y="50" width="20" height="20" fill={COLORS.accent} stroke={COLORS.cream} /></g>;
  }
  if (slug === "disappearing-nine-patch") {
    return <g stroke={COLORS.cream} strokeWidth="0.9">
      <rect width="60" height="60" fill={COLORS.feature} /><rect x="60" width="30" height="60" fill={COLORS.gold} /><rect x="90" width="30" height="60" fill={COLORS.background} />
      <rect y="60" width="60" height="30" fill={COLORS.accent} /><rect x="60" y="60" width="30" height="30" fill={COLORS.pink} /><rect x="90" y="60" width="30" height="30" fill={COLORS.feature} />
      <rect y="90" width="60" height="30" fill={COLORS.background} /><rect x="60" y="90" width="30" height="30" fill={COLORS.gold} /><rect x="90" y="90" width="30" height="30" fill={COLORS.navy} />
    </g>;
  }
  if (slug === "modern-plus") return <Grid size={5} cells={(x, y, size, row, column) => <Square x={x} y={y} size={size} fill={row === 2 || column === 2 ? COLORS.feature : COLORS.background} />} />;
  if (slug === "hst-chevron") {
    return <Grid size={4} cells={(x, y, size, row, column) => <Hst x={x} y={y} size={size} corner={(column % 2 === 0 ? (row % 2 === 0 ? "se" : "ne") : (row % 2 === 0 ? "sw" : "nw")) as Corner} />} />;
  }
  if (slug === "wonky-star") return <WonkyStar />;
  if (slug === "stacked-coins") {
    return <g stroke={COLORS.cream} strokeWidth="0.8">
      <rect width="12" height="120" fill={COLORS.background} /><rect x="12" width="42" height="30" fill={COLORS.feature} /><rect x="12" y="30" width="42" height="30" fill={COLORS.gold} /><rect x="12" y="60" width="42" height="30" fill={COLORS.accent} /><rect x="12" y="90" width="42" height="30" fill={COLORS.lilac} />
      <rect x="54" width="12" height="120" fill={COLORS.background} /><rect x="66" width="42" height="30" fill={COLORS.pink} /><rect x="66" y="30" width="42" height="30" fill={COLORS.navy} /><rect x="66" y="60" width="42" height="30" fill={COLORS.feature} /><rect x="66" y="90" width="42" height="30" fill={COLORS.gold} /><rect x="108" width="12" height="120" fill={COLORS.background} />
    </g>;
  }
  if (slug === "minimalist-cross") {
    return <g stroke={COLORS.cream} strokeWidth="0.8"><rect width="120" height="120" fill={COLORS.background} /><rect x="50" width="20" height="120" fill={COLORS.feature} /><rect y="50" width="120" height="20" fill={COLORS.feature} /></g>;
  }
  if (slug === "improv-mosaic") return <ImprovMosaic />;
  return <Grid size={3} cells={(x, y, size, row, column) => <Square x={x} y={y} size={size} fill={(row + column) % 2 ? COLORS.background : COLORS.feature} />} />;
}

export function BlockDiagram({
  slug,
  name,
  className = "",
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  return (
    <svg className={`${styles.blockSvg} ${className}`} viewBox="0 0 120 120" role="img" aria-label={`${name} quilt block diagram`}>
      <PatternForSlug slug={slug} />
      <rect x="0.6" y="0.6" width="118.8" height="118.8" fill="none" stroke={COLORS.line} strokeWidth="1.2" />
    </svg>
  );
}

function UnitBuild({ unitType, slug }: { unitType: string; slug: string }) {
  const lower = unitType.toLowerCase();
  if (lower.includes("qst") || lower.includes("hourglass")) {
    return <g><Qst x={70} y={25} size={48} /><Hst x={4} y={12} size={36} corner="se" /><Hst x={4} y={62} size={36} corner="nw" /><path d="M46 50h16" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow)" /></g>;
  }
  if (lower.includes("hst")) {
    return <g><Square x={4} y={20} size={42} fill={COLORS.feature} /><path d="M4 62 46 20" stroke={COLORS.cream} strokeWidth="2" strokeDasharray="3 3" /><path d="M51 50h15" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow)" /><Hst x={72} y={20} size={42} corner="se" /></g>;
  }
  if (lower.includes("flying") || lower.includes("geese")) {
    return <g><rect x="3" y="31" width="54" height="30" fill={COLORS.feature} /><Square x={3} y={31} size={30} fill={COLORS.background} /><path d="M3 61 33 31" stroke={COLORS.featureDark} strokeWidth="1.5" strokeDasharray="3 2" /><path d="M61 46h14" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow)" /><rect x="80" y="31" width="38" height="30" fill={COLORS.background} /><polygon points="80,61 99,31 118,61" fill={COLORS.feature} /></g>;
  }

  if (["four-patch", "nine-patch", "sixteen-patch", "modern-plus", "minimalist-cross"].includes(slug)) {
    return (
      <g>
        <Square x={3} y={18} size={26} fill={COLORS.feature} />
        <Square x={31} y={18} size={26} fill={COLORS.background} stroke={COLORS.line} />
        <Square x={3} y={46} size={26} fill={COLORS.background} stroke={COLORS.line} />
        <Square x={31} y={46} size={26} fill={COLORS.feature} />
        <path d="M62 45h12" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow)" />
        <g transform="translate(78 12) scale(.58)"><PatternForSlug slug={slug} /><rect x=".6" y=".6" width="118.8" height="118.8" fill="none" stroke={COLORS.line} strokeWidth="1.5" /></g>
      </g>
    );
  }

  if (["log-cabin", "offset-log-cabin", "courthouse-steps"].includes(slug)) {
    return (
      <g>
        <Square x={4} y={30} size={30} fill={COLORS.accent} />
        <rect x="34" y="30" width="14" height="30" fill={COLORS.feature} stroke={COLORS.cream} />
        <rect x="4" y="60" width="44" height="12" fill={COLORS.background} stroke={COLORS.cream} />
        <path d="M53 48h12" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow)" />
        <g transform="translate(70 10) scale(.6)"><PatternForSlug slug={slug} /><rect x=".6" y=".6" width="118.8" height="118.8" fill="none" stroke={COLORS.line} strokeWidth="1.5" /></g>
      </g>
    );
  }

  if (slug === "snowball") {
    return (
      <g>
        <Square x={4} y={18} size={54} fill={COLORS.feature} />
        <Square x={4} y={18} size={22} fill={COLORS.background} />
        <path d="M4 40 26 18" stroke={COLORS.line} strokeWidth="1.5" strokeDasharray="3 2" />
        <path d="M62 45h12" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow)" />
        <g transform="translate(78 16) scale(.5)"><Snowball /><rect x=".6" y=".6" width="118.8" height="118.8" fill="none" stroke={COLORS.line} strokeWidth="1.5" /></g>
      </g>
    );
  }

  if (slug === "disappearing-nine-patch") {
    return (
      <g>
        <g transform="translate(3 18) scale(.45)"><PatternForSlug slug="nine-patch" /><path d="M60 0v120M0 60h120" stroke={COLORS.line} strokeWidth="2" strokeDasharray="4 3" /></g>
        <path d="M62 45h12" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow)" />
        <g transform="translate(78 16) scale(.5)"><PatternForSlug slug={slug} /><rect x=".6" y=".6" width="118.8" height="118.8" fill="none" stroke={COLORS.line} strokeWidth="1.5" /></g>
      </g>
    );
  }

  if (["wonky-star", "improv-mosaic"].includes(slug)) {
    return (
      <g>
        <polygon points="3,22 30,12 22,48" fill={COLORS.feature} />
        <polygon points="7,70 22,48 39,75" fill={COLORS.gold} />
        <polygon points="30,12 54,30 22,48" fill={COLORS.accent} />
        <path d="M59 45h12" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow)" />
        <g transform="translate(76 12) scale(.58)"><PatternForSlug slug={slug} /><rect x=".6" y=".6" width="118.8" height="118.8" fill="none" stroke={COLORS.line} strokeWidth="1.5" /></g>
      </g>
    );
  }

  return <g><rect x="3" y="24" width="24" height="52" fill={COLORS.feature} /><rect x="31" y="24" width="24" height="52" fill={COLORS.background} stroke={COLORS.line} /><rect x="59" y="24" width="24" height="52" fill={COLORS.accent} /><path d="M88 50h14" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow)" /><g transform="translate(104 28) scale(.42)"><PatternForSlug slug={slug} /></g></g>;
}

export function BlockStepDiagram({
  slug,
  name,
  unitType,
  stage,
  diagram,
}: {
  slug: string;
  name: string;
  unitType: string;
  stage: number;
  diagram?: BlockStepDiagramKind;
}) {
  if (diagram) {
    const gooseColors = slug === "sawtooth-star"
      ? { body: COLORS.background, sky: COLORS.feature }
      : slug === "maple-star"
        ? { body: COLORS.background, sky: COLORS.accent }
        : { body: COLORS.feature, sky: COLORS.background };
    const artwork = (() => {
      if (diagram === "cut-pieces") return <g><rect x="4" y="12" width="34" height="48" fill={COLORS.feature} /><text x="21" y="39" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">A</text><rect x="43" y="20" width="54" height="32" fill={COLORS.background} stroke={COLORS.line} /><text x="70" y="39" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">B</text><rect x="102" y="8" width="30" height="56" fill={COLORS.accent} /><text x="117" y="39" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">C</text><path d="M4 68h128" stroke={COLORS.line} strokeDasharray="4 3" /><text x="68" y="82" textAnchor="middle" fill={COLORS.line} fontSize="7">COUNT AND LABEL BEFORE SEWING</text></g>;
      if (diagram === "hst-mark") return <g><rect x="12" y="12" width="66" height="66" fill={COLORS.feature} /><rect x="18" y="18" width="66" height="66" fill={COLORS.background} fillOpacity="0.78" stroke={COLORS.line} /><path d="M18 84 84 18" stroke={COLORS.featureDark} strokeWidth="2" /><path d="M13 79 79 13M23 89 89 23" stroke={COLORS.accent} strokeWidth="1.4" strokeDasharray="4 3" /><text x="106" y="42" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">SEW ¼″</text><text x="106" y="54" textAnchor="middle" fill={COLORS.line} fontSize="8">BOTH SIDES</text></g>;
      if (diagram === "hst-cut") return <g><rect x="5" y="16" width="56" height="56" fill={COLORS.feature} /><path d="M5 72 61 16" stroke="white" strokeWidth="2" strokeDasharray="4 3" /><path d="M67 44h15" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow-explicit)" /><Hst x={88} y={10} size={42} corner="se" /><Hst x={88} y={54} size={42} corner="nw" /></g>;
      if (diagram === "hst-trim") return <g><Hst x={32} y={8} size={74} corner="se" /><rect x="27" y="3" width="84" height="84" fill="none" stroke={COLORS.accent} strokeWidth="2" /><path d="M27 87 111 3" stroke={COLORS.accent} strokeDasharray="3 3" /><text x="69" y="101" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">45° LINE ON THE SEAM</text></g>;
      if (diagram === "hst-eight") return <g><rect x="4" y="10" width="72" height="72" fill={COLORS.feature} /><path d="M4 10 76 82M76 10 4 82M40 10v72M4 46h72" stroke="white" strokeWidth="1.5" strokeDasharray="4 2" /><path d="M81 46h10" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow-explicit)" />{Array.from({ length: 8 }, (_, i) => <g key={i} transform={`translate(${96 + (i % 2) * 19} ${7 + Math.floor(i / 2) * 20}) scale(.15)`}><Hst x={0} y={0} size={120} corner={i % 2 ? "nw" : "se"} /></g>)}</g>;
      if (diagram === "flying-geese-mark") return <g><rect x="8" y="25" width="92" height="46" fill={gooseColors.body} stroke={COLORS.line} /><Square x={8} y={25} size={46} fill={gooseColors.sky} /><path d="M8 71 54 25" stroke={COLORS.cream} strokeWidth="2" strokeDasharray="4 3" /><path d="M58 48h15" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow-explicit)" /><text x="112" y="43" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">SEW</text><text x="112" y="55" textAnchor="middle" fill={COLORS.line} fontSize="8">THEN CHECK</text><text x="112" y="67" textAnchor="middle" fill={COLORS.line} fontSize="8">BEFORE TRIM</text></g>;
      if (diagram === "flying-geese-unit") return <g><rect x="18" y="24" width="104" height="52" fill={gooseColors.sky} stroke={COLORS.line} /><polygon points="18,76 70,24 122,76" fill={gooseColors.body} /><path d="M70 18v64" stroke={COLORS.accent} strokeDasharray="3 3" /><text x="70" y="95" textAnchor="middle" fill={COLORS.line} fontSize="9" fontWeight="800">BODY POINT · ¼″ FROM RAW EDGE</text></g>;
      if (diagram === "strip-set") return <g>{[COLORS.feature, COLORS.accent, COLORS.background].map((fill, i) => <rect key={fill} x="8" y={13 + i * 25} width="124" height="25" fill={fill} stroke={COLORS.cream} />)}<path d="M8 7h124M8 4v6M132 4v6" stroke={COLORS.line} /><text x="70" y="101" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">PRESS · MEASURE · KEEP STRAIGHT</text></g>;
      if (diagram === "subcut") return <g>{[COLORS.feature, COLORS.accent, COLORS.background].map((fill, i) => <rect key={fill} x="8" y={13 + i * 22} width="124" height="22" fill={fill} stroke={COLORS.cream} />)}{[8,39,70,101,132].map((x) => <path key={x} d={`M${x} 9v72`} stroke={COLORS.line} strokeWidth="1.4" strokeDasharray="4 2" />)}<text x="70" y="97" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">SQUARE ONE END · CUT EQUAL UNITS</text></g>;
      if (diagram === "log-rounds") {
        const upto = stage === 1 ? 2 : stage === 2 ? 4 : stage === 3 ? 10 : 12;
        return <g transform="translate(25 -3) scale(.75)"><LogCabin upto={upto} numbered /></g>;
      }
      if (diagram === "square-in-square") return <g><rect x="25" y="4" width="88" height="88" fill={COLORS.background} stroke={COLORS.line} /><polygon points="69,4 113,48 69,92 25,48" fill={COLORS.accent} /><rect x="47" y="26" width="44" height="44" fill={COLORS.feature} /><path d="M19 48h100" stroke={COLORS.accent} strokeDasharray="3 3" /><text x="69" y="105" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">CENTER OPPOSITE PAIRS</text></g>;
      if (diagram === "stem-unit") return <g><rect x="34" y="5" width="72" height="72" fill={COLORS.background} stroke={COLORS.line} /><polygon points="34,77 48,77 106,5 92,5" fill={COLORS.feature} /><path d="M27 84 113 -2" stroke={COLORS.accent} strokeDasharray="3 3" /><text x="70" y="98" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">CENTER STEM · THEN TRIM</text></g>;
      if (diagram === "snowball-corner") return <g><rect x="26" y="7" width="80" height="80" fill={COLORS.feature} /><Square x={26} y={7} size={38} fill={COLORS.background} /><path d="M26 45 64 7" stroke={COLORS.line} strokeWidth="2" strokeDasharray="4 3" /><path d="M29 48 67 10" stroke={COLORS.accent} strokeWidth="1.5" /><text x="69" y="102" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">FLIP TO CHECK · THEN TRIM ¼″</text></g>;
      if (diagram === "heart-halves") return <g><rect x="12" y="8" width="50" height="76" fill={COLORS.feature} /><rect x="78" y="8" width="50" height="76" fill={COLORS.feature} /><polygon points="12,8 37,8 12,33" fill={COLORS.background} /><polygon points="62,8 37,8 62,33" fill={COLORS.background} /><polygon points="12,46 62,84 12,84" fill={COLORS.background} /><polygon points="78,8 103,8 78,33" fill={COLORS.background} /><polygon points="128,8 103,8 128,33" fill={COLORS.background} /><polygon points="128,46 78,84 128,84" fill={COLORS.background} /><path d="M70 2v88" stroke={COLORS.accent} strokeDasharray="4 3" /><text x="70" y="103" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">MAKE MIRROR IMAGES</text></g>;
      if (diagram === "corner-units") return <g><g transform="translate(8 7) scale(.62)"><PatternForSlug slug={slug} /></g><path d="M88 48h14" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#step-arrow-explicit)" /><rect x="108" y="24" width="24" height="24" fill={COLORS.feature} /><rect x="108" y="50" width="24" height="24" fill={COLORS.background} stroke={COLORS.line} /><text x="70" y="101" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">MAKE MATCHING SUBUNITS FIRST</text></g>;
      if (diagram === "quadrants") return <g><g transform="translate(28 -2) scale(.7)"><PatternForSlug slug={slug} /></g><path d="M70 0v84M28 42h84" stroke={COLORS.accent} strokeWidth="1.5" strokeDasharray="4 3" /><text x="70" y="101" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">ROTATE WHOLE QUADRANTS</text></g>;
      if (diagram === "layout") return <g><g transform="translate(28 -2) scale(.7)"><PatternForSlug slug={slug} /><rect x=".6" y=".6" width="118.8" height="118.8" fill="none" stroke={COLORS.line} strokeWidth="1.5" /></g><text x="70" y="101" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">CHECK EVERY UNIT BEFORE SEWING</text></g>;
      if (diagram === "rows") return <g><g transform="translate(28 -2) scale(.7)"><PatternForSlug slug={slug} /><rect x=".6" y=".6" width="118.8" height="118.8" fill="none" stroke={COLORS.line} strokeWidth="1.5" /></g><text x="70" y="101" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">FOLLOW THIS MAP · JOIN IN ROWS</text></g>;
      return <g><g transform="translate(28 -2) scale(.7)"><PatternForSlug slug={slug} /><rect x=".6" y=".6" width="118.8" height="118.8" fill="none" stroke={COLORS.line} strokeWidth="1.5" /></g><text x="70" y="101" textAnchor="middle" fill={COLORS.line} fontSize="8" fontWeight="700">{name.toUpperCase()} · FINAL RAW SIZE</text></g>;
    })();

    return (
      <svg className={styles.stepSvg} viewBox="0 0 140 108" role="img" aria-label={`${name}: ${diagram.replaceAll("-", " ")} diagram`}>
        <defs><marker id="step-arrow-explicit" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 5 2.5 0 5Z" fill={COLORS.line} /></marker></defs>
        {artwork}
      </svg>
    );
  }

  if (stage === 0) {
    return (
      <svg className={styles.stepSvg} viewBox="0 0 120 90" aria-hidden="true">
        <rect x="5" y="10" width="40" height="40" rx="2" fill={COLORS.feature} />
        <rect x="31" y="34" width="48" height="34" rx="2" fill={COLORS.background} stroke={COLORS.line} />
        <rect x="71" y="11" width="38" height="64" rx="2" fill={COLORS.accent} />
        <path d="M5 5h40M5 3v5M45 3v5M114 11v64M111 11h6M111 75h6" stroke={COLORS.line} strokeWidth="1" />
        <path d="M12 81h95" stroke={COLORS.featureDark} strokeDasharray="4 3" />
      </svg>
    );
  }
  if (stage === 1) {
    return (
      <svg className={styles.stepSvg} viewBox="0 0 120 90" aria-hidden="true">
        <defs><marker id="step-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 5 2.5 0 5Z" fill={COLORS.line} /></marker></defs>
        <UnitBuild unitType={unitType} slug={slug} />
      </svg>
    );
  }
  return (
    <svg className={styles.stepSvg} viewBox="0 0 140 140" aria-hidden="true">
      <g transform={stage === 2 ? "translate(16 16) scale(.9)" : "translate(10 10)"} opacity={stage === 2 ? 0.78 : 1}>
        <PatternForSlug slug={slug} />
        <rect x="0.6" y="0.6" width="118.8" height="118.8" fill="none" stroke={COLORS.line} strokeWidth="1.2" />
      </g>
      {stage === 3 ? <text x="70" y="137" textAnchor="middle" fontSize="7" fill={COLORS.line}>{name} · square to final raw size</text> : null}
    </svg>
  );
}

export function SeamMathDiagram() {
  return (
    <svg className={styles.wideDiagram} viewBox="0 0 640 180" role="img" aria-label="Finished versus unfinished square diagram">
      <g transform="translate(28 22)">
        <rect width="132" height="132" rx="4" fill={COLORS.feature} />
        <path d="M8 0v132M124 0v132M0 8h132M0 124h132" stroke={COLORS.cream} strokeDasharray="5 4" />
        <text x="66" y="67" textAnchor="middle" fill="white" fontWeight="700" fontSize="20">CUT</text>
        <text x="66" y="88" textAnchor="middle" fill="white" fontSize="12">5″</text>
      </g>
      <path d="M185 88h70" stroke={COLORS.line} strokeWidth="2" markerEnd="url(#seam-arrow)" />
      <defs><marker id="seam-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7Z" fill={COLORS.line} /></marker></defs>
      <g transform="translate(280 22)">
        <rect width="132" height="132" rx="4" fill={COLORS.background} stroke={COLORS.line} />
        <rect x="8" y="8" width="116" height="116" fill={COLORS.accent} />
        <text x="66" y="61" textAnchor="middle" fill="white" fontWeight="700" fontSize="17">FINISHED</text>
        <text x="66" y="84" textAnchor="middle" fill="white" fontSize="12">4½″</text>
        <text x="66" y="146" textAnchor="middle" fill={COLORS.line} fontSize="10">¼″ disappears on every side</text>
      </g>
      <g transform="translate(462 34)" fill={COLORS.line}>
        <text x="0" y="15" fontSize="12" fontWeight="700">THE ALWAYS RULE</text>
        <text x="0" y="47" fontSize="18" fontWeight="700">CUT = FINISH + ½″</text>
        <text x="0" y="73" fontSize="11">for ordinary squares</text>
        <text x="0" y="91" fontSize="11">and rectangles enclosed</text>
        <text x="0" y="109" fontSize="11">by ¼″ seams</text>
      </g>
    </svg>
  );
}

export function PrecutNestingDiagram() {
  return (
    <svg className={styles.wideDiagram} viewBox="0 0 640 220" role="img" aria-label="One ten-inch square subdivided into five-inch and two-and-a-half-inch squares">
      <g transform="translate(25 20)"><rect width="180" height="180" fill={COLORS.feature} /><text x="90" y="86" textAnchor="middle" fill="white" fontWeight="700" fontSize="20">10″</text><text x="90" y="108" textAnchor="middle" fill="white" fontSize="11">one large square</text></g>
      <text x="230" y="112" fill={COLORS.line} fontSize="22">=</text>
      <g transform="translate(260 20)">{[0,1,2,3].map((i) => <rect key={i} x={(i%2)*90} y={Math.floor(i/2)*90} width="90" height="90" fill={i%2 ? COLORS.gold : COLORS.accent} stroke={COLORS.cream} />)}<text x="90" y="207" textAnchor="middle" fill={COLORS.line} fontSize="11">4 × 5″ by cutting area</text></g>
      <text x="465" y="112" fill={COLORS.line} fontSize="22">=</text>
      <g transform="translate(500 20)">{Array.from({length:16},(_,i)=><rect key={i} x={(i%4)*45} y={Math.floor(i/4)*45} width="45" height="45" fill={[COLORS.navy,COLORS.lilac,COLORS.pink,COLORS.gold][i%4]} stroke={COLORS.cream} />)}<text x="90" y="207" textAnchor="middle" fill={COLORS.line} fontSize="11">16 × 2½″ by cutting area</text></g>
    </svg>
  );
}

export function HstMethodDiagram({ method }: { method: "two" | "four" | "eight" }) {
  if (method === "four") {
    return <svg className={styles.wideDiagram} viewBox="0 0 420 180" role="img" aria-label="Four at a time HST cutting diagram"><rect x="28" y="24" width="132" height="132" fill={COLORS.feature} /><rect x="34" y="30" width="120" height="120" fill="none" stroke={COLORS.cream} strokeDasharray="5 4" /><path d="M28 24 160 156M160 24 28 156" stroke={COLORS.line} strokeWidth="2" /><path d="M190 90h42" stroke={COLORS.line} strokeWidth="2" /><g transform="translate(252 20)"><Hst x={0} y={0} size={64} corner="se" /><Hst x={68} y={0} size={64} corner="sw" /><Hst x={0} y={68} size={64} corner="ne" /><Hst x={68} y={68} size={64} corner="nw" /></g></svg>;
  }
  if (method === "eight") {
    return <svg className={styles.wideDiagram} viewBox="0 0 420 180" role="img" aria-label="Eight at a time HST cutting diagram"><rect x="25" y="20" width="140" height="140" fill={COLORS.accent} /><path d="M25 20 165 160M165 20 25 160M95 20v140M25 90h140" stroke={COLORS.cream} strokeWidth="2" /><path d="M31 20 171 160M19 20 159 160M159 20 19 160M171 20 31 160" stroke={COLORS.line} strokeDasharray="5 3" /><text x="245" y="75" fill={COLORS.line} fontWeight="700" fontSize="16">8 matching HSTs</text><text x="245" y="102" fill={COLORS.line} fontSize="12">start with two equal squares</text><text x="245" y="122" fill={COLORS.line} fontSize="12">→ trim every unit to F + ½″</text></svg>;
  }
  return <svg className={styles.wideDiagram} viewBox="0 0 420 180" role="img" aria-label="Two at a time HST cutting diagram"><rect x="30" y="25" width="130" height="130" fill={COLORS.feature} /><path d="M30 155 160 25" stroke={COLORS.cream} strokeWidth="2" /><path d="M23 148 153 18M37 162 167 32" stroke={COLORS.line} strokeDasharray="5 4" /><path d="M190 90h42" stroke={COLORS.line} strokeWidth="2" /><Hst x={260} y={25} size={64} corner="se" /><Hst x={328} y={91} size={64} corner="nw" /></svg>;
}

export function RulerCutDiagram({ stage }: { stage: 1 | 2 | 3 | 4 }) {
  const cuts = stage === 1 ? [] : stage === 2 ? [95, 145, 195, 245] : stage === 3 ? [55, 105, 155, 205, 255] : [55, 105, 155, 205, 255, 305];
  return (
    <svg className={styles.wideDiagram} viewBox="0 0 520 230" role="img" aria-label={`Slotted quilting ruler cutting workflow, stage ${stage}`}>
      <rect x="35" y="55" width="420" height="110" rx="4" fill={COLORS.feature} opacity="0.88" />
      <path d="M35 75h420M35 95h420M35 115h420M35 135h420M35 155h420" stroke={COLORS.cream} opacity="0.45" />
      <g opacity="0.76"><rect x="65" y="30" width="360" height="160" rx="5" fill="#d7edf0" stroke={COLORS.accent} strokeWidth="2" />{Array.from({length:8},(_,i)=><path key={i} d={`M${75+i*45} 42v136`} stroke={COLORS.accent} strokeWidth="4" strokeLinecap="round" />)}</g>
      {cuts.map((x) => <path key={x} d={`M${x} 38v145`} stroke={COLORS.featureDark} strokeWidth="3" />)}
      <path d="M35 198h420" stroke={COLORS.line} /><path d="M35 193v10M455 193v10" stroke={COLORS.line} />
      <text x="245" y="219" textAnchor="middle" fill={COLORS.line} fontSize="11">{stage === 1 ? "align folded fabric and square the leading edge" : stage === 2 ? "cut repeated strip widths without moving the ruler" : stage === 3 ? "rotate strip set 90° and align a clean edge" : "subcut squares or rectangles through repeated slots"}</text>
    </svg>
  );
}

export function RulerProfileDiagram({
  kind,
}: {
  kind: "stripology-xl" | "creative-grids-612" | "fiskars-624";
}) {
  if (kind === "stripology-xl") {
    return (
      <svg className={styles.wideDiagram} viewBox="0 0 520 230" role="img" aria-label="Illustration of a Stripology XL slotted quilting ruler measuring approximately 22 by 17 and three-quarter inches">
        <rect x="54" y="34" width="412" height="158" rx="5" fill="#d7edf0" fillOpacity="0.82" stroke={COLORS.accent} strokeWidth="2" />
        {Array.from({ length: 21 }, (_, index) => (
          <path key={index} d={`M${66 + index * 19.2} 48v128`} stroke={index % 5 === 0 ? COLORS.navy : COLORS.accent} strokeWidth={index % 5 === 0 ? 3.2 : 1.7} strokeLinecap="round" opacity={index % 5 === 0 ? 0.9 : 0.62} />
        ))}
        {Array.from({ length: 7 }, (_, index) => (
          <path key={index} d={`M66 ${58 + index * 18}h384`} stroke={COLORS.accent} strokeWidth="0.8" opacity="0.45" />
        ))}
        <path d="M54 207h412M54 202v10M466 202v10" stroke={COLORS.line} />
        <text x="260" y="224" textAnchor="middle" fill={COLORS.line} fontSize="11">22″ wide · 17¾″ tall · 14¾″ cutting slots</text>
        <text x="260" y="116" textAnchor="middle" fill={COLORS.navy} fontSize="17" fontWeight="700">BATCH CUTTER</text>
        <text x="260" y="136" textAnchor="middle" fill={COLORS.navy} fontSize="11">square · strip · subcut</text>
      </svg>
    );
  }

  const isLong = kind === "fiskars-624";
  const x = isLong ? 35 : 104;
  const y = isLong ? 70 : 47;
  const width = isLong ? 450 : 312;
  const height = isLong ? 112 : 162;
  const columns = isLong ? 24 : 12;
  const rows = 6;
  const label = isLong ? "FISKARS 6″ × 24″" : "CREATIVE GRIDS 6½″ × 12½″";
  const detail = isLong ? "long WOF reference edge" : "trim · subcut · center";

  return (
    <svg className={styles.wideDiagram} viewBox="0 0 520 230" role="img" aria-label={`Illustration of the ${label} quilting ruler`}>
      <rect x={x} y={y} width={width} height={height} rx="4" fill={isLong ? "#edf2f0" : "#e6eee8"} fillOpacity="0.88" stroke={COLORS.line} strokeWidth="2" />
      {Array.from({ length: columns - 1 }, (_, index) => (
        <path key={`v-${index}`} d={`M${x + ((index + 1) * width) / columns} ${y}v${height}`} stroke={COLORS.line} strokeWidth={index % 2 === 0 ? 0.8 : 0.45} opacity="0.48" />
      ))}
      {Array.from({ length: rows - 1 }, (_, index) => (
        <path key={`h-${index}`} d={`M${x} ${y + ((index + 1) * height) / rows}h${width}`} stroke={COLORS.line} strokeWidth="0.65" opacity="0.48" />
      ))}
      <path d={`M${x} ${y + height}L${x + Math.min(width, height)} ${y}`} stroke={isLong ? COLORS.feature : COLORS.accent} strokeWidth="2" opacity="0.85" />
      <path d={`M${x + width} ${y + height}L${x + width - Math.min(width, height) / Math.sqrt(3)} ${y}`} stroke={COLORS.gold} strokeWidth="2" opacity="0.9" />
      {!isLong ? <path d={`M${x + width / 2} ${y}v${height}M${x} ${y + height / 2}h${width}`} stroke={COLORS.feature} strokeWidth="1.6" strokeDasharray="4 3" opacity="0.82" /> : null}
      <text x="260" y={isLong ? 120 : 120} textAnchor="middle" fill={COLORS.navy} fontSize="15" fontWeight="700">{label}</text>
      <text x="260" y={isLong ? 140 : 141} textAnchor="middle" fill={COLORS.navy} fontSize="10">{detail}</text>
      <text x="260" y="224" textAnchor="middle" fill={COLORS.line} fontSize="11">{isLong ? "30° · 45° · 60° angle guides" : "⅛″ + ¼″ increments · 30°/45°/60° guides"}</text>
    </svg>
  );
}

type RulerJob =
  | "wof-strips"
  | "subcut-strips"
  | "strip-set"
  | "ten-square"
  | "square-block"
  | "diamonds";

function SlottedOverlay({ x = 40, y = 28, width = 340, height = 130 }: { x?: number; y?: number; width?: number; height?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="4" fill="#d7edf0" fillOpacity="0.62" stroke={COLORS.accent} strokeWidth="1.5" />
      {Array.from({ length: 9 }, (_, index) => (
        <path key={index} d={`M${x + 14 + index * ((width - 28) / 8)} ${y + 10}v${height - 20}`} stroke={index === 0 ? COLORS.featureDark : COLORS.accent} strokeWidth={index === 0 ? 3 : 2} strokeLinecap="round" opacity="0.8" />
      ))}
      <path d={`M${x + 8} ${y + height - 25}h${width - 16}`} stroke={COLORS.accent} strokeWidth="1" opacity="0.75" />
    </g>
  );
}

export function RulerJobDiagram({ job }: { job: RulerJob }) {
  if (job === "subcut-strips") {
    return (
      <svg className={styles.wideDiagram} viewBox="0 0 420 190" role="img" aria-label="Several fabric strips aligned under a slotted ruler and crosscut into equal rectangles">
        {[0, 1, 2].map((row) => <rect key={row} x="25" y={48 + row * 34} width="370" height="29" fill={[COLORS.feature, COLORS.accent, COLORS.gold][row]} opacity="0.92" />)}
        <SlottedOverlay x={44} y={25} width={320} height={142} />
        {[102, 180, 258, 336].map((x) => <path key={x} d={`M${x} 35v122`} stroke={COLORS.navy} strokeWidth="3" />)}
        <text x="210" y="181" textAnchor="middle" fill={COLORS.line} fontSize="11">clean ends at 0 · cut the ticket left to right</text>
      </svg>
    );
  }

  if (job === "strip-set") {
    return (
      <svg className={styles.wideDiagram} viewBox="0 0 420 190" role="img" aria-label="A three-color sewn strip set aligned by a seam and crosscut through repeated ruler slots">
        <g transform="translate(24 43)">
          <rect width="372" height="34" fill={COLORS.feature} />
          <rect y="34" width="372" height="34" fill={COLORS.cream} />
          <rect y="68" width="372" height="34" fill={COLORS.accent} />
          <path d="M0 34h372M0 68h372" stroke={COLORS.line} strokeDasharray="4 3" />
        </g>
        <SlottedOverlay x={44} y={24} width={320} height={140} />
        {[112, 198, 284].map((x) => <path key={x} d={`M${x} 35v119`} stroke={COLORS.navy} strokeWidth="3" />)}
        <path d="M46 77h316" stroke={COLORS.gold} strokeWidth="3" />
        <text x="210" y="181" textAnchor="middle" fill={COLORS.line} fontSize="11">keep one pressed seam on a horizontal line</text>
      </svg>
    );
  }

  if (job === "ten-square") {
    return (
      <svg className={styles.wideDiagram} viewBox="0 0 420 190" role="img" aria-label="A ten-inch fabric square positioned inside a square-up guide for two-side trimming and rotation">
        <rect x="124" y="24" width="150" height="150" fill={COLORS.pink} stroke={COLORS.line} strokeWidth="1.5" transform="rotate(-1 199 99)" />
        <rect x="120" y="20" width="158" height="158" fill="#d7edf0" fillOpacity="0.38" stroke={COLORS.accent} strokeWidth="2" />
        {[0, 1, 2, 3, 4].map((index) => <path key={index} d={`M${120 + index * 39.5} 20v158M120 ${20 + index * 39.5}h158`} stroke={COLORS.accent} strokeWidth="0.8" opacity="0.52" />)}
        <path d="M112 20h174M278 12v174" stroke={COLORS.featureDark} strokeWidth="3" />
        <path d="M304 64c25 18 25 55 0 73" fill="none" stroke={COLORS.navy} strokeWidth="2" />
        <path d="m301 131 3 9 7-6" fill="none" stroke={COLORS.navy} strokeWidth="2" />
        <text x="199" y="103" textAnchor="middle" fill={COLORS.navy} fontWeight="700" fontSize="15">10″ SQUARE</text>
        <text x="199" y="187" textAnchor="middle" fill={COLORS.line} fontSize="11">trim two sides · rotate · trim the other two</text>
      </svg>
    );
  }

  if (job === "square-block") {
    const fills = [COLORS.feature, COLORS.cream, COLORS.accent, COLORS.gold, COLORS.feature, COLORS.cream, COLORS.accent, COLORS.cream, COLORS.feature];
    return (
      <svg className={styles.wideDiagram} viewBox="0 0 420 190" role="img" aria-label="A pieced nine-patch block centered under a target-size square ruler before trimming">
        <g transform="translate(122 18) rotate(1 80 80)">
          {fills.map((fill, index) => <rect key={index} x={(index % 3) * 53} y={Math.floor(index / 3) * 53} width="53" height="53" fill={fill} stroke={COLORS.line} strokeWidth="0.6" />)}
        </g>
        <rect x="118" y="14" width="167" height="167" fill="#d7edf0" fillOpacity="0.23" stroke={COLORS.navy} strokeWidth="2.5" />
        <path d="M118 14 285 181M285 14 118 181" stroke={COLORS.accent} strokeWidth="1.2" strokeDasharray="5 4" />
        <path d="M109 14h185M285 5v185" stroke={COLORS.featureDark} strokeWidth="3" />
        <text x="201" y="101" textAnchor="middle" fill={COLORS.navy} fontWeight="700" fontSize="14">TARGET BOX</text>
        <text x="201" y="188" textAnchor="middle" fill={COLORS.line} fontSize="11">center seams · share the trimming on every side</text>
      </svg>
    );
  }

  if (job === "diamonds") {
    return (
      <svg className={styles.wideDiagram} viewBox="0 0 420 190" role="img" aria-label="A fabric strip cut on a sixty-degree guide into repeated diamond shapes">
        <rect x="28" y="56" width="364" height="82" fill={COLORS.feature} opacity="0.92" />
        {[-8, 66, 140, 214, 288, 362].map((x) => <path key={x} d={`M${x} 138  ${x + 48} 56`} stroke={COLORS.cream} strokeWidth="3" />)}
        <path d="M62 145 110 48M62 145h112" fill="none" stroke={COLORS.navy} strokeWidth="2" />
        <text x="110" y="160" textAnchor="middle" fill={COLORS.navy} fontWeight="700" fontSize="11">60° GUIDE</text>
        <text x="250" y="181" textAnchor="middle" fill={COLORS.line} fontSize="11">first angle establishes every parallel cut</text>
      </svg>
    );
  }

  return (
    <svg className={styles.wideDiagram} viewBox="0 0 420 190" role="img" aria-label="Folded width-of-fabric yardage aligned parallel beneath a slotted ruler for repeated strip cuts">
      <rect x="22" y="48" width="376" height="96" fill={COLORS.feature} opacity="0.9" />
      <path d="M22 70h376M22 123h376" stroke={COLORS.cream} strokeWidth="2" strokeDasharray="6 4" />
      <SlottedOverlay x={42} y={24} width={330} height={144} />
      {[104, 168, 232, 296, 360].map((x) => <path key={x} d={`M${x} 35v123`} stroke={COLORS.navy} strokeWidth="3" />)}
      <text x="22" y="40" fill={COLORS.line} fontSize="10">RAW EDGE ← JUST LEFT OF 0</text>
      <text x="210" y="182" textAnchor="middle" fill={COLORS.line} fontSize="11">both folds stay parallel to the ruler baseline</text>
    </svg>
  );
}

export function QuiltGridDiagram({ columns, rows }: { columns: number; rows: number }) {
  const safeColumns = Math.min(12, Math.max(1, columns));
  const safeRows = Math.min(12, Math.max(1, rows));
  const cell = Math.min(42, 300 / safeColumns, 220 / safeRows);
  const width = safeColumns * cell;
  const height = safeRows * cell;
  return (
    <svg className={styles.plannerDiagram} viewBox="0 0 360 280" role="img" aria-label={`${columns} by ${rows} quilt block grid`}>
      <g transform={`translate(${(360-width)/2} ${(250-height)/2})`}>
        {Array.from({length:safeColumns*safeRows},(_,i)=><rect key={i} x={(i%safeColumns)*cell} y={Math.floor(i/safeColumns)*cell} width={cell-2} height={cell-2} fill={(i+Math.floor(i/safeColumns))%3===0?COLORS.feature:(i%3===1?COLORS.accent:COLORS.gold)} rx="2" />)}
        <rect width={width} height={height} fill="none" stroke={COLORS.line} strokeWidth="2" />
      </g>
      <text x="180" y="270" textAnchor="middle" fill={COLORS.line} fontSize="12">{columns} columns × {rows} rows</text>
    </svg>
  );
}

export function BackingDiagram({ panels, orientation }: { panels: number; orientation: "vertical" | "horizontal" }) {
  const visiblePanels = Math.min(12, Math.max(1, panels));
  return (
    <svg className={styles.wideDiagram} viewBox="0 0 420 220" role="img" aria-label={`${panels}-panel ${orientation} backing layout`}>
      <rect x="55" y="25" width="310" height="170" fill={COLORS.background} stroke={COLORS.line} strokeWidth="2" />
      {Array.from({length:Math.max(0,visiblePanels-1)},(_,i)=> orientation === "vertical" ? <path key={i} d={`M${55+310*(i+1)/visiblePanels} 25v170`} stroke={COLORS.feature} strokeWidth="3" strokeDasharray="6 4" /> : <path key={i} d={`M55 ${25+170*(i+1)/visiblePanels}h310`} stroke={COLORS.feature} strokeWidth="3" strokeDasharray="6 4" />)}
      <rect x="72" y="42" width="276" height="136" fill={COLORS.accent} opacity="0.2" stroke={COLORS.accent} strokeWidth="2" />
      <text x="210" y="106" textAnchor="middle" fill={COLORS.line} fontWeight="700" fontSize="15">QUILT TOP + MARGIN</text>
      <text x="210" y="126" textAnchor="middle" fill={COLORS.line} fontSize="11">{panels === 1 ? "single-panel layout" : panels > visiblePanels ? `${visiblePanels} of ${panels} panels shown` : "seams shown dashed"}</text>
    </svg>
  );
}
