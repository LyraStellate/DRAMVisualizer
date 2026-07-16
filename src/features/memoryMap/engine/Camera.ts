// Plain (non-React) camera: world coordinates are JS doubles, the GPU only
// ever sees camera-relative CSS pixels (see GLRenderer / DESIGN.md §5.2).

import { Rect } from "./LayoutModel";

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export class Camera {
  centerX = 0;
  centerY = 0; // world coordinates (double)
  scale = 1; // CSS pixels per world unit
  viewportW = 1;
  viewportH = 1; // CSS pixels
  minScale = 1e-12;
  maxScale = 1e12;

  setViewport(w: number, h: number): void {
    this.viewportW = Math.max(1, w);
    this.viewportH = Math.max(1, h);
  }

  setScaleLimits(min: number, max: number): void {
    this.minScale = min;
    this.maxScale = Math.max(min, max);
    this.scale = clamp(this.scale, this.minScale, this.maxScale);
  }

  worldToScreen(wx: number, wy: number): [number, number] {
    return [
      (wx - this.centerX) * this.scale + this.viewportW / 2,
      (wy - this.centerY) * this.scale + this.viewportH / 2,
    ];
  }

  screenToWorld(sx: number, sy: number): [number, number] {
    return [
      this.centerX + (sx - this.viewportW / 2) / this.scale,
      this.centerY + (sy - this.viewportH / 2) / this.scale,
    ];
  }

  /** Wheel-anchored zoom: the world point under the cursor stays fixed. */
  zoomAt(sx: number, sy: number, factor: number): void {
    const [wx, wy] = this.screenToWorld(sx, sy);
    this.scale = clamp(this.scale * factor, this.minScale, this.maxScale);
    this.centerX = wx - (sx - this.viewportW / 2) / this.scale;
    this.centerY = wy - (sy - this.viewportH / 2) / this.scale;
  }

  panBy(dxPx: number, dyPx: number): void {
    this.centerX -= dxPx / this.scale;
    this.centerY -= dyPx / this.scale;
  }

  /** Scale that fits `rect` into the viewport with a margin (design §3). */
  fitScale(rect: Rect, margin = 0.9): number {
    return (
      margin * Math.min(this.viewportW / rect.w, this.viewportH / rect.h)
    );
  }

  fitTo(rect: Rect, margin = 0.9): void {
    this.scale = clamp(this.fitScale(rect, margin), this.minScale, this.maxScale);
    this.centerX = rect.x + rect.w / 2;
    this.centerY = rect.y + rect.h / 2;
  }

  /** The world-space rectangle currently covered by the viewport. */
  viewWorldRect(): Rect {
    const w = this.viewportW / this.scale;
    const h = this.viewportH / this.scale;
    return { x: this.centerX - w / 2, y: this.centerY - h / 2, w, h };
  }
}

/**
 * Animated camera move: center is lerped, scale is interpolated in log2 space
 * (exponential ease), both smoothed. Driven from the engine's rAF loop.
 */
export class CameraAnimator {
  private active = false;
  private startMs = 0;
  private durationMs = 1;
  private fromX = 0;
  private fromY = 0;
  private fromLog = 0;
  private toX = 0;
  private toY = 0;
  private toLog = 0;

  constructor(private camera: Camera) {}

  start(
    target: { centerX: number; centerY: number; scale: number },
    durationMs: number,
    nowMs: number
  ): void {
    this.active = true;
    this.startMs = nowMs;
    this.durationMs = Math.max(1, durationMs);
    this.fromX = this.camera.centerX;
    this.fromY = this.camera.centerY;
    this.fromLog = Math.log2(this.camera.scale);
    this.toX = target.centerX;
    this.toY = target.centerY;
    this.toLog = Math.log2(
      clamp(target.scale, this.camera.minScale, this.camera.maxScale)
    );
  }

  cancel(): void {
    this.active = false;
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Advances the animation. Returns true while still animating. */
  tick(nowMs: number): boolean {
    if (!this.active) return false;
    const t = clamp((nowMs - this.startMs) / this.durationMs, 0, 1);
    const e = t * t * (3 - 2 * t); // smoothstep ease
    this.camera.centerX = this.fromX + (this.toX - this.fromX) * e;
    this.camera.centerY = this.fromY + (this.toY - this.fromY) * e;
    this.camera.scale = 2 ** (this.fromLog + (this.toLog - this.fromLog) * e);
    if (t >= 1) this.active = false;
    return this.active;
  }
}
