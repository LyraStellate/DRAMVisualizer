// Non-React visualization engine. The render loop never touches React state;
// React only mounts the canvases and feeds config / trace events in.

import { HIERARCHY_ORDER, NUM_LEVELS } from "../../../shared/constants/dram";
import { DecodedAccess } from "../../../shared/types/trace";
import { Camera, CameraAnimator } from "./Camera";
import { FlashMatch, HighlightManager } from "./HighlightManager";
import {
  LayoutModel,
  PickResult,
  Rect,
  childRect,
  visibleChildRange,
} from "./LayoutModel";
import { PX_BORDER, PX_LABEL, shouldDescend } from "./LODPolicy";
import { LabelItem, LabelOverlay } from "./overlay/LabelOverlay";
import { GLRenderer } from "./renderer/GLRenderer";
import { InstanceWriter, rgba } from "./renderer/InstanceWriter";

const TARGET_LEAF_PX = 64;
const ROW_LEVEL = 5;

interface LevelStyle {
  containerFill: number;
  flatFill: number;
  border: number;
}

const BASE_COLORS: [number, number, number][] = [
  [66, 133, 244], // Channel  – blue
  [156, 39, 176], // Rank     – purple
  [0, 150, 136], // BankGroup – teal
  [255, 152, 0], // Bank     – orange
  [76, 175, 80], // Subarray – green
  [233, 30, 99], // Row      – pink
  [255, 193, 7], // Column   – amber
];

function mixWhite(c: number, k: number): number {
  return Math.round(255 - (255 - c) * k);
}

const LEVEL_STYLES: LevelStyle[] = BASE_COLORS.map(([r, g, b]) => ({
  containerFill: rgba(r, g, b, 26),
  flatFill: rgba(mixWhite(r, 0.5), mixWhite(g, 0.5), mixWhite(b, 0.5), 255),
  border: rgba((r * 0.55) | 0, (g * 0.55) | 0, (b * 0.55) | 0, 210),
}));

const ROOT_FILL = rgba(255, 255, 255, 255);
const ROOT_BORDER = rgba(120, 130, 145, 160);

export interface HoverInfo {
  /** e.g. "Channel 1 › Rank 0 › BankGroup 2" */
  breadcrumb: string;
  path: number[];
  level: number;
  clientX: number;
  clientY: number;
}

export class VisualizerEngine {
  readonly camera = new Camera();
  readonly layoutModel: LayoutModel;
  private renderer: GLRenderer;
  private highlights = new HighlightManager();
  private overlay: LabelOverlay;
  private animator: CameraAnimator;
  private writer = new InstanceWriter();
  private labels: LabelItem[] = [];

  private rafId = 0;
  private dpr = 1;
  private fitted = false;
  private drawnDepth = 0;
  private lastFrameMs = 0;
  private frameMatch: FlashMatch = FlashMatch.EMPTY;
  private viewRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private hover: HoverInfo | null = null;
  private listeners = new Set<() => void>();

  private dragging = false;
  private dragMoved = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private downX = 0;
  private downY = 0;

  constructor(
    glCanvas: HTMLCanvasElement,
    labelCanvas: HTMLCanvasElement,
    private container: HTMLElement
  ) {
    this.layoutModel = new LayoutModel([1, 1, 1, 1, 1, 1, 1]);
    this.renderer = new GLRenderer(glCanvas, () => this.requestFrame());
    this.overlay = new LabelOverlay(labelCanvas);
    this.animator = new CameraAnimator(this.camera);
    this.renderer.init();
    this.attachEvents();
  }

  // ----- public API -------------------------------------------------------

  setConfig(counts: number[]): void {
    this.layoutModel.setCounts(counts);
    this.updateScaleLimits();
    if (!this.fitted) {
      this.camera.fitTo(this.layoutModel.rootRect);
      this.fitted = true;
    } else {
      // Re-clamp the camera into the new scale range.
      this.camera.zoomAt(this.camera.viewportW / 2, this.camera.viewportH / 2, 1);
    }
    this.renderNow();
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    if (cssW <= 0 || cssH <= 0) return;
    this.camera.setViewport(cssW, cssH);
    this.dpr = dpr;
    this.overlay.resize(cssW, cssH, dpr);
    this.updateScaleLimits();
    if (!this.fitted) {
      this.camera.fitTo(this.layoutModel.rootRect);
      this.fitted = true;
    }
    // Draw synchronously: the GL canvas turns opaque the moment the context
    // exists, so waiting one rAF would flash black on mount/layout changes.
    this.renderNow();
  }

  flashAccess(access: DecodedAccess): void {
    this.highlights.add(access.path, performance.now());
    this.requestFrame();
  }

  clearFlashes(): void {
    this.highlights.clear();
    this.requestFrame();
  }

  /** Animated camera move to the element addressed by path[0..=level]. */
  jumpTo(path: ArrayLike<number>, level: number): void {
    const rect = this.layoutModel.rectForPath(path, level);
    this.animateToRect(rect);
  }

