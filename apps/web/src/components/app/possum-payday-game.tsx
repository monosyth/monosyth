"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";

type SymbolId =
  | "mama"
  | "uncle"
  | "goat"
  | "possum"
  | "truck"
  | "mower"
  | "raccoon"
  | "throne";

type SlotSymbol = {
  id: SymbolId;
  name: string;
  nickname: string;
  image: string;
  fallback: string;
  weight: number;
  pays: [number, number, number, number];
  rarity: string;
  family: "KIN" | "CRITTER" | "RIDE" | "RODEO";
  palette: {
    top: string;
    deep: string;
    accent: string;
    glow: string;
  };
};

const SYMBOLS: SlotSymbol[] = [
  {
    id: "mama",
    name: "Mama Jolene",
    nickname: "Hotdish high roller",
    image: "/possum-payday/art/symbols/mama-jolene.png",
    fallback: "MJ",
    weight: 4,
    pays: [0.55, 1.25, 3.2, 7.5],
    rarity: "LEGEND",
    family: "KIN",
    palette: {
      top: "#9a2856",
      deep: "#250a18",
      accent: "#ff77a6",
      glow: "rgba(255, 83, 145, 0.58)",
    },
  },
  {
    id: "uncle",
    name: "Uncle Bo",
    nickname: "Bass pro emeritus",
    image: "/possum-payday/art/symbols/uncle-bo.png",
    fallback: "UB",
    weight: 5,
    pays: [0.42, 1, 2.5, 6],
    rarity: "PREMIUM",
    family: "KIN",
    palette: {
      top: "#59397b",
      deep: "#180d27",
      accent: "#c092ff",
      glow: "rgba(181, 126, 255, 0.52)",
    },
  },
  {
    id: "goat",
    name: "Billy",
    nickname: "Certified fence tester",
    image: "/possum-payday/art/symbols/billy-goat.png",
    fallback: "GOAT",
    weight: 7,
    pays: [0.32, 0.78, 1.9, 4.5],
    rarity: "HEADLINER",
    family: "CRITTER",
    palette: {
      top: "#27796c",
      deep: "#092521",
      accent: "#58f1d0",
      glow: "rgba(69, 241, 211, 0.52)",
    },
  },
  {
    id: "possum",
    name: "Earl",
    nickname: "Night-shift management",
    image: "/possum-payday/art/symbols/earl-possum.png",
    fallback: "EP",
    weight: 8,
    pays: [0.26, 0.62, 1.5, 3.6],
    rarity: "SLICK",
    family: "CRITTER",
    palette: {
      top: "#315d82",
      deep: "#091a29",
      accent: "#79caff",
      glow: "rgba(93, 190, 255, 0.5)",
    },
  },
  {
    id: "raccoon",
    name: "Hubcap Bandit",
    nickname: "Shiny-object consultant",
    image: "/possum-payday/art/symbols/raccoon-bandit.png",
    fallback: "RB",
    weight: 12,
    pays: [0.14, 0.33, 0.8, 1.9],
    rarity: "FERAL",
    family: "CRITTER",
    palette: {
      top: "#405261",
      deep: "#10171d",
      accent: "#a7d8e8",
      glow: "rgba(125, 201, 224, 0.46)",
    },
  },
  {
    id: "truck",
    name: "Mud Majesty",
    nickname: "Zero miles per gallon",
    image: "/possum-payday/art/symbols/mud-truck.png",
    fallback: "4×4",
    weight: 10,
    pays: [0.2, 0.48, 1.15, 2.8],
    rarity: "LOUD",
    family: "RIDE",
    palette: {
      top: "#a54120",
      deep: "#2d1009",
      accent: "#ff7d39",
      glow: "rgba(255, 103, 43, 0.52)",
    },
  },
  {
    id: "mower",
    name: "Yard Ferrari",
    nickname: "Street questionably legal",
    image: "/possum-payday/art/symbols/mower-racer.png",
    fallback: "MOW",
    weight: 10,
    pays: [0.17, 0.4, 0.95, 2.3],
    rarity: "TUNED",
    family: "RIDE",
    palette: {
      top: "#5d7b20",
      deep: "#172207",
      accent: "#b9ed50",
      glow: "rgba(175, 232, 71, 0.48)",
    },
  },
  {
    id: "throne",
    name: "Golden Throne",
    nickname: "3+ starts the rare Goat Rodeo",
    image: "/possum-payday/art/symbols/golden-throne.png",
    fallback: "BONUS",
    weight: 1,
    pays: [0, 0, 0, 0],
    rarity: "SCATTER",
    family: "RODEO",
    palette: {
      top: "#a86408",
      deep: "#311202",
      accent: "#ffdd55",
      glow: "rgba(255, 201, 54, 0.68)",
    },
  },
];

const SYMBOL_MAP = Object.fromEntries(
  SYMBOLS.map((symbol) => [symbol.id, symbol]),
) as Record<SymbolId, SlotSymbol>;

const STARTING_GRID: SymbolId[] = [
  "mama",
  "goat",
  "truck",
  "possum",
  "uncle",
  "mower",
  "raccoon",
  "uncle",
  "mower",
  "goat",
  "truck",
  "possum",
  "throne",
  "possum",
  "goat",
  "mama",
  "raccoon",
  "uncle",
  "truck",
  "mower",
  "possum",
  "uncle",
  "throne",
  "goat",
  "goat",
  "raccoon",
  "truck",
  "mower",
  "mama",
  "raccoon",
];

const TICKER_LINES = [
  "BREAKING: Earl has been promoted to Regional Dumpster Manager",
  "COUNTY NOTICE: lawn tractors must yield to livestock after sundown",
  "MAMA'S RULE: no arguing near the potato salad",
  "LIVE ODDS: Billy is still banned from the petting zoo",
];

const LOSS_LINES = [
  "That dog won't hunt. Give it another tug.",
  "Close! Uncle Bo says the machine needs more duct tape.",
  "The possum is thinking. This can take a minute.",
  "No gravy this round. The biscuits remain hopeful.",
];

const REEL_COUNT = 6;
const ROW_COUNT = 5;
const REEL_STOP_FRAMES = [9, 13, 17, 21, 25, 30] as const;
const SPIN_FRAME_MS = 70;
const REDUCED_SPIN_FRAME_MS = 105;
const MAX_WIN_LINES = 18;
const MAX_LINES_PER_SYMBOL = 6;
const ANTICIPATION_STOP_FRAME = 48;
const PAYLINE_COLORS = [
  "#ffd84d",
  "#45f1d3",
  "#ff6a3d",
  "#ff65c8",
  "#7fc8ff",
  "#d2ff65",
] as const;

type BonusTarget = "raccoon" | "mower" | "truck";
type BonusPhase =
  | "intro"
  | "spinning"
  | "collecting"
  | "transforming"
  | "showing-win"
  | "complete";

const BONUS_SPIN_COUNT = 6;
const BONUS_REEL_STOP_FRAMES = [3, 4, 5, 6, 7, 8] as const;
const BONUS_MILESTONES: readonly {
  at: number;
  target: BonusTarget;
  label: string;
  callout: string;
}[] = [
  { at: 2, target: "raccoon", label: "HUBCAP BANDIT", callout: "TRASH PANDA ROUNDUP" },
  { at: 5, target: "mower", label: "YARD FERRARI", callout: "MOWER MUTINY" },
  { at: 8, target: "truck", label: "MUD MAJESTY", callout: "TRUCKS GOT HORNS" },
] as const;

const weightedBag = SYMBOLS.flatMap((symbol) =>
  Array.from({ length: symbol.weight }, () => symbol.id),
);
const bonusWeightedBag = SYMBOLS.filter((symbol) => symbol.id !== "throne").flatMap(
  (symbol) => Array.from({ length: symbol.weight }, () => symbol.id),
);

function randomSymbol(): SymbolId {
  return weightedBag[Math.floor(Math.random() * weightedBag.length)];
}

function randomGrid(): SymbolId[] {
  return Array.from({ length: REEL_COUNT * ROW_COUNT }, randomSymbol);
}

