import { describe, expect, it } from "vitest";
import {
  LayoutModel,
  Rect,
  childRect,
  visibleChildRange,
} from "../LayoutModel";
import { shouldDescend } from "../LODPolicy";

/** Deterministic PRNG (mulberry32) so fuzz failures are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomCounts(rand: () => number): number[] {
  // Powers of two, like real configurations (count = 2^#addressFunctions).
  const pow = (max: number) => 2 ** Math.floor(rand() * (max + 1));
  return [
    pow(3), // Channel ≤ 8
    pow(2), // Rank ≤ 4
    pow(3), // BankGroup ≤ 8
    pow(4), // Bank ≤ 16
    pow(4), // Subarray ≤ 16
    pow(10), // Row ≤ 1024
    pow(10), // Column ≤ 1024
  ];
}

function rectCenter(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

describe("LayoutModel", () => {
  it("round-trips childRect chains through pickPath (fuzz)", () => {
    const rand = mulberry32(0xdead_beef);
    for (let trial = 0; trial < 200; trial++) {
      const counts = randomCounts(rand);
      const model = new LayoutModel(counts);
      const path = counts.map((count) => Math.floor(rand() * count));
      const rect = model.rectForPath(path, 6);
      const pick = model.pickPath(rectCenter(rect), 6);
      expect(pick).not.toBeNull();
      expect(pick!.inGap).toBe(false);
      expect(pick!.level).toBe(6);
      expect(pick!.path).toEqual(path);
    }
  });

  it("round-trips at intermediate levels too", () => {
    const rand = mulberry32(42);
    for (let trial = 0; trial < 100; trial++) {
      const counts = randomCounts(rand);
      const model = new LayoutModel(counts);
      const maxLevel = Math.floor(rand() * 7);
      const path = counts
        .slice(0, maxLevel + 1)
        .map((count) => Math.floor(rand() * count));
      const rect = model.rectForPath(path, maxLevel);
      const pick = model.pickPath(rectCenter(rect), maxLevel);
      expect(pick).not.toBeNull();
      expect(pick!.path).toEqual(path);
    }
  });

  it("visibleChildRange covers exactly the intersecting children (±1 gap slack)", () => {
    const rand = mulberry32(7);
    for (let trial = 0; trial < 100; trial++) {
      const counts = randomCounts(rand).map((c) => Math.min(c, 16));
      const model = new LayoutModel(counts);
      const level = Math.floor(rand() * 7);
      const parent =
        level === 0
          ? model.rootRect
          : model.rectForPath(
              counts.slice(0, level).map(() => 0),
              level - 1
            );
      const L = model.table[level];
      const view: Rect = {
        x: parent.x + (rand() * 2 - 0.5) * parent.w,
        y: parent.y + (rand() * 2 - 0.5) * parent.h,
        w: rand() * parent.w * 1.5,
        h: rand() * parent.h * 1.5,
      };
      const range = visibleChildRange(parent, L, view);
      // Brute force over all children.
      const visible = new Set<number>();
      for (let i = 0; i < L.count; i++) {
        if (intersects(childRect(parent, L, i), view)) visible.add(i);
      }
      if (range === null) {
        expect(visible.size).toBe(0);
        continue;
      }
      // The closed-form range must be a superset of the true visible set…
      for (const i of visible) {
        const cx = i % L.cols;
        const cy = Math.floor(i / L.cols);
        expect(cx).toBeGreaterThanOrEqual(range.cx0);
        expect(cx).toBeLessThanOrEqual(range.cx1);
        expect(cy).toBeGreaterThanOrEqual(range.cy0);
        expect(cy).toBeLessThanOrEqual(range.cy1);
      }
      // …and at most one extra cell on each edge (gap hits clamp inward).
      if (visible.size > 0) {
        const cxs = [...visible].map((i) => i % L.cols);
        const cys = [...visible].map((i) => Math.floor(i / L.cols));
        expect(range.cx0).toBeGreaterThanOrEqual(Math.min(...cxs) - 1);
        expect(range.cx1).toBeLessThanOrEqual(Math.max(...cxs) + 1);
        expect(range.cy0).toBeGreaterThanOrEqual(Math.min(...cys) - 1);
        expect(range.cy1).toBeLessThanOrEqual(Math.max(...cys) + 1);
      }
    }
  });

  it("descend decision is monotonic in zoom", () => {
    const model = new LayoutModel([2, 2, 4, 4, 8, 32768, 1024]);
    for (let level = 0; level < 6; level++) {
      const cell = model.rectForPath(
        Array.from({ length: level + 1 }, () => 0),
        level
      );
      let wasDescending = false;
      for (let logScale = -10; logScale <= 50; logScale += 0.5) {
        const scale = 2 ** logScale;
        const descend = shouldDescend(
          cell.w * scale,
          cell.h * scale,
          model.table[level + 1],
          0
        );
        if (wasDescending) expect(descend).toBe(true);
        wasDescending = descend;
      }
      expect(wasDescending).toBe(true); // eventually always descends
    }
  });

  it("reaches every level at max zoom, even for huge Row/Column counts", () => {
    // Regression: with 65536 rows × 8192 columns the rows are 4px-ish strips
    // even at deep zoom. The strip axis must not gate descent (Row → Column
    // splits only horizontally) and the max zoom must resolve the finest
    // pitch (the row pitch), not just the column width.
    const configs = [
      [1, 1, 1, 1, 1, 65536, 8192], // user-reported case
      [2, 2, 4, 4, 8, 32768, 1024], // DDR4-like reference config
    ];
    for (const counts of configs) {
      const model = new LayoutModel(counts);
      const maxScale = 64 / model.smallestPitchWorld(); // engine's TARGET_LEAF_PX
      // Mirror of VisualizerEngine.computeDrawnDepth at scale = maxScale.
      let w = model.rootRect.w;
      let h = model.rootRect.h;
      let depth = 0;
      for (let level = 0; level < 6; level++) {
        w *= model.table[level].cellW;
        h *= model.table[level].cellH;
        if (!shouldDescend(w * maxScale, h * maxScale, model.table[level + 1], 0)) {
          break;
        }
        depth = level + 1;
      }
      expect(depth).toBe(6);
    }
  });

  it("does not gate strip descent on the non-subdivided axis", () => {
    const model = new LayoutModel([1, 1, 1, 1, 1, 65536, 8192]);
    const column = model.table[6]; // cols=8192, rows=1
    // A row strip: extremely wide, only a few px tall.
    expect(shouldDescend(500_000, 4, column, 0)).toBe(true);
    // But a strip too narrow for the column pitch still refuses.
    expect(shouldDescend(8192 * 2, 4, column, 0)).toBe(false);
  });

  it("treats unmapped levels (count 1) as a single full-size child", () => {
    const model = new LayoutModel([1, 1, 1, 1, 1, 1, 1]);
    const rect = model.rectForPath([0, 0, 0, 0, 0, 0, 0], 6);
    expect(rect.w).toBeGreaterThan(0);
    expect(rect.h).toBeGreaterThan(0);
    const pick = model.pickPath(rectCenter(rect), 6);
    expect(pick!.path).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("points in gaps resolve to the parent level", () => {
    const model = new LayoutModel([4, 1, 1, 1, 1, 1, 1]);
    // Just right of channel 0's cell, inside the gap between channels.
    const c0 = model.rectForPath([0], 0);
    const gapPoint = { x: c0.x + c0.w * 1.02, y: c0.y + c0.h / 2 };
    const pick = model.pickPath(gapPoint, 6);
    expect(pick!.inGap).toBe(true);
    expect(pick!.level).toBeLessThan(6);
  });
});