  fit(animate = false): void {
    const root = this.layoutModel.rootRect;
    if (!animate) {
      this.camera.fitTo(root);
      this.requestFrame();
      return;
    }
    this.animateToRect(root);
  }

  pickAt(sx: number, sy: number): PickResult | null {
    const [wx, wy] = this.camera.screenToWorld(sx, sy);
    return this.layoutModel.pickPath({ x: wx, y: wy }, this.drawnDepth);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getHover = (): HoverInfo | null => this.hover;

  dispose(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.detachEvents();
    this.renderer.dispose();
    this.listeners.clear();
  }

  requestFrame(): void {
    if (!this.rafId) this.rafId = requestAnimationFrame(this.loop);
  }

  /** Immediate synchronous frame (mount, resize, config changes). */
  private renderNow(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.loop(performance.now());
  }

  // ----- render loop ------------------------------------------------------

  private loop = (now: number): void => {
    this.rafId = 0;
    const cameraAnimating = this.animator.tick(now);
    const t0 = performance.now();
    this.renderFrame(now);
    this.lastFrameMs = performance.now() - t0;
    if (cameraAnimating || this.highlights.isAnimating(now)) {
      this.requestFrame();
    }
  };

  private renderFrame(nowMs: number): void {
    const cam = this.camera;
    this.writer.reset();
    this.labels.length = 0;
    this.viewRect = cam.viewWorldRect();
    this.frameMatch = this.highlights.snapshot(nowMs);
    this.drawnDepth = this.computeDrawnDepth();

    // Root container quad, then the Channel grid downwards.
    const root = this.layoutModel.rootRect;
    const rootPxW = root.w * cam.scale;
    const rootPxH = root.h * cam.scale;
    this.writer.push(
      (root.x - cam.centerX) * cam.scale,
      (root.y - cam.centerY) * cam.scale,
      rootPxW,
      rootPxH,
      ROOT_FILL,
      ROOT_BORDER,
      1,
      Math.min(6, rootPxW * 0.01),
      0
    );
    this.walkChildren(0, root, this.frameMatch);

    this.renderer.draw(this.writer, cam.viewportW, cam.viewportH, this.dpr);
    const hud = `${this.writer.count.toLocaleString()} inst  ${this.lastFrameMs.toFixed(1)} ms  L${this.drawnDepth}`;
    this.overlay.draw(this.labels, hud);
  }

  private walkChildren(level: number, parentRect: Rect, match: FlashMatch): void {
    const L = this.layoutModel.table[level];
    const range = visibleChildRange(parentRect, L, this.viewRect);
    if (!range) return;
    for (let cy = range.cy0; cy <= range.cy1; cy++) {
      for (let cx = range.cx0; cx <= range.cx1; cx++) {
        const i = cy * L.cols + cx;
        if (i >= L.count) continue;
        const rect = childRect(parentRect, L, i);
        this.emitNode(level, rect, i, match.isEmpty ? match : match.narrow(level, i));
      }
    }
  }

  private emitNode(level: number, rect: Rect, index: number, match: FlashMatch): void {
    const cam = this.camera;
    const pxW = rect.w * cam.scale;
    const pxH = rect.h * cam.scale;
    const child =
      level < NUM_LEVELS - 1 ? this.layoutModel.table[level + 1] : undefined;
    const descend = shouldDescend(pxW, pxH, child, this.writer.count);
    const style = LEVEL_STYLES[level];
    const showBorder = pxW >= PX_BORDER && pxH >= PX_BORDER;
    // World → camera-relative CSS px happens here, at emit time, so the GPU
    // never sees absolute world coordinates (float32 precision strategy §5.2).
    this.writer.push(
      (rect.x - cam.centerX) * cam.scale,
      (rect.y - cam.centerY) * cam.scale,
      pxW,
      pxH,
      descend ? style.containerFill : style.flatFill,
      showBorder ? style.border : 0,
      showBorder ? 1 : 0,
      level < ROW_LEVEL ? Math.min(5, pxW * 0.04) : 0,
      match.intensity()
    );
    if (pxW >= PX_LABEL && pxH >= 16 && level <= 4) {
      const alpha = Math.min(1, (pxW - PX_LABEL) / (0.5 * PX_LABEL));
      if (alpha > 0.02) {
        this.labels.push({
          text: `${HIERARCHY_ORDER[level]} ${index}`,
          x: (rect.x - cam.centerX) * cam.scale + cam.viewportW / 2,
          y: (rect.y - cam.centerY) * cam.scale + cam.viewportH / 2,
          w: pxW,
          h: pxH,
          alpha,
        });
      }
    }
    if (descend) this.walkChildren(level + 1, rect, match);
  }

  /**
   * Deepest level the walk draws at the current zoom. Cell pixel sizes are
   * uniform within a level (self-similar layout), so this is a 7-step loop.
   */
  private computeDrawnDepth(): number {
    const table = this.layoutModel.table;
    let w = this.layoutModel.rootRect.w;
    let h = this.layoutModel.rootRect.h;
    let depth = 0;
    for (let level = 0; level < NUM_LEVELS - 1; level++) {
      w *= table[level].cellW;
      h *= table[level].cellH;
      const pxW = w * this.camera.scale;
      const pxH = h * this.camera.scale;
      if (!shouldDescend(pxW, pxH, table[level + 1], 0)) break;
      depth = level + 1;
    }
    return depth;
  }

  // ----- camera helpers ---------------------------------------------------

  private updateScaleLimits(): void {
    const cam = this.camera;
    const root = this.layoutModel.rootRect;
    const minScale = cam.fitScale(root, 0.9);
    // The finest pitch (row strips for huge Row counts) must reach a usable
    // pixel size at max zoom, otherwise deep levels are never displayable.
    const finest = this.layoutModel.smallestPitchWorld();
    const maxScale = Math.max(minScale * 2, TARGET_LEAF_PX / finest);
    cam.setScaleLimits(minScale, maxScale);
  }

  private animateToRect(rect: Rect): void {
    const cam = this.camera;
    const scale = Math.min(cam.maxScale, cam.fitScale(rect, 0.85));
    this.animator.start(
      {
        centerX: rect.x + rect.w / 2,
        centerY: rect.y + rect.h / 2,
        scale: Math.max(scale, cam.minScale),
      },
      350,
      performance.now()
    );
    this.requestFrame();
  }

  // ----- input ------------------------------------------------------------

  private attachEvents(): void {
    const el = this.container;
    el.addEventListener("wheel", this.onWheel, { passive: false });
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointerleave", this.onPointerLeave);
    el.addEventListener("dblclick", this.onDblClick);
    el.addEventListener("keydown", this.onKeyDown);
  }

  private detachEvents(): void {
    const el = this.container;
    el.removeEventListener("wheel", this.onWheel);
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointermove", this.onPointerMove);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointerleave", this.onPointerLeave);
    el.removeEventListener("dblclick", this.onDblClick);
    el.removeEventListener("keydown", this.onKeyDown);
  }

