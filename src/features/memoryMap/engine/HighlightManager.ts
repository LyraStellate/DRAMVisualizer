// Access flashes: lifetime curve and incremental prefix matching used by the
// LOD walk. Ancestor aggregation is implicit — a flash on a deep path lights
// whatever ancestor the walk stops at, because matching is prefix-based.

export interface ActiveFlash {
  path: Uint32Array; // length 7, canonical order
  startMs: number;
  replacedMs: number | null;
}

export const MAX_FLASHES = 8;
export const AFTERGLOW = 0.25; // deprecated, no longer used in new logic

/**
 * Flash intensity at time `nowMs`.
 * The latest flash (replacedMs === null) stays at 1.0 indefinitely.
 * Once replaced, it fades linearly from 1.0 to 0.0 over `fadeMs`.
 */
export function intensityAt(nowMs: number, flash: ActiveFlash, fadeMs: number): number {
  if (flash.replacedMs === null) {
    return 1.0;
  }
  const fadeAge = nowMs - flash.replacedMs;
  if (fadeAge <= 0) return 1.0;
  if (fadeAge < fadeMs) {
    const k = fadeAge / fadeMs;
    return 1.0 - k;
  }
  return 0.0;
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

  constructor(public candidates: FlashCandidate[]) {}

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
  public fadeDurationMs: number = 1000;

  add(path: ArrayLike<number>, nowMs: number): void {
    if (this.flashes.length > 0 && this.flashes[0].replacedMs === null) {
      this.flashes[0].replacedMs = nowMs;
    }
    this.flashes.unshift({
      path: Uint32Array.from({ length: 7 }, (_, i) => path[i] ?? 0),
      startMs: nowMs,
      replacedMs: null,
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
    return this.flashes.some((f) => f.replacedMs !== null && (nowMs - f.replacedMs) < this.fadeDurationMs);
  }

  /** Root FlashMatch for this frame, with intensities evaluated at `nowMs`. */
  snapshot(nowMs: number): FlashMatch {
    const candidates: FlashCandidate[] = [];
    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      const intensity = intensityAt(nowMs, f, this.fadeDurationMs);
      if (intensity <= 0.001) continue;
      candidates.push({ path: f.path, intensity });
    }
    return candidates.length > 0 ? new FlashMatch(candidates) : FlashMatch.EMPTY;
  }
}