function randomBonusSymbol(): SymbolId {
  return bonusWeightedBag[Math.floor(Math.random() * bonusWeightedBag.length)];
}

function randomBonusGrid(): SymbolId[] {
  return Array.from({ length: REEL_COUNT * ROW_COUNT }, randomBonusSymbol);
}

function countThronesThroughReel(grid: SymbolId[], finalReel: number) {
  return grid.reduce((count, symbol, index) => {
    return count + (symbol === "throne" && index % REEL_COUNT <= finalReel ? 1 : 0);
  }, 0);
}

function pause(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type WinLine = {
  id: string;
  kind: "ways" | "scatter";
  cells: number[];
  label: string;
  amount: number;
  color: string;
};

function sampleWayOrdinals(ways: number, limit: number) {
  const count = Math.min(ways, limit);
  if (count <= 0) return [];
  if (count === ways) return Array.from({ length: count }, (_, index) => index);
  if (count === 1) return [0];

  return Array.from({ length: count }, (_, index) =>
    Math.round((index * (ways - 1)) / (count - 1)),
  );
}

function cellsForWay(rowsByColumn: number[][], ordinal: number) {
  let cursor = ordinal;
  return rowsByColumn.map((rows, column) => {
    const row = rows[cursor % rows.length];
    cursor = Math.floor(cursor / rows.length);
    return row * REEL_COUNT + column;
  });
}

function buildSpinFrame(
  currentGrid: SymbolId[],
  finalGrid: SymbolId[],
  frame: number,
  stopFrames: readonly number[],
  reducedMotion: boolean,
  randomizer: () => SymbolId = randomSymbol,
) {
  return currentGrid.map((currentSymbol, index) => {
    const reel = index % REEL_COUNT;
    if (frame >= stopFrames[reel]) return finalGrid[index];
    return reducedMotion ? currentSymbol : randomizer();
  });
}

function pointForCell(index: number) {
  const column = index % REEL_COUNT;
  const row = Math.floor(index / REEL_COUNT);
  return `${column * 100 + 50},${row * 100 + 50}`;
}

function evaluateGrid(grid: SymbolId[], bet: number) {
  let payout = 0;
  let totalWays = 0;
  const winningCells = new Set<number>();
  const wins: string[] = [];
  const winLines: WinLine[] = [];

  for (const symbol of SYMBOLS) {
    if (symbol.id === "throne") continue;

    const rowsByColumn = Array.from({ length: REEL_COUNT }, (_, column) => {
      const rows: number[] = [];
      for (let row = 0; row < ROW_COUNT; row += 1) {
        if (grid[row * REEL_COUNT + column] === symbol.id) rows.push(row);
      }
      return rows;
    });

    let columns = 0;
    while (columns < REEL_COUNT && rowsByColumn[columns].length > 0) columns += 1;
    if (columns < 3) continue;

    const winningRows = rowsByColumn.slice(0, columns);
    const ways = winningRows
      .slice(0, columns)
      .reduce((total, rows) => total * rows.length, 1);
    const rate = symbol.pays[columns - 3];
    const amount = Math.max(1, Math.round((bet * rate * ways) / 3));
    payout += amount;
    totalWays += ways;
    wins.push(`${symbol.name} ${columns}×${ways} ways`);

    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < ROW_COUNT; row += 1) {
        const index = row * REEL_COUNT + column;
        if (grid[index] === symbol.id) winningCells.add(index);
      }
    }

    const remainingLineSlots = Math.max(0, MAX_WIN_LINES - winLines.length);
    const sampledOrdinals = sampleWayOrdinals(
      ways,
      Math.min(MAX_LINES_PER_SYMBOL, remainingLineSlots),
    );
    const perWayAmount = Math.max(1, Math.round(amount / ways));

    sampledOrdinals.forEach((ordinal) => {
      winLines.push({
        id: `${symbol.id}-${columns}-${ordinal}`,
        kind: "ways",
        cells: cellsForWay(winningRows, ordinal),
        label: `${symbol.name} · ${columns} reels · way ${ordinal + 1}/${ways}`,
        amount: perWayAmount,
        color: PAYLINE_COLORS[winLines.length % PAYLINE_COLORS.length],
      });
    });
  }

  const scatterCells = grid
    .map((id, index) => (id === "throne" ? index : -1))
    .filter((index) => index >= 0);
  const bonusTriggered = scatterCells.length >= 3;
  if (bonusTriggered) {
    const scatterAmount = bet * scatterCells.length * 2;
    payout += scatterAmount;
    scatterCells.forEach((index) => winningCells.add(index));
    wins.push(`${scatterCells.length} Golden Thrones`);

    if (winLines.length >= MAX_WIN_LINES) winLines.pop();
    winLines.push({
      id: `scatter-${scatterCells.join("-")}`,
      kind: "scatter",
      cells: scatterCells,
      label: `${scatterCells.length} Golden Thrones · Goat Rodeo`,
      amount: scatterAmount,
      color: "#ffd84d",
    });
  }

  return {
    payout,
    totalWays,
    winningCells,
    winLines,
    wins,
    bonusTriggered,
    scatterCells,
  };
}

function evaluateBonusGrid(grid: SymbolId[], bet: number) {
  const visualResult = evaluateGrid(grid, bet);
  let payout = 0;

  for (const symbol of SYMBOLS) {
    if (symbol.id === "throne") continue;

    const matchesByReel = Array.from({ length: REEL_COUNT }, (_, reel) => {
      let matches = 0;
      for (let row = 0; row < ROW_COUNT; row += 1) {
        if (grid[row * REEL_COUNT + reel] === symbol.id) matches += 1;
      }
      return matches;
    });

    let reels = 0;
    while (reels < REEL_COUNT && matchesByReel[reels] > 0) reels += 1;
    if (reels < 3) continue;

    const rawWays = matchesByReel
      .slice(0, reels)
      .reduce((total, matches) => total * matches, 1);
    const paidWays = Math.min(rawWays, 4);
    payout += Math.max(
      1,
      Math.round((bet * symbol.pays[reels - 3] * paidWays) / 6),
    );
  }

  return {
    ...visualResult,
    payout,
    bonusTriggered: false,
    scatterCells: [],
  };
}

type BonusSpinPlan = {
  landingGrid: SymbolId[];
  finalGrid: SymbolId[];
  goldenCells: number[];
  transformedCells: number[];
  collectedAfter: number;
  unlockedAfter: BonusTarget[];
  newlyUnlocked: BonusTarget[];
  result: ReturnType<typeof evaluateGrid>;
};

type BonusPlan = {
  bet: number;
  spins: BonusSpinPlan[];
  totalPayout: number;
};

function chooseGoldenBillyCells(grid: SymbolId[], count: number) {
  const goatCells = grid
    .map((symbol, index) => (symbol === "goat" ? index : -1))
    .filter((index) => index >= 0);
  const remainingCells = grid
    .map((_, index) => index)
    .filter((index) => !goatCells.includes(index));
  const candidates = [...goatCells, ...remainingCells];
  const chosen: number[] = [];

  while (chosen.length < count && candidates.length > 0) {
    const candidateIndex = Math.floor(Math.random() * candidates.length);
    chosen.push(candidates.splice(candidateIndex, 1)[0]);
  }

  return chosen;
}

