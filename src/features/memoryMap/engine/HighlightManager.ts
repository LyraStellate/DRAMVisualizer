// Access flashes: lifetime curve and incremental prefix matching used by the
// LOD walk. Ancestor aggregation is implicit — a flash on a deep path lights
// whatever ancestor the walk stops at, because matching is prefix-based.

export interface ActiveFlash {
  path: Uint32Array; // length 7, canonical order
  startMs: number;
}

export const MAX_FLASHES = 8;
export const BLINK_MS = 900; // blinking period of the curve
export const FADE_END_MS = 1600; // end of the linear fade
export const PERIOD_MS = 220; // one blink cycle (≈4 blinks in 900ms)
export const AFTERGLOW = 0.25; // kept by the most recent flash only

/**
 * Flash intensity at age `t` ms.
 *   t < 900ms      : blink   0.55 + 0.45·cos(2π·t/220)
 *   900..1600ms    : linear fade toward the floor
 *   after          : afterglow (latest flash only) marking the last access
 */
export function intensityAt(t: number, isLatest: boolean): number {
  if (t < 0) return 0;
  const floor = isLatest ? AFTERGLOW : 0;
  if (t < BLINK_MS) {
    return 0.55 + 0.45 * Math.cos((2 * Math.PI * t) / PERIOD_MS);
  }
  if (t < FADE_END_MS) {
    const atBlinkEnd = 0.55 + 0.45 * Math.cos((2 * Math.PI * BLINK_MS) / PERIOD_MS);
    const k = (t - BLINK_MS) / (FADE_END_MS - BLINK_MS);
    return atBlinkEnd + (floor - atBlinkEnd) * k;
  }
  return floor;
}

interface FlashCandidate {
  path: Uint32Array;
  intensity: number;
}

/**
 * Per-frame incremental matcher. The walk narrows the candidate set as it
 * recurses: `narrow(level, i)` keeps flashes whose path[level] === i, so cost
 * is only paid along branches that actually contain a flash.
 */
export class FlashMatch {
  static readonly EMPTY = new FlashMatch([]);

  constructor(private candidates: FlashCandidate[]) {}

  get isEmpty(): boolean {
    return this.candidates.length === 0;
  }

  narrow(level: number, index: number): FlashMatch {
    if (this.candidates.length === 0) return FlashMatch.EMPTY;
    const next = this.candidates.filter((c) => c.path[level] === index);
    if (next.length === 0) return FlashMatch.EMPTY;
    return new FlashMatch(next);
  }

  /** Largest intensity among remaining candidates. */
  intensity(): number {
    let best = 0;
    for (const c of this.candidates) {
      if (c.intensity > best) best = c.intensity;
    }
    return best;
  }
}

export class HighlightManager {
  private flashes: ActiveFlash[] = []; // newest first

  add(path: ArrayLike<number>, nowMs: number): void {
    this.flashes.unshift({
      path: Uint32Array.from({ length: 7 }, (_, i) => path[i] ?? 0),
      startMs: nowMs,
    });
    if (this.flashes.length > MAX_FLASHES) this.flashes.length = MAX_FLASHES;
  }

  clear(): void {
    this.flashes = [];
  }

  get isEmpty(): boolean {
    return this.flashes.length === 0;
  }

  /** True while any flash still needs animation frames. */
  isAnimating(nowMs: number): boolean {
    return this.flashes.some((f) => nowMs - f.startMs < FADE_END_MS);
  }

  /** Root FlashMatch for this frame, with intensities evaluated at `nowMs`. */
  snapshot(nowMs: number): FlashMatch {
    const candidates: FlashCandidate[] = [];
    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      const intensity = intensityAt(nowMs - f.startMs, i === 0);
      if (intensity <= 0.001) continue;
      candidates.push({ path: f.path, intensity });
    }
    return candidates.length > 0 ? new FlashMatch(candidates) : FlashMatch.EMPTY;
  }
}