  private localPos(e: MouseEvent): [number, number] {
    const rect = this.container.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.animator.cancel();
    const [sx, sy] = this.localPos(e);
    this.camera.zoomAt(sx, sy, Math.pow(2, -e.deltaY * 0.002));
    this.updateHover(e);
    this.requestFrame();
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.animator.cancel();
    this.dragging = true;
    this.dragMoved = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.container.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.dragging) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      if (dx !== 0 || dy !== 0) {
        if (
          Math.abs(e.clientX - this.downX) > 3 ||
          Math.abs(e.clientY - this.downY) > 3
        ) {
          this.dragMoved = true;
        }
        this.camera.panBy(dx, dy);
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.requestFrame();
      }
      return;
    }
    this.updateHover(e);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.container.releasePointerCapture(e.pointerId);
    if (!this.dragMoved) {
      // Click: zoom one level in onto the picked element (animated).
      const [sx, sy] = this.localPos(e);
      const pick = this.pickAt(sx, sy);
      if (pick && pick.level >= 0 && !pick.inGap) {
        this.animateToRect(this.layoutModel.rectForPath(pick.path, pick.level));
      }
    }
  };

  private onPointerLeave = (): void => {
    if (this.hover !== null) {
      this.hover = null;
      this.notify();
    }
  };

  private onDblClick = (e: MouseEvent): void => {
    e.preventDefault();
    const [sx, sy] = this.localPos(e);
    const cam = this.camera;
    const [wx, wy] = cam.screenToWorld(sx, sy);
    const scale = Math.min(cam.maxScale, cam.scale * 4);
    this.animator.start(
      {
        centerX: wx - (sx - cam.viewportW / 2) / scale,
        centerY: wy - (sy - cam.viewportH / 2) / scale,
        scale,
      },
      300,
      performance.now()
    );
    this.requestFrame();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Home") {
      e.preventDefault();
      this.fit(true);
    }
  };

  private updateHover(e: MouseEvent): void {
    const [sx, sy] = this.localPos(e);
    const pick = this.pickAt(sx, sy);
    let next: HoverInfo | null = null;
    if (pick && pick.level >= 0) {
      const parts: string[] = [];
      for (let l = 0; l <= pick.level; l++) {
        parts.push(`${HIERARCHY_ORDER[l]} ${pick.path[l]}`);
      }
      next = {
        breadcrumb: parts.join(" › "),
        path: pick.path,
        level: pick.level,
        clientX: e.clientX,
        clientY: e.clientY,
      };
    }
    const changed =
      (this.hover === null) !== (next === null) ||
      (next !== null &&
        (this.hover?.breadcrumb !== next.breadcrumb ||
          this.hover?.clientX !== next.clientX ||
          this.hover?.clientY !== next.clientY));
    if (changed) {
      this.hover = next;
      this.notify();
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