function createBonusPlan(bet: number): BonusPlan {
  let collected = 0;
  let unlocked: BonusTarget[] = [];
  const spins: BonusSpinPlan[] = [];

  for (let spinIndex = 0; spinIndex < BONUS_SPIN_COUNT; spinIndex += 1) {
    const rawGrid = randomBonusGrid();
    const landingGrid = rawGrid.map((symbol) =>
      unlocked.includes(symbol as BonusTarget) ? "goat" : symbol,
    );
    const goldenCells = chooseGoldenBillyCells(
      landingGrid,
      Math.random() < 0.35 ? 2 : 1,
    );
    goldenCells.forEach((cell) => {
      landingGrid[cell] = "goat";
    });

    collected += goldenCells.length;
    const newlyUnlocked = BONUS_MILESTONES.filter(
      (milestone) => collected >= milestone.at && !unlocked.includes(milestone.target),
    ).map((milestone) => milestone.target);
    const unlockedAfter = [...unlocked, ...newlyUnlocked];
    const transformedCells: number[] = [];
    const finalGrid = landingGrid.map((symbol, index) => {
      if (
        newlyUnlocked.includes(rawGrid[index] as BonusTarget) &&
        !goldenCells.includes(index)
      ) {
        transformedCells.push(index);
        return "goat";
      }
      return symbol;
    });
    const result = evaluateBonusGrid(finalGrid, bet);

    spins.push({
      landingGrid,
      finalGrid,
      goldenCells,
      transformedCells,
      collectedAfter: collected,
      unlockedAfter,
      newlyUnlocked,
      result,
    });
    unlocked = unlockedAfter;
  }

  let totalPayout = spins.reduce((total, spin) => total + spin.result.payout, 0);
  const minimumPayout = bet * 4;
  if (totalPayout < minimumPayout) {
    const topUp = minimumPayout - totalPayout;
    const lastSpin = spins[spins.length - 1];
    lastSpin.result = {
      ...lastSpin.result,
      payout: lastSpin.result.payout + topUp,
      winningCells:
        lastSpin.result.winningCells.size > 0
          ? lastSpin.result.winningCells
          : new Set(lastSpin.goldenCells),
      wins: [...lastSpin.result.wins, "County Fair appearance fee"],
    };
    totalPayout = minimumPayout;
  }

  return { bet, spins, totalPayout };
}

type Spark = {
  id: number;
  left: number;
  delay: number;
  color: string;
  drift: number;
};

type SpinMotor = {
  context: AudioContext;
  master: GainNode;
  sources: Array<OscillatorNode | AudioBufferSourceNode>;
};

