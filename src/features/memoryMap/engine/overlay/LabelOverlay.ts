// Canvas-2D text overlay stacked on the GL canvas (pointer-events: none).
// Labels are collected by the LOD walk each frame and redrawn from scratch.

export interface LabelItem {
  text: string;
  /** Cell rect in canvas CSS coordinates (origin top-left). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1 fade-in between PX_LABEL and 1.5×PX_LABEL to avoid popping. */
  alpha: number;
}

export class LabelOverlay {
  private ctx: CanvasRenderingContext2D | null;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d");
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    const pxW = Math.max(1, Math.round(cssW * dpr));
    const pxH = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== pxW) this.canvas.width = pxW;
    if (this.canvas.height !== pxH) this.canvas.height = pxH;
  }

  draw(labels: LabelItem[], hud: string | null): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.textBaseline = "top";

    for (const label of labels) {
      const fontSize = Math.min(14, Math.max(9, label.h * 0.05));
      const padX = 4;
      const maxW = label.w - padX * 2;
      if (maxW < 12) continue;
      ctx.font = `${fontSize.toFixed(1)}px "Roboto", "Helvetica", sans-serif`;
      ctx.fillStyle = `rgba(30, 35, 45, ${(0.8 * label.alpha).toFixed(3)})`;
      let text = label.text;
      if (ctx.measureText(text).width > maxW) {
        while (text.length > 1 && ctx.measureText(text + "…").width > maxW) {
          text = text.slice(0, -1);
        }
        text += "…";
      }
      ctx.fillText(text, label.x + padX, label.y + 3);
    }

    if (hud) {
      ctx.font = '11px "Roboto Mono", monospace';
      const w = ctx.measureText(hud).width;
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(this.cssW - w - 14, 6, w + 10, 18);
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.fillText(hud, this.cssW - w - 9, 10);
    }
  }
}
