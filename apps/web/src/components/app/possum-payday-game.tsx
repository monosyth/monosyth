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
  pays: [number, number, number];
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
    pays: [0.55, 1.25, 3.2],
    rarity: "LEGEND",
  },
  {
    id: "uncle",
    name: "Uncle Bo",
    nickname: "Bass pro emeritus",
    image: "/possum-payday/art/symbols/uncle-bo.png",
    fallback: "UB",
    weight: 5,
    pays: [0.42, 1, 2.5],
    rarity: "PREMIUM",
  },
  {
    id: "goat",
    name: "Billy",
    nickname: "Certified fence tester",
    image: "/possum-payday/art/symbols/billy-goat.png",
    fallback: "GOAT",
    weight: 7,
    pays: [0.32, 0.78, 1.9],
    rarity: "WILD-ISH",
  },
  {
    id: "possum",
    name: "Earl",
    nickname: "Night-shift management",
    image: "/possum-payday/art/symbols/earl-possum.png",
    fallback: "EP",
    weight: 8,
    pays: [0.26, 0.62, 1.5],
    rarity: "SLICK",
  },
  {
    id: "truck",
    name: "Mud Majesty",
    nickname: "Zero miles per gallon",
    image: "/possum-payday/art/symbols/mud-truck.png",
    fallback: "4×4",
    weight: 10,
    pays: [0.2, 0.48, 1.15],
    rarity: "LOUD",
  },
  {
    id: "mower",
    name: "Yard Ferrari",
    nickname: "Street questionably legal",
    image: "/possum-payday/art/symbols/mower-racer.png",
    fallback: "MOW",
    weight: 10,
    pays: [0.17, 0.4, 0.95],
    rarity: "TUNED",
  },
  {
    id: "raccoon",
    name: "Hubcap Bandit",
    nickname: "Shiny-object consultant",
    image: "/possum-payday/art/symbols/raccoon-bandit.png",
    fallback: "RB",
    weight: 12,
    pays: [0.14, 0.33, 0.8],
    rarity: "FERAL",
  },
  {
    id: "throne",
    name: "Golden Throne",
    nickname: "3+ starts Goat Rodeo",
    image: "/possum-payday/art/symbols/golden-throne.png",
    fallback: "BONUS",
    weight: 3,
    pays: [0, 0, 0],
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
  "raccoon",
  "uncle",
  "mower",
  "goat",
  "truck",
  "throne",
  "possum",
  "goat",
  "mama",
  "raccoon",
  "truck",
  "mower",
  "possum",
  "uncle",
  "throne",
  "goat",
  "raccoon",
  "truck",
  "mower",
  "mama",
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

const weightedBag = SYMBOLS.flatMap((symbol) =>
  Array.from({ length: symbol.weight }, () => symbol.id),
);

function randomSymbol(): SymbolId {
  return weightedBag[Math.floor(Math.random() * weightedBag.length)];
}

function randomGrid(): SymbolId[] {
  return Array.from({ length: 25 }, randomSymbol);
}

function pause(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function evaluateGrid(grid: SymbolId[], bet: number) {
  let payout = 0;
  const winningCells = new Set<number>();
  const wins: string[] = [];

  for (const symbol of SYMBOLS) {
    if (symbol.id === "throne") continue;

    const columnCounts = Array.from({ length: 5 }, (_, column) => {
      let count = 0;
      for (let row = 0; row < 5; row += 1) {
        if (grid[row * 5 + column] === symbol.id) count += 1;
      }
      return count;
    });

    let columns = 0;
    while (columns < 5 && columnCounts[columns] > 0) columns += 1;
    if (columns < 3) continue;

    const ways = columnCounts
      .slice(0, columns)
      .reduce((total, count) => total * count, 1);
    const rate = symbol.pays[columns - 3];
    const amount = Math.max(1, Math.round((bet * rate * ways) / 3));
    payout += amount;
    wins.push(`${symbol.name} ${columns}×${ways} ways`);

    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < 5; row += 1) {
        const index = row * 5 + column;
        if (grid[index] === symbol.id) winningCells.add(index);
      }
    }
  }

  const scatterCells = grid
    .map((id, index) => (id === "throne" ? index : -1))
    .filter((index) => index >= 0);
  const bonusTriggered = scatterCells.length >= 3;
  if (bonusTriggered) {
    payout += bet * scatterCells.length * 2;
    scatterCells.forEach((index) => winningCells.add(index));
    wins.push(`${scatterCells.length} Golden Thrones`);
  }

  return { payout, winningCells, wins, bonusTriggered, scatterCells };
}

