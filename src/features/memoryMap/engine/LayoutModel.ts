// Analytic layout of the nested DRAM hierarchy. No per-element objects are
// kept: rectangles are derived on the fly from 7 per-level parameter sets,
// all expressed as fractions of the parent rectangle (self-similar layout).

import { NUM_LEVELS } from "../../../shared/constants/dram";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LevelLayout {
  count: number; // elements per parent (= 2^k)
  cols: number;
  rows: number; // = ceil(count / cols)
  padX: number; // inner padding, as a fraction of the parent rect
  padY: number; // top padding (includes the label band of box levels)
  pitchX: number; // cell stride, as a fraction of the parent rect
  pitchY: number;
  cellW: number;
  cellH: number;
}

export type LayoutTable = LevelLayout[];

export interface PickResult {
  path: number[];
  level: number; // deepest resolved level; -1 if the point is outside all channels
  inGap: boolean;
}

export const ROOT_RECT: Rect = { x: 0, y: 0, w: 1000, h: 625 };

const PAD_FRAC = 0.04;
const LABEL_FRAC = 0.06;
const GAP_BOX = 0.15;
const GAP_STRIP = 0.1;
const ROW_LEVEL = 5;
const COLUMN_LEVEL = 6;
const BOTTOM_PAD_FRAC = PAD_FRAC;

export function buildLayoutTable(counts: number[]): LayoutTable {
  const table: LayoutTable = [];
  // World-space aspect ratio of the current parent cell; the layout is
  // self-similar so it is fully determined level by level from the root.
  let aspect = ROOT_RECT.w / ROOT_RECT.h;
  for (let level = 0; level < NUM_LEVELS; level++) {
    const count = Math.max(1, Math.floor(counts[level] ?? 1));
    const parentHasLabel = level >= 1 && level <= ROW_LEVEL;
    const isInnerBox = level >= ROW_LEVEL;

    // Default padding calculation
    // level === 1 is Rank inside Channel. We remove Channel's inner vertical padding.
    const isChannelInner = level === 1;
    let basePadX = isInnerBox ? 0 : PAD_FRAC;
    let basePadY = ((isInnerBox || isChannelInner) ? 0 : PAD_FRAC) + (parentHasLabel ? LABEL_FRAC : 0);
    let bottomPadY = ((isInnerBox || isChannelInner) ? 0 : BOTTOM_PAD_FRAC);

    // Increase margin inside Bank slightly
    if (level === 4) {
      basePadX = 0.06;
      basePadY = 0.06 + (parentHasLabel ? LABEL_FRAC : 0);
      bottomPadY = 0.06;
    }

    // Apply exact 3-column-width paddings inside Subarray (level 4) for its children
    if (level === ROW_LEVEL || level === COLUMN_LEVEL) {
      const colsInRow = counts[COLUMN_LEVEL] ?? 1;
      const colWFrac = 1.0 / (colsInRow + 6); // Total 6 padding columns (3 left, 3 right)
      
      if (level === ROW_LEVEL) {
        // Vertical padding for Row inside Subarray (3 column widths top and bottom)
        const padYFrac = 3 * colWFrac * aspect;
        basePadX = 0;
        // Do NOT add LABEL_FRAC here because we want top and bottom to be perfectly symmetrical
        basePadY = padYFrac;
        bottomPadY = padYFrac;
      } else if (level === COLUMN_LEVEL) {
        // Horizontal padding for Column inside Row (3 column widths left and right)
        basePadX = 3 * colWFrac;
        basePadY = 0;
        bottomPadY = 0;
      }
    }
    
    const innerW = 1 - 2 * basePadX;
    const innerH = 1 - basePadY - bottomPadY;
    const innerAspect = aspect * (innerW / innerH);

    let cols: number;
    let rows: number;
    let gapFrac: number;
    if (level === ROW_LEVEL) {
      // Rows stack vertically as full-width strips (like a real DRAM mat).
      cols = 1;
      rows = count;
      gapFrac = GAP_STRIP;
    } else if (level === COLUMN_LEVEL) {
      // Columns line up horizontally inside their row strip.
      cols = count;
      rows = 1;
      gapFrac = GAP_STRIP;
    } else {
      cols = Math.min(
        count,
        Math.max(1, Math.round(Math.sqrt(count * innerAspect)))
      );
      rows = Math.ceil(count / cols);
      gapFrac = GAP_BOX;
    }

    const pitchX = innerW / cols;
    const pitchY = innerH / rows;
    const cellW = pitchX * (cols > 1 ? 1 - gapFrac : 1);
    const cellH = pitchY * (rows > 1 ? 1 - gapFrac : 1);
    
    // Distribute leftover space evenly so the grid is perfectly centered
    const usedW = (cols - 1) * pitchX + cellW;
    const usedH = (rows - 1) * pitchY + cellH;
    const actualPadX = basePadX + (innerW - usedW) / 2;
    const actualPadY = basePadY + (innerH - usedH) / 2;

    table.push({ count, cols, rows, padX: actualPadX, padY: actualPadY, pitchX, pitchY, cellW, cellH });
    aspect = aspect * (cellW / cellH);
  }
  return table;
}