function PrivateGameGate({ loading = false }: { loading?: boolean }) {
  return (
    <div className="possum-payday-route">
      <main className="game-gate-shell">
        <div className="game-gate-card">
          <span className="game-gate-mark" aria-hidden="true">
            {loading ? "◌" : "P"}
          </span>
          <p className="game-gate-kicker">PRIVATE MONOSYTH STUDIO GAME</p>
          <h1>{loading ? "Waking up the possum…" : "Sign in through Studio first."}</h1>
          <p>
            {loading
              ? "Counting beans, checking goat latches, and loading the family reels."
              : "Possum Payday lives with your other private Monosyth workspaces."}
          </p>
          {!loading ? (
            <Link href="/app" className="game-gate-link">
              Go to Studio sign-in →
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export function PossumPaydayGame() {
  const { status } = useAuth();

  if (status === "loading") {
    return <PrivateGameGate loading />;
  }

  if (status !== "signed_in") {
    return <PrivateGameGate />;
  }

  return <PossumPaydayMachine />;
}

function PossumPaydayMachine() {
  const [grid, setGrid] = useState<SymbolId[]>(STARTING_GRID);
  const [credits, setCredits] = useState(2500);
  const [bet, setBet] = useState(50);
  const [lastWin, setLastWin] = useState(0);
  const [bestWin, setBestWin] = useState(0);
  const [spins, setSpins] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [message, setMessage] = useState("TUG THE HANDLE. EMBARRASS THE FAMILY.");
  const [winningCells, setWinningCells] = useState<Set<number>>(new Set());
  const [spinningReels, setSpinningReels] = useState<Set<number>>(new Set());
  const [settledReelCount, setSettledReelCount] = useState(0);
  const [settlingReel, setSettlingReel] = useState<number | null>(null);
  const [winLines, setWinLines] = useState<WinLine[]>([]);
  const [activeWinLineIndex, setActiveWinLineIndex] = useState(0);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [scatterProgress, setScatterProgress] = useState(0);
  const [isAnticipating, setIsAnticipating] = useState(false);

  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusActive, setBonusActive] = useState(false);
  const [bonusBet, setBonusBet] = useState(bet);
  const [bonusAward, setBonusAward] = useState(0);
  const [bonusPending, setBonusPending] = useState(false);
  const [bonusPhase, setBonusPhase] = useState<BonusPhase>("intro");
  const [bonusGrid, setBonusGrid] = useState<SymbolId[]>(STARTING_GRID);
  const [bonusSpinIndex, setBonusSpinIndex] = useState(0);
  const [bonusGoldenCells, setBonusGoldenCells] = useState<Set<number>>(new Set());
  const [bonusTransformedCells, setBonusTransformedCells] = useState<Set<number>>(
    new Set(),
  );
  const [bonusWinningCells, setBonusWinningCells] = useState<Set<number>>(new Set());
  const [bonusSpinningReels, setBonusSpinningReels] = useState<Set<number>>(
    new Set(),
  );
  const [bonusCollected, setBonusCollected] = useState(0);
  const [bonusUnlocked, setBonusUnlocked] = useState<BonusTarget[]>([]);
  const [bonusSpinWin, setBonusSpinWin] = useState(0);
  const [bonusRunningTotal, setBonusRunningTotal] = useState(0);
  const [bonusMessage, setBonusMessage] = useState(
    "The gates are opening for six automatic free spins.",
  );
  const soundRef = useRef(soundOn);
  const audioContextRef = useRef<AudioContext | null>(null);
  const spinMotorRef = useRef<SpinMotor | null>(null);
  const spinLockRef = useRef(false);
  const spinRunRef = useRef(0);
  const bonusPendingRef = useRef(false);
  const bonusTimerRef = useRef<number | null>(null);
  const bonusAnimationTimerRef = useRef<number | null>(null);
  const bonusRunRef = useRef(0);
  const bonusAwardedRef = useRef(false);
  const bonusPlanRef = useRef<BonusPlan | null>(null);
  const prefersReducedMotionRef = useRef(false);
  const spinButtonRef = useRef<HTMLButtonElement | null>(null);
  const bonusDialogRef = useRef<HTMLElement | null>(null);
  const bonusBackButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeWinLine = winLines[activeWinLineIndex] ?? null;
  const activeWinCells = useMemo(
    () => new Set(activeWinLine?.cells ?? []),
    [activeWinLine],
  );

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const getAudioContext = useCallback(() => {
    if (!soundRef.current) return null;

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return null;

    let context = audioContextRef.current;
    if (!context || context.state === "closed") {
      context = new AudioContextCtor();
      audioContextRef.current = context;
    }
    if (context.state === "suspended") void context.resume();
    return context;
  }, []);

  const playTone = useCallback(
    (
      frequency: number,
      duration = 0.08,
      type: OscillatorType = "square",
      volume = 0.055,
      delay = 0,
    ) => {
      const context = getAudioContext();
      if (!context) return;

      const startAt = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(70, frequency * 0.8),
        startAt + duration,
      );
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.setValueAtTime(volume, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        gain.disconnect();
      });
    },
    [getAudioContext],
  );

  const playNoiseBurst = useCallback(
    (duration = 0.08, volume = 0.032, frequency = 520, delay = 0) => {
      const context = getAudioContext();
      if (!context) return;

      const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
      const buffer = context.createBuffer(1, frameCount, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < frameCount; index += 1) {
        const fade = 1 - index / frameCount;
        channel[index] = (Math.random() * 2 - 1) * fade;
      }

      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const startAt = context.currentTime + delay;
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(frequency, startAt);
      filter.Q.setValueAtTime(0.7, startAt);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.setValueAtTime(volume, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start(startAt);
      source.stop(startAt + duration);
      source.addEventListener("ended", () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      });
    },
    [getAudioContext],
  );

  const stopSpinMotor = useCallback(() => {
    const motor = spinMotorRef.current;
    if (!motor) return;

    const now = motor.context.currentTime;
    motor.master.gain.cancelScheduledValues(now);
    motor.master.gain.setValueAtTime(
      Math.max(0.0001, motor.master.gain.value),
      now,
    );
    motor.master.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    motor.sources.forEach((source) => {
      try {
        source.stop(now + 0.18);
      } catch {
        // The source may already have stopped during navigation or sound-off.
      }
    });
    spinMotorRef.current = null;
  }, []);

  const startSpinMotor = useCallback(() => {
    stopSpinMotor();
    const context = getAudioContext();
    if (!context) return;

    const now = context.currentTime;
    const master = context.createGain();
    const motor = context.createOscillator();
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.022, now + 0.08);
    motor.type = "sawtooth";
    motor.frequency.setValueAtTime(72, now);
    motor.frequency.exponentialRampToValueAtTime(112, now + 1.65);
    noise.buffer = buffer;
    noise.loop = true;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(560, now);
    filter.Q.setValueAtTime(0.55, now);
    motor.connect(master);
    noise.connect(filter);
    filter.connect(master);
    master.connect(context.destination);
    motor.start(now);
    noise.start(now);
    spinMotorRef.current = { context, master, sources: [motor, noise] };
  }, [getAudioContext, stopSpinMotor]);

  const playReelStop = useCallback(
    (reel: number) => {
      const base = [132, 154, 181, 214, 258, 304][reel] ?? 190;
      playNoiseBurst(0.075, 0.038, 430 + reel * 65);
      playTone(base, 0.12, "square", 0.043);
      playTone(base * 2.55, 0.09, "triangle", 0.025, 0.035);
      if (reel === REEL_COUNT - 1) {
        playTone(720, 0.18, "triangle", 0.034, 0.1);
      }
    },
    [playNoiseBurst, playTone],
  );

  const playLineChime = useCallback(
    (index: number, scatter = false) => {
      const base = scatter ? 392 : [392, 440, 494, 523, 587, 659][index % 6];
      playTone(base, 0.13, "triangle", 0.028);
      playTone(base * 1.25, 0.14, "triangle", 0.024, 0.065);
      playTone(base * 1.5, 0.18, "sine", 0.021, 0.13);
    },
    [playTone],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      prefersReducedMotionRef.current = media.matches;
    };
    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (!soundOn) stopSpinMotor();
  }, [soundOn, stopSpinMotor]);

  useEffect(() => {
    return () => {
      spinRunRef.current += 1;
      bonusRunRef.current += 1;
      if (bonusTimerRef.current !== null) {
        window.clearTimeout(bonusTimerRef.current);
      }
      if (bonusAnimationTimerRef.current !== null) {
        window.clearTimeout(bonusAnimationTimerRef.current);
      }
      stopSpinMotor();
      const context = audioContextRef.current;
      if (context && context.state !== "closed") void context.close();
    };
  }, [stopSpinMotor]);

  const showerSparks = useCallback((big = false) => {
    const colors = ["#ffcf33", "#ff5a36", "#55f0cf", "#fff1b8", "#e92f45"];
    setSparks(
      Array.from({ length: big ? 52 : 28 }, (_, id) => ({
        id,
        left: Math.random() * 100,
        delay: Math.random() * 0.45,
        color: colors[id % colors.length],
        drift: Math.round(Math.random() * 100 - 50),
      })),
    );
    window.setTimeout(() => setSparks([]), 2200);
  }, []);

  const openBonus = useCallback((triggerBet: number) => {
    if (bonusTimerRef.current !== null) {
      window.clearTimeout(bonusTimerRef.current);
      bonusTimerRef.current = null;
    }
    if (bonusAnimationTimerRef.current !== null) {
      window.clearTimeout(bonusAnimationTimerRef.current);
      bonusAnimationTimerRef.current = null;
    }
    bonusRunRef.current += 1;
    bonusAwardedRef.current = false;
    const plan = createBonusPlan(triggerBet);
    bonusPlanRef.current = plan;
    setBonusPending(false);
    setWinLines([]);
    setActiveWinLineIndex(0);
    setShowRules(false);
    setBonusOpen(true);
    setBonusActive(true);
    setBonusBet(triggerBet);
    setBonusAward(0);
    setBonusPhase("intro");
    setBonusGrid(randomBonusGrid());
    setBonusSpinIndex(0);
    setBonusGoldenCells(new Set());
    setBonusTransformedCells(new Set());
    setBonusWinningCells(new Set());
    setBonusSpinningReels(new Set());
    setBonusCollected(0);
    setBonusUnlocked([]);
    setBonusSpinWin(0);
    setBonusRunningTotal(0);
    setBonusMessage("Six free spins. Golden Billy upgrades the whole rodeo as he lands.");
    playTone(196, 0.18, "sawtooth", 0.042);
    playTone(330, 0.2, "sawtooth", 0.04, 0.11);
    playTone(220, 0.2, "sawtooth", 0.035, 0.24);
  }, [playTone]);

  const completeBonus = useCallback(() => {
    const plan = bonusPlanRef.current;
    if (!plan || bonusAwardedRef.current) return;

    bonusAwardedRef.current = true;
    bonusRunRef.current += 1;
    if (bonusAnimationTimerRef.current !== null) {
      window.clearTimeout(bonusAnimationTimerRef.current);
      bonusAnimationTimerRef.current = null;
    }

    const finalSpin = plan.spins[plan.spins.length - 1];
    setBonusGrid(finalSpin?.finalGrid ?? STARTING_GRID);
    setBonusSpinIndex(Math.max(0, plan.spins.length - 1));
    setBonusGoldenCells(new Set(finalSpin?.goldenCells ?? []));
    setBonusTransformedCells(new Set(finalSpin?.transformedCells ?? []));
    setBonusWinningCells(new Set(finalSpin?.result.winningCells ?? []));
    setBonusSpinningReels(new Set());
    setBonusCollected(finalSpin?.collectedAfter ?? 0);
    setBonusUnlocked(finalSpin?.unlockedAfter ?? []);
    setBonusSpinWin(finalSpin?.result.payout ?? 0);
    setBonusRunningTotal(plan.totalPayout);
    setBonusAward(plan.totalPayout);
    setBonusPhase("complete");
    setBonusMessage(
      `${plan.spins.length} free spins complete. Billy has submitted his expense report.`,
    );
    setCredits((current) => current + plan.totalPayout);
    setLastWin(plan.totalPayout);
    setBestWin((current) => Math.max(current, plan.totalPayout));
    setMessage(`GOAT RODEO PAID ${plan.totalPayout.toLocaleString()} CREDITS!`);
    setBonusActive(false);
    showerSparks(true);
    playTone(392, 0.18, "triangle", 0.038);
    playTone(523, 0.22, "triangle", 0.035, 0.1);
    playTone(659, 0.28, "sine", 0.033, 0.21);
  }, [playTone, showerSparks]);

  const closeBonus = useCallback(() => {
    if (bonusActive) return;
    bonusRunRef.current += 1;
    if (bonusAnimationTimerRef.current !== null) {
      window.clearTimeout(bonusAnimationTimerRef.current);
      bonusAnimationTimerRef.current = null;
    }
    bonusPendingRef.current = false;
    bonusPlanRef.current = null;
    setBonusPending(false);
    setBonusOpen(false);
    window.requestAnimationFrame(() => spinButtonRef.current?.focus());
  }, [bonusActive]);

  useEffect(() => {
    if (!bonusOpen) return;
    window.requestAnimationFrame(() => bonusDialogRef.current?.focus());
  }, [bonusOpen]);

  useEffect(() => {
    if (isSpinning || bonusOpen || !activeWinLine) return;

    playLineChime(activeWinLineIndex, activeWinLine.kind === "scatter");
    if (prefersReducedMotionRef.current || winLines.length < 2) return;

    const advanceTimer = window.setTimeout(() => {
      setActiveWinLineIndex((current) => (current + 1) % winLines.length);
    }, 880);
    return () => window.clearTimeout(advanceTimer);
  }, [
    activeWinLine,
    activeWinLineIndex,
    bonusOpen,
    isSpinning,
    playLineChime,
    winLines.length,
  ]);

  const spin = useCallback(async () => {
    if (
      spinLockRef.current ||
      bonusPendingRef.current ||
      isSpinning ||
      bonusOpen
    ) {
      return;
    }
    if (credits < bet) {
      setMessage("MAMA SAYS YOU'RE OUTTA BEANS.");
      playTone(110, 0.3, "sawtooth", 0.05);
      return;
    }

    spinLockRef.current = true;
    const runId = spinRunRef.current + 1;
    spinRunRef.current = runId;
    const finalGrid = randomGrid();
    const reducedMotion = prefersReducedMotionRef.current;
    const teaseEligible = countThronesThroughReel(finalGrid, REEL_COUNT - 2) === 2;
    const fullMotionStopFrames: number[] = [...REEL_STOP_FRAMES];
    if (teaseEligible) fullMotionStopFrames[REEL_COUNT - 1] = ANTICIPATION_STOP_FRAME;
    const stopFrames: readonly number[] = reducedMotion
      ? Array.from({ length: REEL_COUNT }, (_, reel) =>
          teaseEligible && reel === REEL_COUNT - 1 ? REEL_COUNT + 2 : reel,
        )
      : fullMotionStopFrames;
    const frameDelay = reducedMotion ? REDUCED_SPIN_FRAME_MS : SPIN_FRAME_MS;

    setCredits((value) => value - bet);
    setSpins((value) => value + 1);
    setLastWin(0);
    setWinningCells(new Set());
    setWinLines([]);
    setActiveWinLineIndex(0);
    setSettledReelCount(0);
    setSettlingReel(null);
    setScatterProgress(0);
    setIsAnticipating(false);
    setSpinningReels(new Set(Array.from({ length: REEL_COUNT }, (_, reel) => reel)));
    setIsSpinning(true);
    setMessage("RATTLIN' THE FAMILY TREE…");
    playTone(118, 0.2, "sawtooth", 0.046);
    startSpinMotor();

    try {
      for (let frame = 0; frame <= stopFrames[REEL_COUNT - 1]; frame += 1) {
        await pause(frameDelay);
        if (spinRunRef.current !== runId) return;

        const activeReels = new Set<number>();
        for (let reel = 0; reel < REEL_COUNT; reel += 1) {
          if (frame < stopFrames[reel]) activeReels.add(reel);
        }
        setSpinningReels(activeReels);
        setGrid((current) =>
          buildSpinFrame(current, finalGrid, frame, stopFrames, reducedMotion),
        );

        const stoppedReel = stopFrames.indexOf(frame);
        if (stoppedReel >= 0) {
          const landedThrones = countThronesThroughReel(finalGrid, stoppedReel);
          setScatterProgress(landedThrones);
          setSettlingReel(stoppedReel);
          setSettledReelCount(stoppedReel + 1);
          if (stoppedReel === REEL_COUNT - 2 && teaseEligible) {
            setIsAnticipating(true);
            setMessage("TWO GOLDEN THRONES — ONE MORE OPENS THE GOAT GATE!");
            playTone(262, 0.22, "triangle", 0.034);
            playTone(330, 0.26, "triangle", 0.03, 0.18);
            playTone(392, 0.3, "triangle", 0.028, 0.38);
          } else {
            setMessage(`REEL ${stoppedReel + 1} LOCKED — ${REEL_COUNT - stoppedReel - 1} STILL RAISING CAIN`);
          }
          playReelStop(stoppedReel);
        }

        if (
          teaseEligible &&
          !reducedMotion &&
          frame > stopFrames[REEL_COUNT - 2] &&
          frame < stopFrames[REEL_COUNT - 1] &&
          frame % 5 === 0
        ) {
          const rise = frame - stopFrames[REEL_COUNT - 2];
          playTone(340 + rise * 8, 0.075, "triangle", 0.015);
        }
      }

      if (spinRunRef.current !== runId) return;
      stopSpinMotor();
      const result = evaluateGrid(finalGrid, bet);
      setGrid(finalGrid);
      setSpinningReels(new Set());
      setSettledReelCount(REEL_COUNT);
      setScatterProgress(result.scatterCells.length);
      setIsAnticipating(false);
      setWinningCells(result.winningCells);
      setWinLines(result.winLines);
      const scatterLineIndex = result.winLines.findIndex(
        (line) => line.kind === "scatter",
      );
      setActiveWinLineIndex(scatterLineIndex >= 0 ? scatterLineIndex : 0);
      setLastWin(result.payout);
      setBestWin((value) => Math.max(value, result.payout));
      setCredits((value) => value + result.payout);
      setIsSpinning(false);
      window.setTimeout(() => {
        if (spinRunRef.current === runId) setSettlingReel(null);
      }, 360);

      if (result.bonusTriggered) {
        setMessage("GOLDEN THRONES! SOMEBODY LEFT THE GOAT GATE OPEN!");
        showerSparks(true);
        playTone(520, 0.22, "triangle", 0.04);
        playTone(780, 0.28, "triangle", 0.035, 0.13);
        bonusPendingRef.current = true;
        setBonusPending(true);
        bonusTimerRef.current = window.setTimeout(() => {
          bonusTimerRef.current = null;
          if (spinRunRef.current === runId) openBonus(bet);
        }, 1300);
      } else if (result.payout > bet * 8) {
        setMessage("FAMILY FORTUNE! EVEN THE POSSUM STOOD UP!");
        showerSparks(true);
        playTone(392, 0.18, "triangle", 0.036);
        playTone(523, 0.2, "triangle", 0.034, 0.11);
        playTone(659, 0.24, "triangle", 0.032, 0.22);
        playTone(784, 0.34, "sine", 0.03, 0.34);
      } else if (result.payout > 0) {
        setMessage(
          result.totalWays > 1
            ? `${result.totalWays} WAYS HIT — PASS THE GRAVY!`
            : `${result.wins[0]} — WELL BUTTER MY BOOTS!`,
        );
        showerSparks(false);
      } else {
        setMessage(LOSS_LINES[Math.floor(Math.random() * LOSS_LINES.length)]);
        playNoiseBurst(0.14, 0.025, 210);
        playTone(95, 0.22, "sawtooth", 0.04);
      }
    } finally {
      if (spinRunRef.current === runId) {
        stopSpinMotor();
        spinLockRef.current = false;
      }
    }
  }, [
    bet,
    bonusOpen,
    credits,
    isSpinning,
    openBonus,
    playNoiseBurst,
    playReelStop,
    playTone,
    showerSparks,
    startSpinMotor,
    stopSpinMotor,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInteractive = Boolean(
        target?.closest("button, a, input, select, textarea, [role='button']"),
      );

      if (
        event.code === "Space" &&
        !event.repeat &&
        !bonusOpen &&
        !showRules &&
        !isInteractive
      ) {
        event.preventDefault();
        void spin();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bonusOpen, showRules, spin]);

  useEffect(() => {
    const plan = bonusPlanRef.current;
    if (!bonusOpen || !bonusActive || !plan) return;

    const runId = bonusRunRef.current + 1;
    bonusRunRef.current = runId;
    const reducedMotion = prefersReducedMotionRef.current;
    let spinIndex = 0;
    let runningTotal = 0;

    const schedule = (delay: number, callback: () => void) => {
      if (bonusAnimationTimerRef.current !== null) {
        window.clearTimeout(bonusAnimationTimerRef.current);
      }
      bonusAnimationTimerRef.current = window.setTimeout(() => {
        if (bonusRunRef.current === runId) callback();
      }, delay);
    };

    const showSpinWin = (spin: BonusSpinPlan) => {
      runningTotal += spin.result.payout;
      setBonusPhase("showing-win");
      setBonusWinningCells(new Set(spin.result.winningCells));
      setBonusSpinWin(spin.result.payout);
      setBonusRunningTotal(runningTotal);
      setBonusMessage(
        spin.result.payout > 0
          ? `Ride ${spinIndex + 1} paid ${spin.result.payout.toLocaleString()} credits.`
          : `Ride ${spinIndex + 1}: Billy ate the payline.`,
      );
      if (spin.result.payout > 0) {
        playTone(392 + spinIndex * 24, 0.11, "triangle", 0.024);
        playTone(523 + spinIndex * 20, 0.16, "sine", 0.02, 0.08);
      }

      schedule(reducedMotion ? 190 : 720, () => {
        spinIndex += 1;
        if (spinIndex >= plan.spins.length) {
          completeBonus();
        } else {
          runSpin();
        }
      });
    };

    const collectAndTransform = (spin: BonusSpinPlan) => {
      setBonusPhase("collecting");
      setBonusGoldenCells(new Set(spin.goldenCells));
      setBonusCollected(spin.collectedAfter);
      setBonusMessage(
        `${spin.goldenCells.length} Golden ${spin.goldenCells.length === 1 ? "Billy" : "Billies"} rounded up — ${spin.collectedAfter} total.`,
      );
      playNoiseBurst(0.08, 0.026, 620);
      playTone(660, 0.1, "triangle", 0.025);

      const revealWin = () => {
        setBonusGrid(spin.finalGrid);
        setBonusUnlocked(spin.unlockedAfter);
        setBonusTransformedCells(new Set(spin.transformedCells));
        showSpinWin(spin);
      };

      if (spin.newlyUnlocked.length === 0) {
        schedule(reducedMotion ? 130 : 380, revealWin);
        return;
      }

      schedule(reducedMotion ? 130 : 410, () => {
        const latestUnlock = BONUS_MILESTONES.find(
          (milestone) => milestone.target === spin.newlyUnlocked.at(-1),
        );
        setBonusPhase("transforming");
        setBonusGrid(spin.finalGrid);
        setBonusUnlocked(spin.unlockedAfter);
        setBonusTransformedCells(new Set(spin.transformedCells));
        setBonusMessage(
          `${latestUnlock?.callout ?? "BILLY UPGRADE"}! ${latestUnlock?.label ?? "A SYMBOL"} is Billy for the rest of the rodeo.`,
        );
        playTone(220, 0.14, "sawtooth", 0.034);
        playTone(440, 0.18, "triangle", 0.032, 0.1);
        playTone(660, 0.22, "sine", 0.028, 0.2);
        schedule(reducedMotion ? 170 : 650, () => showSpinWin(spin));
      });
    };

    const runSpin = () => {
      const spin = plan.spins[spinIndex];
      if (!spin) {
        completeBonus();
        return;
      }

      setBonusPhase("spinning");
      setBonusSpinIndex(spinIndex);
      setBonusGoldenCells(new Set());
      setBonusTransformedCells(new Set());
      setBonusWinningCells(new Set());
      setBonusSpinWin(0);
      setBonusMessage(`Free spin ${spinIndex + 1} of ${plan.spins.length} is rattling.`);

      if (reducedMotion) {
        setBonusGrid(spin.landingGrid);
        setBonusSpinningReels(new Set());
        schedule(150, () => collectAndTransform(spin));
        return;
      }

      let frame = 0;
      setBonusSpinningReels(
        new Set(Array.from({ length: REEL_COUNT }, (_, reel) => reel)),
      );

      const advanceFrame = () => {
        const activeReels = new Set<number>();
        for (let reel = 0; reel < REEL_COUNT; reel += 1) {
          if (frame < BONUS_REEL_STOP_FRAMES[reel]) activeReels.add(reel);
        }
        setBonusSpinningReels(activeReels);
        setBonusGrid((current) =>
          buildSpinFrame(
            current,
            spin.landingGrid,
            frame,
            BONUS_REEL_STOP_FRAMES,
            false,
            randomBonusSymbol,
          ),
        );

        const stoppedReel = BONUS_REEL_STOP_FRAMES.indexOf(
          frame as (typeof BONUS_REEL_STOP_FRAMES)[number],
        );
        if (stoppedReel >= 0) playReelStop(stoppedReel);

        if (frame >= BONUS_REEL_STOP_FRAMES[REEL_COUNT - 1]) {
          setBonusGrid(spin.landingGrid);
          setBonusSpinningReels(new Set());
          schedule(180, () => collectAndTransform(spin));
          return;
        }

        frame += 1;
        schedule(64, advanceFrame);
      };

      schedule(240, advanceFrame);
    };

    schedule(reducedMotion ? 180 : 520, runSpin);

    return () => {
      if (bonusRunRef.current === runId) bonusRunRef.current += 1;
      if (bonusAnimationTimerRef.current !== null) {
        window.clearTimeout(bonusAnimationTimerRef.current);
        bonusAnimationTimerRef.current = null;
      }
    };
  }, [
    bonusActive,
    bonusOpen,
    completeBonus,
    playNoiseBurst,
    playReelStop,
    playTone,
  ]);

  useEffect(() => {
    if (!bonusOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !bonusActive) closeBonus();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [bonusActive, bonusOpen, closeBonus]);

  useEffect(() => {
    if (!bonusOpen || bonusActive || bonusAward <= 0) return;
    window.requestAnimationFrame(() => bonusBackButtonRef.current?.focus());
  }, [bonusActive, bonusAward, bonusOpen]);

  const trapBonusFocus = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Tab") return;
      const dialog = bonusDialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [],
  );

  const ticker = useMemo(() => TICKER_LINES[spins % TICKER_LINES.length], [spins]);

  return (
    <div className="possum-payday-route">
      <main className="game-shell">
      <div className="background-scenery" aria-hidden="true" />
      <div className="screen-grain" aria-hidden="true" />

      {sparks.length > 0 && (
        <div className="spark-shower" aria-hidden="true">
          {sparks.map((spark) => (
            <i
              key={spark.id}
              style={
                {
                  left: `${spark.left}%`,
                  background: spark.color,
                  animationDelay: `${spark.delay}s`,
                  "--drift": `${spark.drift}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      <header className="topbar">
        <div className="brand-lockup" aria-label="Possum Payday Family Fortune Reels">
          <span className="brand-kicker">MONOSYTH STUDIO PRESENTS</span>
          <div className="brand-title">
            <span>POSSUM</span>
            <strong>PAYDAY</strong>
          </div>
          <span className="brand-subtitle">FAMILY FORTUNE REELS</span>
        </div>

        <div className="header-actions">
          <Link href="/app" className="utility-button studio-back-button">
            ← STUDIO
          </Link>
          <button
            className="utility-button rules-button"
            type="button"
            disabled={isSpinning || bonusPending || bonusOpen}
            onClick={() => setShowRules(true)}
          >
            HOW TO WIN
          </button>
          <button
            className="utility-button sound-button"
            type="button"
            aria-pressed={soundOn}
            onClick={() => setSoundOn((value) => !value)}
          >
            {soundOn ? "SOUND: ROWDY" : "SOUND: HUSH"}
          </button>
        </div>
      </header>

      <div className="news-ticker" aria-live="polite">
        <span className="ticker-label">DITCHWIRE NEWS</span>
        <span>{ticker}</span>
      </div>

      <section className="machine-stage" aria-label="Possum Payday slot machine">
        <aside className="side-card left-card">
          <div className="card-bulbs" aria-hidden="true" />
          <span className="side-eyebrow">TONIGHT ONLY*</span>
          <h2>6×5 FAMILY CHAOS</h2>
          <p>
            Match the same kin across 3+ reels from the left. Every matching face
            makes another way to win.
          </p>
          <div className="mini-stat">
            <span>BEST HAUL</span>
            <strong>{bestWin.toLocaleString()}</strong>
          </div>
          <div className="mini-stat">
            <span>SPINS SURVIVED</span>
            <strong>{spins}</strong>
          </div>
          <small>*Nobody checked with the county.</small>
        </aside>

        <div
          className={`slot-cabinet ${isSpinning ? "is-spinning" : ""} ${activeWinLine ? "has-win-tour" : ""} ${isAnticipating ? "is-anticipating" : ""}`}
        >
          <div className="cabinet-top">
            <span className="county-seal">P</span>
            <div>
              <span className="cabinet-label">WAITE COUNTY FAIRGROUNDS</span>
              <strong aria-live="polite" aria-atomic="true">{message}</strong>
            </div>
            <span className="county-seal">P</span>
          </div>

          <div
            className={`feature-strip ${isAnticipating ? "is-anticipating" : ""}`}
            aria-label={`${Math.min(scatterProgress, 3)} of 3 Golden Thrones landed. Three start six Goat Rodeo free spins.`}
          >
            <span
              className="feature-live-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {isSpinning
                ? `${Math.min(scatterProgress, 3)} of 3 Golden Thrones landed.`
                : ""}
            </span>
            <div className="feature-thrones" aria-hidden="true">
              {Array.from({ length: 3 }, (_, index) => (
                <span
                  className={scatterProgress > index ? "is-lit" : ""}
                  key={index}
                >
                  <Image
                    src="/possum-payday/art/symbols/golden-throne.png"
                    alt=""
                    width={64}
                    height={64}
                  />
                </span>
              ))}
            </div>
            <div className="feature-strip-copy">
              <span>{isAnticipating ? "ONE MORE OPENS THE GATE" : "GOAT RODEO FEATURE"}</span>
              <strong>3 GOLDEN THRONES START THE RODEO</strong>
            </div>
            <div className="feature-spin-award">
              <span>AUTO FREE SPINS</span>
              <strong>{BONUS_SPIN_COUNT}</strong>
            </div>
          </div>

          <div className="reel-bezel">
            <div className="reel-order" aria-hidden="true">
              {Array.from({ length: REEL_COUNT }, (_, reel) => (
                <span
                  className={
                    isAnticipating && reel === REEL_COUNT - 1
                      ? "is-anticipating"
                      : spinningReels.has(reel)
                      ? "is-reel-running"
                      : settledReelCount > reel
                        ? "is-reel-locked"
                        : ""
                  }
                  key={reel}
                >
                  REEL {reel + 1}
                </span>
              ))}
            </div>
            <div
              className={`reel-grid ${activeWinLine ? "has-win-tour" : ""}`}
              role="grid"
              aria-label="Six reel by five row slot grid"
              aria-busy={isSpinning}
            >
              {grid.map((symbolId, index) => {
                const symbol = SYMBOL_MAP[symbolId];
                const reel = index % REEL_COUNT;
                const winning = winningCells.has(index);
                const activeWay = activeWinCells.has(index);
                const reelSpinning = spinningReels.has(reel);
                const reelSettling = settlingReel === reel;
                return (
                  <div
                    className={[
                      "symbol-tile",
                      reelSpinning ? "is-reel-spinning" : "",
                      reelSettling ? "is-reel-settling" : "",
                      isAnticipating && reel === REEL_COUNT - 1
                        ? "is-anticipating"
                        : "",
                      winning ? "is-winner is-way-member" : "",
                      activeWay ? "is-active-way" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={index}
                    role="gridcell"
                    data-family={symbol.family.toLowerCase()}
                    aria-label={`Reel ${reel + 1}, row ${Math.floor(index / REEL_COUNT) + 1}: ${symbol.name}${winning ? ", winning symbol" : ""}`}
                    style={
                      {
                        "--reel": reel,
                        "--symbol-top": symbol.palette.top,
                        "--symbol-deep": symbol.palette.deep,
                        "--symbol-accent": symbol.palette.accent,
                        "--symbol-glow": symbol.palette.glow,
                        "--payline-color": activeWay
                          ? activeWinLine?.color
                          : undefined,
                      } as React.CSSProperties
                    }
                  >
                    <div className="symbol-glow" aria-hidden="true" />
                    <Image
                      src={symbol.image}
                      alt=""
                      width={240}
                      height={240}
                      draggable={false}
                    />
                    <span className="symbol-fallback" aria-hidden="true">
                      {symbol.fallback}
                    </span>
                    {symbol.id === "throne" ? (
                      <span className="scatter-ribbon" aria-hidden="true">
                        RODEO
                      </span>
                    ) : null}
                    <span className="symbol-name">{symbol.name}</span>
                  </div>
                );
              })}

              {activeWinLine && !isSpinning ? (
                <svg
                  key={activeWinLine.id}
                  className={`payline-overlay ${activeWinLine.kind === "scatter" ? "is-scatter-line" : ""}`}
                  viewBox={`0 0 ${REEL_COUNT * 100} ${ROW_COUNT * 100}`}
                  preserveAspectRatio="none"
                  style={
                    { "--payline-color": activeWinLine.color } as React.CSSProperties
                  }
                  aria-hidden="true"
                >
                  {activeWinLine.kind === "ways" ? (
                    <>
                      <polyline
                        className="payline-shadow"
                        points={activeWinLine.cells.map(pointForCell).join(" ")}
                        vectorEffect="non-scaling-stroke"
                      />
                      <polyline
                        className="payline-beam"
                        points={activeWinLine.cells.map(pointForCell).join(" ")}
                        pathLength={1}
                        vectorEffect="non-scaling-stroke"
                      />
                    </>
                  ) : null}
                  {activeWinLine.cells.map((cell) => (
                    <circle
                      className="payline-node"
                      cx={(cell % REEL_COUNT) * 100 + 50}
                      cy={Math.floor(cell / REEL_COUNT) * 100 + 50}
                      r="19"
                      vectorEffect="non-scaling-stroke"
                      key={cell}
                    />
                  ))}
                </svg>
              ) : null}
            </div>

            {activeWinLine && !isSpinning ? (
              <div
                className={`combo-banner ${activeWinLine.kind === "scatter" ? "is-scatter-combo" : ""}`}
                style={
                  { "--payline-color": activeWinLine.color } as React.CSSProperties
                }
                aria-hidden="true"
              >
                <span>
                  {activeWinLine.kind === "scatter"
                    ? "SCATTER"
                    : `WAY ${activeWinLineIndex + 1}/${winLines.length}`}
                </span>
                <strong>{activeWinLine.label}</strong>
                <em>+{activeWinLine.amount.toLocaleString()} CR</em>
              </div>
            ) : null}
          </div>

          <div className="win-meter" aria-live="polite">
            <span>LAST COMMOTION</span>
            <strong>{lastWin.toLocaleString()}</strong>
            <em>CREDITS</em>
          </div>

          <div className="control-deck">
            <div className="credit-display">
              <span>BEAN JAR</span>
              <strong>{credits.toLocaleString()}</strong>
            </div>

            <div className="bet-picker" aria-label="Choose your bet">
              <span>WAGER</span>
              <div>
                {[25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={bet === amount ? "active" : ""}
                    disabled={isSpinning || bonusOpen || bonusPending}
                    onClick={() => setBet(amount)}
                    aria-pressed={bet === amount}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            <button
              ref={spinButtonRef}
              className="spin-button"
              type="button"
              disabled={isSpinning || bonusOpen || bonusPending}
              onClick={() => void spin()}
              aria-label={isSpinning ? "Reels spinning" : `Spin for ${bet} credits`}
            >
              <span>{isSpinning ? "HANG ON" : bonusPending ? "BONUS!" : "YANK IT"}</span>
              <small>{isSpinning ? "PARTS FLYIN'" : bonusPending ? "GOAT LOOSE" : "SPACEBAR"}</small>
            </button>
          </div>
        </div>

        <aside className="side-card bonus-card">
          <div className="bonus-goat-peek" aria-hidden="true">
            <Image
              src="/possum-payday/art/symbols/billy-goat.png"
              alt=""
              width={240}
              height={240}
            />
          </div>
          <span className="side-eyebrow">SIDE HUSTLE</span>
          <h2>GOAT RODEO</h2>
          <p>
            Three rare Golden Thrones start six free spins. Collect Golden
            Billys to turn the raccoon, mower, then truck into Billy for the
            rest of the rodeo.
          </p>
          <div className="bonus-badge">
            <span>6 FREE SPINS</span>
            <small>3 THRONES START</small>
          </div>
          <div className="warning-stamp">GOLDEN BILLYS<br />UPGRADE REELS</div>
        </aside>
      </section>

      <section className="paytable" aria-labelledby="paytable-title">
        <div className="section-heading">
          <span>MEET THE LIABILITY</span>
          <h2 id="paytable-title">THE FAMILY &amp; OTHER BAD DECISIONS</h2>
          <p>Shown as 3 / 4 / 5 / 6 reels. More copies per reel create more winning ways.</p>
        </div>
        <div className="symbol-roster">
          {SYMBOLS.map((symbol) => (
            <article
              className="roster-card"
              data-family={symbol.family.toLowerCase()}
              key={symbol.id}
              style={
                {
                  "--symbol-top": symbol.palette.top,
                  "--symbol-deep": symbol.palette.deep,
                  "--symbol-accent": symbol.palette.accent,
                  "--symbol-glow": symbol.palette.glow,
                } as React.CSSProperties
              }
            >
              <span className="rarity-tag">{symbol.family} · {symbol.rarity}</span>
              <div className="roster-art">
                <Image src={symbol.image} alt="" width={240} height={240} />
                <span>{symbol.fallback}</span>
              </div>
              <h3>{symbol.name}</h3>
              <p>{symbol.nickname}</p>
              <strong>
                {symbol.id === "throne"
                  ? "3+ → BONUS"
                  : symbol.pays.map((rate) => `${rate}×`).join(" / ")}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <span>FICTIONAL CREDITS · NO CASH VALUE</span>
        <strong>BUILT SOMEWHERE BETWEEN THE JUNKYARD AND THE PIE CONTEST</strong>
        <span>NO GOATS WERE CONSULTED</span>
      </footer>

      {bonusOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            ref={bonusDialogRef}
            className="bonus-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bonus-title"
            aria-describedby="bonus-description"
            tabIndex={-1}
            onKeyDown={trapBonusFocus}
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeBonus}
              disabled={bonusActive}
              aria-label="Close Goat Rodeo bonus"
            >
              ×
            </button>

            <div className="bonus-copy">
              <span className="bonus-kicker">
                {bonusActive ? "AUTOMATIC FREE GAMES" : "COUNTY AUDIT FAILED"}
              </span>
              <h2 id="bonus-title">GOAT RODEO</h2>
              <p id="bonus-description">{bonusMessage}</p>
              <div className="bonus-scoreboard">
                <div>
                  <span>FREE SPIN</span>
                  <strong>
                    {bonusPhase === "intro"
                      ? "READY"
                      : `${Math.min(bonusSpinIndex + 1, BONUS_SPIN_COUNT)}/${BONUS_SPIN_COUNT}`}
                  </strong>
                </div>
                <div>
                  <span>GOLDEN BILLYS</span>
                  <strong>{bonusCollected}</strong>
                </div>
                <div>
                  <span>BONUS WIN</span>
                  <strong>{bonusRunningTotal.toLocaleString()}</strong>
                </div>
              </div>

              <div className="goat-collection-track" aria-label="Golden Billy upgrade milestones">
                {BONUS_MILESTONES.map((milestone) => {
                  const unlocked = bonusUnlocked.includes(milestone.target);
                  return (
                    <div
                      className={`collection-milestone ${unlocked ? "is-unlocked" : ""}`}
                      key={milestone.target}
                    >
                      <span>{milestone.at} BILLIES</span>
                      <div aria-hidden="true">
                        <Image
                          src={SYMBOL_MAP[milestone.target].image}
                          alt=""
                          width={68}
                          height={68}
                        />
                        <b>→</b>
                        <Image
                          src={SYMBOL_MAP.goat.image}
                          alt=""
                          width={68}
                          height={68}
                        />
                      </div>
                      <small>{milestone.label} BECOMES BILLY</small>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`bonus-reel-stage phase-${bonusPhase}`}>
              <div className="bonus-reel-topline" aria-hidden="true">
                <span>WAITE COUNTY RODEO REELS</span>
                <strong>BET {bonusBet}</strong>
              </div>
              <div
                className="bonus-reel-grid"
                role="grid"
                aria-label="Six reel by five row Goat Rodeo free spin grid"
                aria-busy={bonusPhase === "spinning"}
              >
                {bonusGrid.map((symbolId, index) => {
                  const symbol = SYMBOL_MAP[symbolId];
                  const reel = index % REEL_COUNT;
                  const golden = bonusGoldenCells.has(index);
                  const transformed = bonusTransformedCells.has(index);
                  const winning = bonusWinningCells.has(index);
                  return (
                  <div
                    key={index}
                    className={[
                      "bonus-symbol-tile",
                      bonusSpinningReels.has(reel) ? "is-spinning" : "",
                      golden ? "is-golden-billy" : "",
                      transformed ? "is-transformed" : "",
                      winning ? "is-winner" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-family={symbol.family.toLowerCase()}
                    role="gridcell"
                    aria-label={`Free spin reel ${reel + 1}, row ${Math.floor(index / REEL_COUNT) + 1}: ${golden ? "Golden Billy collection symbol" : symbol.name}${winning ? ", winning symbol" : ""}`}
                    style={
                      {
                        "--symbol-top": symbol.palette.top,
                        "--symbol-deep": symbol.palette.deep,
                        "--symbol-accent": symbol.palette.accent,
                        "--symbol-glow": symbol.palette.glow,
                      } as React.CSSProperties
                    }
                  >
                    <Image
                      src={symbol.image}
                      alt=""
                      width={160}
                      height={160}
                      draggable={false}
                    />
                    {golden ? <span className="golden-billy-sash">GOLDEN</span> : null}
                  </div>
                  );
                })}
              </div>
              <div className="bonus-spin-plates" aria-hidden="true">
                {Array.from({ length: BONUS_SPIN_COUNT }, (_, index) => (
                  <span
                    className={
                      bonusPhase === "complete" || index < bonusSpinIndex
                        ? "is-complete"
                        : index === bonusSpinIndex && bonusPhase !== "intro"
                          ? "is-current"
                          : ""
                    }
                    key={index}
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
              <div className="bonus-phase-callout" role="status" aria-live="polite">
                <span>{bonusPhase.replace("-", " ")}</span>
                <strong>{bonusMessage}</strong>
                {bonusSpinWin > 0 && bonusPhase === "showing-win" ? (
                  <em>+{bonusSpinWin.toLocaleString()} CREDITS</em>
                ) : null}
              </div>
            </div>

            <div className="bonus-footer">
              {bonusActive && (
                <div className="bonus-live-controls">
                  <strong className="live-callout">HANDS OFF — THE RODEO RUNS ITSELF</strong>
                  <button type="button" onClick={completeBonus}>SKIP TO TOTAL</button>
                </div>
              )}
              {!bonusActive && (
                <div className="bonus-result" aria-live="polite">
                  <span>{BONUS_SPIN_COUNT} FREE SPINS COMPLETE</span>
                  <strong>+{bonusAward.toLocaleString()} CREDITS</strong>
                  <button ref={bonusBackButtonRef} type="button" onClick={closeBonus}>
                    BACK TO THE REELS
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {showRules && (
        <div className="modal-backdrop rules-backdrop" role="presentation">
          <section className="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowRules(false)}
              aria-label="Close rules"
            >
              ×
            </button>
            <span className="bonus-kicker">READING IS TECHNICALLY ALLOWED</span>
            <h2 id="rules-title">HOW THIS CONTRAPTION PAYS</h2>
            <ol>
              <li><strong>Pick a wager.</strong> Every spin uses 25, 50, or 100 fictional credits.</li>
              <li><strong>Match left to right.</strong> The same symbol on 3, 4, 5, or 6 consecutive reels wins.</li>
              <li><strong>Stack the family.</strong> Multiple copies on each reel multiply the number of winning ways.</li>
              <li><strong>Find 3 rare Golden Thrones.</strong> They pay anywhere and kick open Goat Rodeo.</li>
              <li><strong>Ride six free spins.</strong> Goat Rodeo plays automatically—no tapping or chasing required.</li>
              <li><strong>Collect Golden Billys.</strong> At 2, 5, and 8, they permanently turn the raccoon, mower, then truck into Billy for the rest of the feature.</li>
            </ol>
            <button className="rules-got-it" type="button" onClick={() => setShowRules(false)}>
              I RECKON I GOT IT
            </button>
          </section>
        </div>
      )}
      </main>
    </div>
  );
}