type Spark = {
  id: number;
  left: number;
  delay: number;
  color: string;
  drift: number;
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
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [showRules, setShowRules] = useState(false);

  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusActive, setBonusActive] = useState(false);
  const [bonusTime, setBonusTime] = useState(10);
  const [goatSpot, setGoatSpot] = useState(4);
  const [catches, setCatches] = useState(0);
  const [bonusAward, setBonusAward] = useState(0);
  const catchesRef = useRef(0);
  const soundRef = useRef(soundOn);

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const playTone = useCallback(
    (frequency: number, duration = 0.08, type: OscillatorType = "square") => {
      if (!soundRef.current) return;
      const AudioContextCtor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) return;
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(80, frequency * 0.72),
        context.currentTime + duration,
      );
      gain.gain.setValueAtTime(0.055, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
      oscillator.addEventListener("ended", () => context.close());
    },
    [],
  );

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
    setBonusOpen(true);
    setBonusActive(false);
    setBonusTime(10);
    setBonusAward(0);
    setCatches(0);
    catchesRef.current = 0;
    playTone(220, 0.18, "sawtooth");
    window.setTimeout(() => playTone(440, 0.18, "sawtooth"), 130);
  }, [playTone]);

  const spin = useCallback(async () => {
    if (isSpinning || bonusOpen) return;
    if (credits < bet) {
      setMessage("MAMA SAYS YOU'RE OUTTA BEANS.");
      playTone(110, 0.3, "sawtooth");
      return;
    }

    setCredits((value) => value - bet);
    setSpins((value) => value + 1);
    setLastWin(0);
    setWinningCells(new Set());
    setIsSpinning(true);
    setMessage("RATTLIN' THE FAMILY TREE…");
    playTone(145, 0.18, "sawtooth");

    for (let frame = 0; frame < 11; frame += 1) {
      await pause(48 + frame * 7);
      setGrid(randomGrid());
      if (frame % 2 === 0) playTone(180 + frame * 13, 0.035, "square");
    }

    const finalGrid = randomGrid();
    const result = evaluateGrid(finalGrid, bet);
    setGrid(finalGrid);
    setWinningCells(result.winningCells);
    setLastWin(result.payout);
    setBestWin((value) => Math.max(value, result.payout));
    setCredits((value) => value + result.payout);
    setIsSpinning(false);

    if (result.bonusTriggered) {
      setMessage("GOLDEN THRONES! SOMEBODY LEFT THE GOAT GATE OPEN!");
      showerSparks(true);
      playTone(520, 0.25, "triangle");
      window.setTimeout(openBonus, 1300);
    } else if (result.payout > bet * 8) {
      setMessage("FAMILY FORTUNE! EVEN THE POSSUM STOOD UP!");
      showerSparks(true);
      playTone(620, 0.3, "triangle");
    } else if (result.payout > 0) {
      setMessage(
        result.wins.length > 1
          ? `${result.wins.length} WAYS HIT — PASS THE GRAVY!`
          : `${result.wins[0]} — WELL BUTTER MY BOOTS!`,
      );
      showerSparks(false);
      playTone(440, 0.2, "triangle");
    } else {
      setMessage(LOSS_LINES[Math.floor(Math.random() * LOSS_LINES.length)]);
      playTone(95, 0.22, "sawtooth");
    }
  }, [bet, bonusOpen, credits, isSpinning, openBonus, playTone, showerSparks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat && !bonusOpen) {
        event.preventDefault();
        void spin();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bonusOpen, spin]);

  const startBonus = () => {
    catchesRef.current = 0;
    setCatches(0);
    setBonusAward(0);
    setBonusTime(10);
    setGoatSpot(Math.floor(Math.random() * 9));
    setBonusActive(true);
    playTone(330, 0.25, "sawtooth");
  };

  useEffect(() => {
    if (!bonusActive) return;

    const shuffleTimer = window.setInterval(() => {
      setGoatSpot((current) => {
        let next = Math.floor(Math.random() * 9);
        if (next === current) next = (next + 3) % 9;
        return next;
      });
    }, 690);

    const clockTimer = window.setInterval(() => {
      setBonusTime((value) => {
        if (value > 1) return value - 1;

        window.clearInterval(shuffleTimer);
        window.clearInterval(clockTimer);
        setBonusActive(false);
        const award = Math.max(bet * 2, catchesRef.current * bet);
        setBonusAward(award);
        setCredits((current) => current + award);
        setBestWin((current) => Math.max(current, award));
        showerSparks(catchesRef.current >= 6);
        playTone(catchesRef.current >= 6 ? 660 : 420, 0.35, "triangle");
        return 0;
      });
    }, 1000);

    return () => {
      window.clearInterval(shuffleTimer);
      window.clearInterval(clockTimer);
    };
  }, [bet, bonusActive, playTone, showerSparks]);

  const catchGoat = () => {
    if (!bonusActive) return;
    catchesRef.current += 1;
    setCatches(catchesRef.current);
    setGoatSpot((current) => (current + 2 + Math.floor(Math.random() * 6)) % 9);
    playTone(280 + catchesRef.current * 22, 0.09, "square");
  };

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
          <h2>5×5 FAMILY CHAOS</h2>
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

        <div className={`slot-cabinet ${isSpinning ? "is-spinning" : ""}`}>
          <div className="cabinet-top">
            <span className="county-seal">P</span>
            <div>
              <span className="cabinet-label">WAITE COUNTY FAIRGROUNDS</span>
              <strong>{message}</strong>
            </div>
            <span className="county-seal">P</span>
          </div>

          <div className="reel-bezel">
            <div className="reel-grid" role="grid" aria-label="Five by five slot reels">
              {grid.map((symbolId, index) => {
                const symbol = SYMBOL_MAP[symbolId];
                const winning = winningCells.has(index);
                return (
                  <div
                    className={`symbol-tile ${winning ? "is-winner" : ""}`}
                    key={`${index}-${symbolId}`}
                    role="gridcell"
                    aria-label={`${symbol.name}${winning ? ", winning symbol" : ""}`}
                    style={{ "--reel": index % 5 } as React.CSSProperties}
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
            </div>
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
                    disabled={isSpinning}
                    onClick={() => setBet(amount)}
                    aria-pressed={bet === amount}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="spin-button"
              type="button"
              disabled={isSpinning || bonusOpen}
              onClick={() => void spin()}
              aria-label={isSpinning ? "Reels spinning" : `Spin for ${bet} credits`}
            >
              <span>{isSpinning ? "HANG ON" : "YANK IT"}</span>
              <small>{isSpinning ? "PARTS FLYIN'" : "SPACEBAR"}</small>
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
            Catch Billy before he repossesses the fairgrounds. Three Golden Thrones
            start it automatically.
          </p>
          <button className="bonus-launch" type="button" onClick={openBonus}>
            <span>PLAY BONUS</span>
            <small>OPEN FOR DEMO</small>
          </button>
          <div className="warning-stamp">LIVESTOCK<br />UNSUPERVISED</div>
        </aside>
      </section>

      <section className="paytable" aria-labelledby="paytable-title">
        <div className="section-heading">
          <span>MEET THE LIABILITY</span>
          <h2 id="paytable-title">THE FAMILY &amp; OTHER BAD DECISIONS</h2>
          <p>Shown as 3 / 4 / 5 reels. More copies per reel create more winning ways.</p>
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
            className="bonus-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bonus-title"
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setBonusOpen(false)}
              disabled={bonusActive}
              aria-label="Close Goat Rodeo bonus"
            >
              ×
            </button>

            <div className="bonus-copy">
              <span className="bonus-kicker">THE GATE IS OPEN</span>
              <h2 id="bonus-title">GOAT RODEO</h2>
              <p>Tap Billy every time he busts out of a hay bale. Ten seconds. No dignity.</p>
              <div className="bonus-scoreboard">
                <div>
                  <span>TIME</span>
                  <strong>{bonusTime}</strong>
                </div>
                <div>
                  <span>CATCHES</span>
                  <strong>{catches}</strong>
                </div>
                <div>
                  <span>VALUE</span>
                  <strong>{bet}</strong>
                </div>
              </div>
            </div>

            <div className={`rodeo-arena ${bonusActive ? "is-live" : ""}`}>
              <div className="arena-lights" aria-hidden="true" />
              <div className="rodeo-grid" aria-label="Goat catching arena">
                {Array.from({ length: 9 }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`hay-spot ${bonusActive && goatSpot === index ? "has-goat" : ""}`}
                    onClick={bonusActive && goatSpot === index ? catchGoat : undefined}
                    aria-label={
                      bonusActive && goatSpot === index
                        ? "Catch Billy the goat"
                        : "Empty hay bale"
                    }
                  >
                    <span className="hay-bale" aria-hidden="true" />
                    {bonusActive && goatSpot === index && (
                      <Image
                        src="/possum-payday/art/symbols/billy-goat.png"
                        alt="Billy the goat"
                        width={240}
                        height={240}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bonus-footer">
              {!bonusActive && bonusAward === 0 && (
                <button className="start-rodeo" type="button" onClick={startBonus}>
                  RELEASE THE GOAT
                </button>
              )}
              {bonusActive && <strong className="live-callout">TAP BILLY! TAP BILLY!</strong>}
              {!bonusActive && bonusAward > 0 && (
                <div className="bonus-result" aria-live="polite">
                  <span>{catches >= 6 ? "GOAT WHISPERER!" : "BARNYARD EFFORT!"}</span>
                  <strong>+{bonusAward.toLocaleString()} CREDITS</strong>
                  <button type="button" onClick={() => setBonusOpen(false)}>
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
              <li><strong>Match left to right.</strong> The same symbol on 3, 4, or 5 consecutive reels wins.</li>
              <li><strong>Stack the family.</strong> Multiple copies on each reel multiply the number of winning ways.</li>
              <li><strong>Find 3 Golden Thrones.</strong> They pay anywhere and kick open the Goat Rodeo bonus.</li>
              <li><strong>Catch Billy.</strong> Every catch in the ten-second bonus is worth your current wager.</li>
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
