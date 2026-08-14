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
  },
  {
    id: "goat",
    name: "Billy",
    nickname: "Certified fence tester",
    image: "/possum-payday/art/symbols/billy-goat.png",
    fallback: "GOAT",
    weight: 7,
    pays: [0.32, 0.78, 1.9, 4.5],
    rarity: "WILD-ISH",
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
const PAYLINE_COLORS = [
  "#ffd84d",
  "#45f1d3",
  "#ff6a3d",
  "#ff65c8",
  "#7fc8ff",
  "#d2ff65",
] as const;

type BonusPen = {
  label: string;
  multiplier: number;
  stamp: string;
};

const BONUS_PENS: readonly BonusPen[] = [
  { label: "Feed Tub", multiplier: 2, stamp: "CHOW" },
  { label: "Federal Mailbox", multiplier: 2, stamp: "USPS?" },
  { label: "Pie Tent", multiplier: 3, stamp: "PIE" },
  { label: "Mower Ramp", multiplier: 3, stamp: "MOW" },
  { label: "Mud Hole", multiplier: 4, stamp: "4×4" },
  { label: "Deputy's Cooler", multiplier: 5, stamp: "ICE" },
  { label: "Bait Shop", multiplier: 6, stamp: "WORMS" },
  { label: "Junkyard VIP", multiplier: 8, stamp: "VIP" },
  { label: "Golden Outhouse", multiplier: 10, stamp: "ROYAL" },
] as const;
const BONUS_TICKS = 18;

const weightedBag = SYMBOLS.flatMap((symbol) =>
  Array.from({ length: symbol.weight }, () => symbol.id),
);

function randomSymbol(): SymbolId {
  return weightedBag[Math.floor(Math.random() * weightedBag.length)];
}

function randomGrid(): SymbolId[] {
  return Array.from({ length: REEL_COUNT * ROW_COUNT }, randomSymbol);
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
) {
  return currentGrid.map((currentSymbol, index) => {
    const reel = index % REEL_COUNT;
    if (frame >= stopFrames[reel]) return finalGrid[index];
    return reducedMotion ? currentSymbol : randomSymbol();
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

  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusActive, setBonusActive] = useState(false);
  const [goatSpot, setGoatSpot] = useState(4);
  const [bonusWinner, setBonusWinner] = useState(-1);
  const [bonusBet, setBonusBet] = useState(bet);
  const [bonusAward, setBonusAward] = useState(0);
  const [bonusPending, setBonusPending] = useState(false);
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
  const prefersReducedMotionRef = useRef(false);
  const spinButtonRef = useRef<HTMLButtonElement | null>(null);
  const bonusDialogRef = useRef<HTMLElement | null>(null);
  const bonusBackButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeWinLine = winLines[activeWinLineIndex] ?? null;
  const activeWinCells = useMemo(
    () => new Set(activeWinLine?.cells ?? []),
    [activeWinLine],
  );
  const selectedBonusPen = BONUS_PENS[bonusWinner] ?? null;

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

  const openBonus = useCallback(() => {
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
    const winner = Math.floor(Math.random() * BONUS_PENS.length);
    bonusPendingRef.current = false;
    setBonusPending(false);
    setWinLines([]);
    setActiveWinLineIndex(0);
    setShowRules(false);
    setBonusOpen(true);
    setBonusActive(true);
    setBonusWinner(winner);
    setGoatSpot((winner + 4) % BONUS_PENS.length);
    setBonusBet(bet);
    setBonusAward(0);
    playTone(196, 0.18, "sawtooth", 0.042);
    playTone(330, 0.2, "sawtooth", 0.04, 0.11);
    playTone(220, 0.2, "sawtooth", 0.035, 0.24);
  }, [bet, playTone]);

  const closeBonus = useCallback(() => {
    if (bonusActive) return;
    bonusRunRef.current += 1;
    if (bonusAnimationTimerRef.current !== null) {
      window.clearTimeout(bonusAnimationTimerRef.current);
      bonusAnimationTimerRef.current = null;
    }
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
    const stopFrames: readonly number[] = reducedMotion
      ? Array.from({ length: REEL_COUNT }, (_, reel) => reel)
      : REEL_STOP_FRAMES;
    const frameDelay = reducedMotion ? REDUCED_SPIN_FRAME_MS : SPIN_FRAME_MS;

    setCredits((value) => value - bet);
    setSpins((value) => value + 1);
    setLastWin(0);
    setWinningCells(new Set());
    setWinLines([]);
    setActiveWinLineIndex(0);
    setSettledReelCount(0);
    setSettlingReel(null);
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
          setSettlingReel(stoppedReel);
          setSettledReelCount(stoppedReel + 1);
          setMessage(`REEL ${stoppedReel + 1} LOCKED — ${REEL_COUNT - stoppedReel - 1} STILL RAISING CAIN`);
          playReelStop(stoppedReel);
        }
      }

      if (spinRunRef.current !== runId) return;
      stopSpinMotor();
      const result = evaluateGrid(finalGrid, bet);
      setGrid(finalGrid);
      setSpinningReels(new Set());
      setSettledReelCount(REEL_COUNT);
      setWinningCells(result.winningCells);
      setWinLines(result.winLines);
      setActiveWinLineIndex(0);
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
          if (spinRunRef.current === runId) openBonus();
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
    if (!bonusOpen || !bonusActive || bonusWinner < 0) return;

    const runId = bonusRunRef.current + 1;
    bonusRunRef.current = runId;
    const reducedMotion = prefersReducedMotionRef.current;
    let tick = 0;
    let currentSpot = (bonusWinner + 4) % BONUS_PENS.length;

    const finishRodeo = () => {
      if (
        bonusRunRef.current !== runId ||
        bonusAwardedRef.current ||
        !BONUS_PENS[bonusWinner]
      ) {
        return;
      }

      bonusAwardedRef.current = true;
      bonusAnimationTimerRef.current = null;
      const winningPen = BONUS_PENS[bonusWinner];
      const award = bonusBet * winningPen.multiplier;
      setBonusAward(award);
      setCredits((current) => current + award);
      setLastWin(award);
      setBestWin((current) => Math.max(current, award));
      setMessage(
        `GOAT RODEO: ${winningPen.label.toUpperCase()} PAID ${winningPen.multiplier}×!`,
      );
      setBonusActive(false);
      showerSparks(winningPen.multiplier >= 8);
      playTone(392, 0.16, "triangle", 0.038);
      playTone(523, 0.2, "triangle", 0.035, 0.1);
      playTone(659, 0.26, "sine", 0.033, 0.21);
    };

    const advanceRodeo = () => {
      if (bonusRunRef.current !== runId) return;

      if (reducedMotion) {
        setGoatSpot(bonusWinner);
        playNoiseBurst(0.11, 0.032, 330);
        playTone(330, 0.12, "square", 0.03);
        bonusAnimationTimerRef.current = window.setTimeout(finishRodeo, 460);
        return;
      }

      if (tick >= BONUS_TICKS) {
        finishRodeo();
        return;
      }

      const isFinalTick = tick === BONUS_TICKS - 1;
      let nextSpot = bonusWinner;
      if (!isFinalTick) {
        do {
          nextSpot = Math.floor(Math.random() * BONUS_PENS.length);
        } while (nextSpot === currentSpot || (tick < BONUS_TICKS - 4 && nextSpot === bonusWinner));
      }

      currentSpot = nextSpot;
      setGoatSpot(nextSpot);
      playTone(165 + tick * 10, 0.045, "square", 0.012);
      if (tick % 4 === 0) playNoiseBurst(0.05, 0.014, 280 + tick * 18);
      if (isFinalTick) {
        playNoiseBurst(0.13, 0.04, 360);
        playTone(310, 0.14, "square", 0.034, 0.03);
        playTone(620, 0.17, "triangle", 0.03, 0.11);
      }

      tick += 1;
      const nextDelay = isFinalTick ? 720 : Math.max(112, 235 - tick * 5);
      bonusAnimationTimerRef.current = window.setTimeout(advanceRodeo, nextDelay);
    };

    bonusAnimationTimerRef.current = window.setTimeout(
      advanceRodeo,
      reducedMotion ? 320 : 470,
    );

    return () => {
      if (bonusRunRef.current === runId) bonusRunRef.current += 1;
      if (bonusAnimationTimerRef.current !== null) {
        window.clearTimeout(bonusAnimationTimerRef.current);
        bonusAnimationTimerRef.current = null;
      }
    };
  }, [
    bonusActive,
    bonusBet,
    bonusOpen,
    bonusWinner,
    playNoiseBurst,
    playTone,
    showerSparks,
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
          className={`slot-cabinet ${isSpinning ? "is-spinning" : ""} ${activeWinLine ? "has-win-tour" : ""}`}
        >
          <div className="cabinet-top">
            <span className="county-seal">P</span>
            <div>
              <span className="cabinet-label">WAITE COUNTY FAIRGROUNDS</span>
              <strong aria-live="polite" aria-atomic="true">{message}</strong>
            </div>
            <span className="county-seal">P</span>
          </div>

          <div className="reel-bezel">
            <div className="reel-order" aria-hidden="true">
              {Array.from({ length: REEL_COUNT }, (_, reel) => (
                <span
                  className={
                    spinningReels.has(reel)
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
                      winning ? "is-winner is-way-member" : "",
                      activeWay ? "is-active-way" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={index}
                    role="gridcell"
                    aria-label={`Reel ${reel + 1}, row ${Math.floor(index / REEL_COUNT) + 1}: ${symbol.name}${winning ? ", winning symbol" : ""}`}
                    style={
                      {
                        "--reel": reel,
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
            Three rare Golden Thrones send Billy stampeding through nine prize
            pens. He picks the multiplier. You do nothing.
          </p>
          <div className="bonus-badge">
            <span>AUTO BONUS</span>
            <small>LAND 3 THRONES</small>
          </div>
          <div className="warning-stamp">LIVESTOCK<br />UNSUPERVISED</div>
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
            <article className="roster-card" key={symbol.id}>
              <span className="rarity-tag">{symbol.rarity}</span>
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
                {bonusActive ? "BILLY IS PICKING" : "COUNTY AUDIT FAILED"}
              </span>
              <h2 id="bonus-title">GOAT RODEO</h2>
              <p id="bonus-description">
                {bonusActive
                  ? "No tapping. No chasing. Billy will automatically choose one deeply uninsured prize pen."
                  : `${selectedBonusPen?.label ?? "A prize pen"} survived just long enough to pay the bill.`}
              </p>
              <div className="bonus-scoreboard">
                <div>
                  <span>TRIGGER BET</span>
                  <strong>{bonusBet}</strong>
                </div>
                <div>
                  <span>MULTIPLIER</span>
                  <strong>
                    {bonusActive ? "??" : `${selectedBonusPen?.multiplier ?? 0}×`}
                  </strong>
                </div>
                <div>
                  <span>RODEO WIN</span>
                  <strong>{bonusActive ? "—" : bonusAward.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className={`rodeo-arena ${bonusActive ? "is-live" : ""}`}>
              <div className="arena-lights" aria-hidden="true" />
              <div className="rodeo-grid" aria-hidden="true">
                {BONUS_PENS.map((pen, index) => (
                  <div
                    key={pen.label}
                    className={[
                      "hay-spot",
                      goatSpot === index ? "has-goat" : "",
                      !bonusActive && bonusWinner === index
                        ? "is-winning-pen"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="bonus-pen-stamp">{pen.stamp}</span>
                    <span className="bonus-multiplier">{pen.multiplier}×</span>
                    <span className="hay-bale" />
                    <small>{pen.label}</small>
                    {goatSpot === index && (
                      <Image
                        src="/possum-payday/art/symbols/billy-goat.png"
                        alt=""
                        width={240}
                        height={240}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="bonus-status" role="status" aria-live="polite">
                {bonusActive
                  ? "Billy is automatically choosing a prize multiplier."
                  : `Billy chose ${selectedBonusPen?.label ?? "a prize pen"} for ${selectedBonusPen?.multiplier ?? 0} times the triggering wager.`}
              </p>
            </div>

            <div className="bonus-footer">
              {bonusActive && (
                <strong className="live-callout">
                  HANDS OFF — BILLY IS MAKING A FINANCIAL DECISION
                </strong>
              )}
              {!bonusActive && bonusAward > 0 && (
                <div className="bonus-result" aria-live="polite">
                  <span>{selectedBonusPen?.label ?? "PRIZE PEN"}!</span>
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
              <li><strong>Let Billy choose.</strong> The automatic rodeo lands on a prize pen and multiplies the triggering wager—no tapping required.</li>
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
