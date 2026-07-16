// Semantic-zoom thresholds (CSS px) and the descend decision. Because the
// layout is self-similar, cell pixel sizes are uniform within a level, so
// these checks run once per level, not per element.

import { LevelLayout } from "./LayoutModel";

/** Cells at least this wide/tall draw their children instead of a flat fill. */
export const PX_DESCEND = 24;
/** Don't descend if the child pitch would be below this (parent fill aggregates). */
export const PX_CHILD_MIN = 3;
/** Cells at least this big get a border. */
export const PX_BORDER = 8;
/** Cells at least this wide get a text label. */
export const PX_LABEL = 48;
/** Hard cap on instances per frame (safety valve; walk stops descending). */
export const INSTANCE_CAP = 200_000;

export function shouldDescend(
  pxW: number,
  pxH: number,
  child: LevelLayout | undefined,
  instanceCount: number
): boolean {
  if (child === undefined || instanceCount >= INSTANCE_CAP) return false;
  // Gate only the axes the child grid actually subdivides. Strip-shaped
  // levels (Row: cols=1, Column: rows=1) must not be blocked by the axis
  // they don't split — a 4px-tall but screen-wide Row strip can still show
  // its Columns.
  if (
    child.cols > 1 &&
    (pxW < PX_DESCEND || pxW * child.pitchX < PX_CHILD_MIN)
  ) {
    return false;
  }
  if (
    child.rows > 1 &&
    (pxH < PX_DESCEND || pxH * child.pitchY < PX_CHILD_MIN)
  ) {
    return false;
  }
  return true;
}
