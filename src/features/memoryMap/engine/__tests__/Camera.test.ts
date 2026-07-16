import { describe, expect, it } from "vitest";
import { Camera } from "../Camera";

const makeCamera = () => {
  const cam = new Camera();
  cam.setViewport(1280, 800);
  cam.centerX = 500;
  cam.centerY = 312.5;
  cam.scale = 1.28;
  return cam;
};

describe("Camera", () => {
  it("screenToWorld and worldToScreen round-trip", () => {
    const cam = makeCamera();
    for (const [sx, sy] of [
      [0, 0],
      [640, 400],
      [1280, 800],
      [17.25, 793.5],
    ]) {
      const [wx, wy] = cam.screenToWorld(sx, sy);
      const [bx, by] = cam.worldToScreen(wx, wy);
      expect(bx).toBeCloseTo(sx, 9);
      expect(by).toBeCloseTo(sy, 9);
    }
  });

  it("zoomAt keeps the world point under the cursor fixed", () => {
    const cam = makeCamera();
    const sx = 231.5;
    const sy = 622.75;
    const before = cam.screenToWorld(sx, sy);
    for (const factor of [1.5, 0.25, 3.7, 0.9]) {
      cam.zoomAt(sx, sy, factor);
      const after = cam.screenToWorld(sx, sy);
      expect(after[0]).toBeCloseTo(before[0], 9);
      expect(after[1]).toBeCloseTo(before[1], 9);
    }
  });

  it("zoomAt clamps to the scale limits", () => {
    const cam = makeCamera();
    cam.setScaleLimits(0.5, 8);
    cam.zoomAt(100, 100, 1e-9);
    expect(cam.scale).toBe(0.5);
    cam.zoomAt(100, 100, 1e12);
    expect(cam.scale).toBe(8);
  });

  it("panBy moves the view by screen pixels", () => {
    const cam = makeCamera();
    const before = cam.screenToWorld(640, 400);
    cam.panBy(128, -64);
    const after = cam.screenToWorld(640, 400);
    expect(after[0] - before[0]).toBeCloseTo(-128 / cam.scale, 9);
    expect(after[1] - before[1]).toBeCloseTo(64 / cam.scale, 9);
  });

  it("fitTo centers the rect and fits it in the viewport", () => {
    const cam = makeCamera();
    cam.setScaleLimits(1e-9, 1e9);
    cam.fitTo({ x: 0, y: 0, w: 1000, h: 625 });
    expect(cam.centerX).toBe(500);
    expect(cam.centerY).toBe(312.5);
    expect(1000 * cam.scale).toBeLessThanOrEqual(1280);
    expect(625 * cam.scale).toBeLessThanOrEqual(800);
  });
});