export function childRect(parent: Rect, L: LevelLayout, i: number): Rect {
  const cx = i % L.cols;
  const cy = Math.floor(i / L.cols);
  return {
    x: parent.x + (L.padX + cx * L.pitchX) * parent.w,
    y: parent.y + (L.padY + cy * L.pitchY) * parent.h,
    w: L.cellW * parent.w,
    h: L.cellH * parent.h,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export interface IndexRange {
  cx0: number;
  cx1: number;
  cy0: number;
  cy1: number;
}

/** Closed-form visible child index range; no per-child tests. */
export function visibleChildRange(
  parent: Rect,
  L: LevelLayout,
  view: Rect
): IndexRange | null {
  const u0 = (view.x - parent.x) / parent.w - L.padX;
  const u1 = (view.x + view.w - parent.x) / parent.w - L.padX;
  const v0 = (view.y - parent.y) / parent.h - L.padY;
  const v1 = (view.y + view.h - parent.y) / parent.h - L.padY;
  // Entirely outside the child grid?
  if (u1 < 0 || v1 < 0) return null;
  if (u0 > L.cols * L.pitchX || v0 > L.rows * L.pitchY) return null;
  return {
    cx0: clamp(Math.floor(u0 / L.pitchX), 0, L.cols - 1),
    cx1: clamp(Math.floor(u1 / L.pitchX), 0, L.cols - 1),
    cy0: clamp(Math.floor(v0 / L.pitchY), 0, L.rows - 1),
    cy1: clamp(Math.floor(v1 / L.pitchY), 0, L.rows - 1),
  };
}

export class LayoutModel {
  readonly rootRect: Rect = ROOT_RECT;
  table: LayoutTable;

  constructor(counts: number[]) {
    this.table = buildLayoutTable(counts);
  }

  setCounts(counts: number[]): void {
    this.table = buildLayoutTable(counts);
  }

  childRect(parent: Rect, level: number, i: number): Rect {
    return childRect(parent, this.table[level], i);
  }

  /** Rect of the element addressed by path[0..=level], folded from the root. */
  rectForPath(path: ArrayLike<number>, level: number): Rect {
    let rect = this.rootRect;
    for (let l = 0; l <= level && l < NUM_LEVELS; l++) {
      rect = childRect(rect, this.table[l], path[l] ?? 0);
    }
    return rect;
  }

  /** Inverse mapping: world point → element path (for hover / click). */
  pickPath(
    worldPt: { x: number; y: number },
    maxLevel: number
  ): PickResult | null {
    let rect = this.rootRect;
    const path: number[] = [];
    for (let level = 0; level <= maxLevel && level < NUM_LEVELS; level++) {
      const L = this.table[level];
      const u = (worldPt.x - rect.x) / rect.w - L.padX;
      const v = (worldPt.y - rect.y) / rect.h - L.padY;
      const cx = Math.floor(u / L.pitchX);
      const cy = Math.floor(v / L.pitchY);
      if (cx < 0 || cx >= L.cols || cy < 0 || cy >= L.rows) {
        return { path, level: level - 1, inGap: true };
      }
      // Clicks in the gap between cells resolve to the parent level.
      if (u - cx * L.pitchX > L.cellW || v - cy * L.pitchY > L.cellH) {
        return { path, level: level - 1, inGap: true };
      }
      const i = cy * L.cols + cx;
      if (i >= L.count) {
        // Hole in the last grid row.
        return { path, level: level - 1, inGap: true };
      }
      path.push(i);
      rect = childRect(rect, L, i);
    }
    return { path, level: Math.min(maxLevel, NUM_LEVELS - 1), inGap: false };
  }

  /** World-space size of a single leaf (Column) cell. */
  leafWorldSize(): { w: number; h: number } {
    let w = this.rootRect.w;
    let h = this.rootRect.h;
    for (const L of this.table) {
      w *= L.cellW;
      h *= L.cellH;
    }
    return { w, h };
  }

  /**
   * Smallest world-space cell pitch across all levels, considering only the
   * axes each grid subdivides. This is what the max zoom must resolve: with
   * e.g. 65536 Rows the row pitch — not the Column width — is the finest
   * structure, and a width-only bound would clamp the zoom before rows (let
   * alone columns) ever reach a visible size.
   */
  smallestPitchWorld(): number {
    let w = this.rootRect.w;
    let h = this.rootRect.h;
    let min = Infinity;
    for (const L of this.table) {
      if (L.cols > 1) min = Math.min(min, w * L.pitchX);
      if (L.rows > 1) min = Math.min(min, h * L.pitchY);
      w *= L.cellW;
      h *= L.cellH;
    }
    // Fully unmapped config (every count = 1): fall back to the leaf size.
    return min === Infinity ? Math.min(w, h) : min;
  }
}
