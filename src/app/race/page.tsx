"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { formatTime, getLengthsForEvent } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Swimmer {
  id: number;
  firstName: string;
  lastName: string;
  usaSwimmingId: string | null;
  _count: { times: number };
}

interface SwimTime {
  id: number;
  eventName: string;
  timeInSeconds: number;
  date: string;
  meetName: string;
  course: string;
  swimmer: { firstName: string; lastName: string };
}

interface LaneConfig {
  swimmerId: number | null;
  swimmerSearch: string;
  eventName: string;
  timeId: number | null;
  timeInSeconds: number | null;
  lengths: number;
  color: string;
  label: string;
}

interface RaceResult {
  lane: number;
  label: string;
  time: number;
  rank: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NUM_LANES = 10;

const LANE_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#14b8a6", // teal
];

function emptyLane(index: number): LaneConfig {
  return {
    swimmerId: null,
    swimmerSearch: "",
    eventName: "",
    timeId: null,
    timeInSeconds: null,
    lengths: 1,
    color: LANE_COLORS[index % LANE_COLORS.length],
    label: "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RaceSimulatorPage() {
  // Swimmers list from API
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [swimmersLoading, setSwimmersLoading] = useState(true);

  // Per-swimmer times cache: swimmerId -> SwimTime[]
  const [timesCache, setTimesCache] = useState<Record<number, SwimTime[]>>({});

  // Lane configurations
  const [lanes, setLanes] = useState<LaneConfig[]>(
    Array.from({ length: NUM_LANES }, (_, i) => emptyLane(i))
  );

  // Race state
  const [raceState, setRaceState] = useState<
    "idle" | "running" | "finished"
  >("idle");
  const [raceElapsed, setRaceElapsed] = useState(0);
  const [results, setResults] = useState<RaceResult[]>([]);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const raceStartRef = useRef<number>(0);
  const finishedLanesRef = useRef<Set<number>>(new Set());
  const resultsRef = useRef<RaceResult[]>([]);

  // Dropdown open states
  const [openSwimmerDropdown, setOpenSwimmerDropdown] = useState<number | null>(null);
  const [openEventDropdown, setOpenEventDropdown] = useState<number | null>(null);
  const [openTimeDropdown, setOpenTimeDropdown] = useState<number | null>(null);

  // Refs for click-outside handling
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  // -----------------------------------------------------------------------
  // Fetch swimmers
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetch("/api/swimmers")
      .then((r) => r.json())
      .then((data: Swimmer[]) => setSwimmers(data))
      .catch(console.error)
      .finally(() => setSwimmersLoading(false));
  }, []);

  // -----------------------------------------------------------------------
  // Fetch times for a swimmer (cached)
  // -----------------------------------------------------------------------

  const fetchTimesForSwimmer = useCallback(
    async (swimmerId: number) => {
      if (timesCache[swimmerId]) return timesCache[swimmerId];
      try {
        const res = await fetch(`/api/swimmers/${swimmerId}/times`);
        const data: SwimTime[] = await res.json();
        setTimesCache((prev) => ({ ...prev, [swimmerId]: data }));
        return data;
      } catch {
        return [];
      }
    },
    [timesCache]
  );

  // -----------------------------------------------------------------------
  // Close dropdowns on outside click
  // -----------------------------------------------------------------------

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const isInsideAny = dropdownRefs.current.some(
        (ref) => ref && ref.contains(target)
      );
      if (!isInsideAny) {
        setOpenSwimmerDropdown(null);
        setOpenEventDropdown(null);
        setOpenTimeDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // -----------------------------------------------------------------------
  // Lane update helpers
  // -----------------------------------------------------------------------

  function updateLane(index: number, partial: Partial<LaneConfig>) {
    setLanes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...partial };
      return next;
    });
  }

  async function selectSwimmer(laneIndex: number, swimmer: Swimmer) {
    const label = `${swimmer.firstName} ${swimmer.lastName}`;
    updateLane(laneIndex, {
      swimmerId: swimmer.id,
      swimmerSearch: label,
      eventName: "",
      timeId: null,
      timeInSeconds: null,
      lengths: 1,
      label,
    });
    setOpenSwimmerDropdown(null);
    await fetchTimesForSwimmer(swimmer.id);
  }

  function selectEvent(laneIndex: number, eventName: string) {
    const lengths = getLengthsForEvent(eventName);
    updateLane(laneIndex, {
      eventName,
      timeId: null,
      timeInSeconds: null,
      lengths,
    });
    setOpenEventDropdown(null);
  }

  function selectTime(laneIndex: number, time: SwimTime) {
    updateLane(laneIndex, {
      timeId: time.id,
      timeInSeconds: time.timeInSeconds,
    });
    setOpenTimeDropdown(null);
  }

  function clearLane(index: number) {
    setLanes((prev) => {
      const next = [...prev];
      next[index] = emptyLane(index);
      return next;
    });
  }

  // -----------------------------------------------------------------------
  // Derived data helpers
  // -----------------------------------------------------------------------

  function getEventsForSwimmer(swimmerId: number): string[] {
    const times = timesCache[swimmerId] || [];
    const events = [...new Set(times.map((t) => t.eventName))];
    events.sort();
    return events;
  }

  function getTimesForSwimmerEvent(
    swimmerId: number,
    eventName: string
  ): SwimTime[] {
    const times = timesCache[swimmerId] || [];
    return times
      .filter((t) => t.eventName === eventName)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  function getFilteredSwimmers(search: string): Swimmer[] {
    const q = search.toLowerCase().trim();
    if (!q) return swimmers;
    return swimmers.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
    );
  }

  // -----------------------------------------------------------------------
  // Active lanes for the race
  // -----------------------------------------------------------------------

  function getActiveLanes(): { index: number; config: LaneConfig }[] {
    return lanes
      .map((config, index) => ({ index, config }))
      .filter((l) => l.config.timeInSeconds !== null && l.config.timeInSeconds > 0);
  }

  // -----------------------------------------------------------------------
  // Pool canvas drawing
  // -----------------------------------------------------------------------

  const POOL_PADDING_TOP = 40;
  const POOL_PADDING_BOTTOM = 20;
  const POOL_PADDING_X = 50;
  const LANE_HEIGHT = 48;
  const POOL_HEIGHT = LANE_HEIGHT * NUM_LANES;
  const CANVAS_HEIGHT = POOL_HEIGHT + POOL_PADDING_TOP + POOL_PADDING_BOTTOM;
  const CANVAS_WIDTH = 900;
  const POOL_WIDTH = CANVAS_WIDTH - 2 * POOL_PADDING_X;

  const drawPool = useCallback(
    (ctx: CanvasRenderingContext2D, swimmerPositions?: Map<number, number>) => {
      const dpr = window.devicePixelRatio || 1;
      const w = CANVAS_WIDTH;
      const h = CANVAS_HEIGHT;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(0, 0, w, h);

      // Pool water
      const poolX = POOL_PADDING_X;
      const poolY = POOL_PADDING_TOP;
      const poolW = POOL_WIDTH;
      const poolH = POOL_HEIGHT;

      // Pool border / deck
      ctx.fillStyle = "#d1d5db";
      ctx.fillRect(poolX - 6, poolY - 6, poolW + 12, poolH + 12);

      // Water gradient
      const waterGrad = ctx.createLinearGradient(poolX, poolY, poolX, poolY + poolH);
      waterGrad.addColorStop(0, "#38bdf8");
      waterGrad.addColorStop(0.5, "#0ea5e9");
      waterGrad.addColorStop(1, "#0284c7");
      ctx.fillStyle = waterGrad;
      ctx.fillRect(poolX, poolY, poolW, poolH);

      // Water texture -- subtle horizontal lines
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let y = poolY + 4; y < poolY + poolH; y += 8) {
        ctx.beginPath();
        ctx.moveTo(poolX, y);
        ctx.lineTo(poolX + poolW, y);
        ctx.stroke();
      }

      // Turn walls
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(poolX, poolY, 6, poolH);
      ctx.fillRect(poolX + poolW - 6, poolY, 6, poolH);

      // Touch pads
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(poolX, poolY, 4, poolH);
      ctx.fillRect(poolX + poolW - 4, poolY, 4, poolH);

      // Lane lines
      for (let i = 1; i < NUM_LANES; i++) {
        const ly = poolY + i * LANE_HEIGHT;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(poolX + 8, ly);
        ctx.lineTo(poolX + poolW - 8, ly);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // T-mark (5 yards from each wall) -- the backstroke flags line
      const tMarkOffset = poolW * (5 / 25);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      // Left T
      ctx.beginPath();
      ctx.moveTo(poolX + tMarkOffset, poolY);
      ctx.lineTo(poolX + tMarkOffset, poolY + poolH);
      ctx.stroke();
      // Right T
      ctx.beginPath();
      ctx.moveTo(poolX + poolW - tMarkOffset, poolY);
      ctx.lineTo(poolX + poolW - tMarkOffset, poolY + poolH);
      ctx.stroke();

      // Center line
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(poolX + poolW / 2, poolY);
      ctx.lineTo(poolX + poolW / 2, poolY + poolH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Lane numbers
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < NUM_LANES; i++) {
        const cy = poolY + i * LANE_HEIGHT + LANE_HEIGHT / 2;
        // Left side
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(poolX - 28, cy - 10, 20, 20);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${i + 1}`, poolX - 18, cy + 1);
        // Right side
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(poolX + poolW + 8, cy - 10, 20, 20);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${i + 1}`, poolX + poolW + 18, cy + 1);
      }

      // Swimmer dots
      if (swimmerPositions) {
        swimmerPositions.forEach((xFraction, laneIndex) => {
          const lane = lanes[laneIndex];
          if (!lane) return;

          // xFraction is 0..1 mapped to the pool width (inside walls)
          const innerPad = 14;
          const sx = poolX + innerPad + xFraction * (poolW - 2 * innerPad);
          const sy = poolY + laneIndex * LANE_HEIGHT + LANE_HEIGHT / 2;

          // Glow
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 16);
          glow.addColorStop(0, lane.color + "80");
          glow.addColorStop(1, lane.color + "00");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(sx, sy, 16, 0, Math.PI * 2);
          ctx.fill();

          // Wake trail
          ctx.strokeStyle = lane.color + "40";
          ctx.lineWidth = 3;
          ctx.beginPath();
          const trailLen = 30;
          // Determine direction from fraction to decide trail direction
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - trailLen * (xFraction > 0.5 ? 1 : -1), sy);
          ctx.stroke();

          // Dot
          ctx.fillStyle = lane.color;
          ctx.beginPath();
          ctx.arc(sx, sy, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Swimmer name label (abbreviated)
          if (lane.label) {
            const parts = lane.label.split(" ");
            const abbr =
              parts.length >= 2
                ? `${parts[0][0]}.${parts[parts.length - 1]}`
                : lane.label;
            ctx.font = "bold 10px system-ui, sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(abbr, sx, sy - 14);
          }
        });
      }

      // Title
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillStyle = "#1e293b";
      ctx.textAlign = "center";
      ctx.fillText("25-Yard Pool", w / 2, 16);

      // Yard markers
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "center";
      for (let yd = 0; yd <= 25; yd += 5) {
        const mx = poolX + (yd / 25) * poolW;
        ctx.fillText(`${yd}yd`, mx, poolY - 10);
      }

      ctx.restore();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lanes]
  );

  // -----------------------------------------------------------------------
  // Initial draw and resize
  // -----------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (raceState === "idle") {
      // Draw the idle positions (swimmers at wall)
      const positions = new Map<number, number>();
      lanes.forEach((lane, i) => {
        if (lane.timeInSeconds !== null) {
          positions.set(i, 0);
        }
      });
      drawPool(ctx, positions.size > 0 ? positions : undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, drawPool, raceState]);

  // -----------------------------------------------------------------------
  // Race animation
  // -----------------------------------------------------------------------

  function computeSwimmerFraction(
    elapsed: number,
    totalTime: number,
    lengths: number
  ): { fraction: number; finished: boolean } {
    if (elapsed >= totalTime) {
      // Finished: determine final position
      // If odd number of lengths, finish at far wall (fraction=1)
      // If even, finish at start wall (fraction=0)
      const finalFraction = lengths % 2 === 1 ? 1 : 0;
      return { fraction: finalFraction, finished: true };
    }

    const progress = elapsed / totalTime; // 0..1
    const lengthProgress = progress * lengths; // e.g., 0..4 for 4 lengths
    const currentLength = Math.floor(lengthProgress);
    const withinLength = lengthProgress - currentLength;

    // Even lengths (0, 2, 4...): swim left-to-right (0->1)
    // Odd lengths (1, 3, 5...): swim right-to-left (1->0)
    let fraction: number;
    if (currentLength % 2 === 0) {
      fraction = withinLength;
    } else {
      fraction = 1 - withinLength;
    }

    return { fraction, finished: false };
  }

  const runAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    const elapsed = (now - raceStartRef.current) / 1000;

    const activeLanes = getActiveLanes();
    const positions = new Map<number, number>();
    let allFinished = true;

    for (const { index, config } of activeLanes) {
      const totalTime = config.timeInSeconds!;
      const lengths = config.lengths;
      const { fraction, finished } = computeSwimmerFraction(
        elapsed,
        totalTime,
        lengths
      );
      positions.set(index, fraction);

      if (finished && !finishedLanesRef.current.has(index)) {
        finishedLanesRef.current.add(index);
        const rank = finishedLanesRef.current.size;
        resultsRef.current.push({
          lane: index + 1,
          label: config.label,
          time: totalTime,
          rank,
        });
        setResults([...resultsRef.current]);
      }

      if (!finished) allFinished = false;
    }

    drawPool(ctx, positions);
    setRaceElapsed(elapsed);

    if (allFinished) {
      setRaceState("finished");
      return;
    }

    animRef.current = requestAnimationFrame(runAnimation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawPool, lanes]);

  useEffect(() => {
    if (raceState === "running") {
      animRef.current = requestAnimationFrame(runAnimation);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [raceState, runAnimation]);

  // -----------------------------------------------------------------------
  // Race controls
  // -----------------------------------------------------------------------

  function startRace() {
    const activeLanes = getActiveLanes();
    if (activeLanes.length === 0) return;

    finishedLanesRef.current = new Set();
    resultsRef.current = [];
    setResults([]);
    setRaceElapsed(0);
    raceStartRef.current = performance.now();
    setRaceState("running");
  }

  function resetRace() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setRaceState("idle");
    setRaceElapsed(0);
    setResults([]);
    finishedLanesRef.current = new Set();
    resultsRef.current = [];
  }

  // -----------------------------------------------------------------------
  // Helpers for display
  // -----------------------------------------------------------------------

  function rankSuffix(rank: number): string {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
  }

  function rankBadgeColor(rank: number): string {
    if (rank === 1) return "bg-yellow-400 text-yellow-900";
    if (rank === 2) return "bg-gray-300 text-gray-800";
    if (rank === 3) return "bg-amber-600 text-white";
    return "bg-gray-100 text-gray-600";
  }

  // -----------------------------------------------------------------------
  // Lengths options for manual override
  // -----------------------------------------------------------------------

  const lengthOptions = [1, 2, 4, 6, 8, 10, 12, 16, 20];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Race Simulator
          </h1>
          <p className="text-gray-500 text-lg">
            Set up lanes, pick swimmers and times, and watch them race
            head-to-head.
          </p>
        </div>

        {/* Pool Canvas */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-6 overflow-x-auto">
          <canvas
            ref={canvasRef}
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            className="mx-auto block"
          />
        </div>

        {/* Race clock and controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <div className="bg-gray-900 text-white font-mono text-3xl px-6 py-3 rounded-xl shadow-inner min-w-[180px] text-center tabular-nums">
            {formatTime(raceElapsed)}
          </div>
          <button
            onClick={startRace}
            disabled={
              raceState === "running" || getActiveLanes().length === 0
            }
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow transition-colors text-lg"
          >
            Start Race
          </button>
          <button
            onClick={resetRace}
            disabled={raceState === "idle"}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow transition-colors text-lg"
          >
            Reset
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Results
            </h2>
            <div className="grid gap-2">
              {results
                .sort((a, b) => a.rank - b.rank)
                .map((r) => (
                  <div
                    key={r.lane}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50"
                  >
                    <span
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${rankBadgeColor(
                        r.rank
                      )}`}
                    >
                      {rankSuffix(r.rank)}
                    </span>
                    <span className="font-semibold text-gray-900 flex-1">
                      Lane {r.lane} &mdash; {r.label}
                    </span>
                    <span className="font-mono font-bold text-green-700 text-lg">
                      {formatTime(r.time)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Lane configuration */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Lane Setup
          </h2>
          {swimmersLoading ? (
            <div className="text-center py-8 text-gray-400 animate-pulse">
              Loading swimmers...
            </div>
          ) : (
            <div className="space-y-3">
              {lanes.map((lane, laneIdx) => {
                const events = lane.swimmerId
                  ? getEventsForSwimmer(lane.swimmerId)
                  : [];
                const timesForEvent =
                  lane.swimmerId && lane.eventName
                    ? getTimesForSwimmerEvent(lane.swimmerId, lane.eventName)
                    : [];
                const selectedTime = timesForEvent.find(
                  (t) => t.id === lane.timeId
                );

                return (
                  <div
                    key={laneIdx}
                    ref={(el) => {
                      dropdownRefs.current[laneIdx] = el;
                    }}
                    className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {/* Lane number badge */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: lane.color }}
                    >
                      {laneIdx + 1}
                    </div>

                    {/* Swimmer search dropdown */}
                    <div className="relative flex-1 min-w-[180px]">
                      <input
                        type="text"
                        placeholder="Search swimmer..."
                        value={lane.swimmerSearch}
                        onChange={(e) => {
                          updateLane(laneIdx, {
                            swimmerSearch: e.target.value,
                          });
                          setOpenSwimmerDropdown(laneIdx);
                        }}
                        onFocus={() => setOpenSwimmerDropdown(laneIdx)}
                        disabled={raceState === "running"}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white disabled:bg-gray-100"
                      />
                      {openSwimmerDropdown === laneIdx && (
                        <div className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {getFilteredSwimmers(lane.swimmerSearch).length ===
                          0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">
                              No swimmers found
                            </div>
                          ) : (
                            getFilteredSwimmers(lane.swimmerSearch).map(
                              (s) => (
                                <button
                                  key={s.id}
                                  onClick={() =>
                                    selectSwimmer(laneIdx, s)
                                  }
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors flex justify-between items-center"
                                >
                                  <span className="font-medium text-gray-900">
                                    {s.firstName} {s.lastName}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {s._count.times} times
                                  </span>
                                </button>
                              )
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* Event dropdown */}
                    <div className="relative min-w-[160px]">
                      <button
                        onClick={() =>
                          setOpenEventDropdown(
                            openEventDropdown === laneIdx ? null : laneIdx
                          )
                        }
                        disabled={!lane.swimmerId || raceState === "running"}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-left disabled:bg-gray-100 disabled:text-gray-400 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 truncate"
                      >
                        {lane.eventName || "Select event..."}
                      </button>
                      {openEventDropdown === laneIdx && events.length > 0 && (
                        <div className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {events.map((ev) => (
                            <button
                              key={ev}
                              onClick={() => selectEvent(laneIdx, ev)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors font-medium text-gray-900"
                            >
                              {ev}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Time dropdown */}
                    <div className="relative min-w-[180px]">
                      <button
                        onClick={() =>
                          setOpenTimeDropdown(
                            openTimeDropdown === laneIdx ? null : laneIdx
                          )
                        }
                        disabled={
                          !lane.eventName || raceState === "running"
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-left disabled:bg-gray-100 disabled:text-gray-400 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 truncate"
                      >
                        {selectedTime
                          ? `${formatTime(selectedTime.timeInSeconds)} - ${new Date(selectedTime.date).toLocaleDateString()}`
                          : "Select time..."}
                      </button>
                      {openTimeDropdown === laneIdx &&
                        timesForEvent.length > 0 && (
                          <div className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                            {timesForEvent.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => selectTime(laneIdx, t)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors"
                              >
                                <span className="font-mono font-bold text-green-700">
                                  {formatTime(t.timeInSeconds)}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  {new Date(t.date).toLocaleDateString()}
                                </span>
                                <span className="text-gray-400 ml-1 text-xs">
                                  {t.meetName}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Lengths selector */}
                    <div className="min-w-[90px]">
                      <select
                        value={lane.lengths}
                        onChange={(e) =>
                          updateLane(laneIdx, {
                            lengths: parseInt(e.target.value),
                          })
                        }
                        disabled={!lane.eventName || raceState === "running"}
                        className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {lengthOptions.map((l) => (
                          <option key={l} value={l}>
                            {l} {l === 1 ? "length" : "lengths"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clear lane button */}
                    <button
                      onClick={() => clearLane(laneIdx)}
                      disabled={
                        raceState === "running" || !lane.swimmerId
                      }
                      className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors shrink-0"
                      title="Clear lane"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Select a swimmer, event, and time for at least one lane, then press
          Start Race. Lengths auto-detect from the event name but can be
          overridden.
        </div>
      </div>
    </main>
  );
}
