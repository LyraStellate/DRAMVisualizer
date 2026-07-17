import { describe, expect, it } from "vitest";
import {
  HighlightManager,
  MAX_FLASHES,
  intensityAt,
} from "../HighlightManager";

describe("intensityAt", () => {
  it("stays at 1.0 indefinitely if not replaced", () => {
    const flash = { path: new Uint32Array(7), startMs: 0, replacedMs: null };
    expect(intensityAt(0, flash, 1000)).toBeCloseTo(1.0, 6);
    expect(intensityAt(5000, flash, 1000)).toBeCloseTo(1.0, 6);
  });

  it("fades linearly to zero after being replaced", () => {
    const flash = { path: new Uint32Array(7), startMs: 0, replacedMs: 1000 };
    expect(intensityAt(1000, flash, 1000)).toBeCloseTo(1.0, 6);
    expect(intensityAt(1500, flash, 1000)).toBeCloseTo(0.5, 6);
    expect(intensityAt(2000, flash, 1000)).toBe(0);
    expect(intensityAt(2500, flash, 1000)).toBe(0);
  });
});

describe("HighlightManager / FlashMatch", () => {
  it("prefix-matches through narrow(), lighting every ancestor", () => {
    const manager = new HighlightManager();
    manager.add([1, 0, 2, 3, 0, 5, 7], 1000);
    const match = manager.snapshot(1000); // t = 0 → intensity 1

    // Correct branch at every level keeps the flash alive.
    let m = match;
    const path = [1, 0, 2, 3, 0, 5, 7];
    for (let level = 0; level < 7; level++) {
      m = m.narrow(level, path[level]);
      expect(m.isEmpty).toBe(false);
      expect(m.intensity()).toBeCloseTo(1.0, 6);
    }

    // A wrong turn at any level kills it.
    expect(match.narrow(0, 0).isEmpty).toBe(true);
    expect(match.narrow(0, 1).narrow(1, 1).isEmpty).toBe(true);
  });

  it("keeps at most MAX_FLASHES, newest first", () => {
    const manager = new HighlightManager();
    for (let i = 0; i < MAX_FLASHES + 5; i++) {
      manager.add([i, 0, 0, 0, 0, 0, 0], i);
    }
    // The oldest flashes were dropped: channel 0..4 no longer match.
    const match = manager.snapshot(MAX_FLASHES + 5);
    expect(match.narrow(0, 0).isEmpty).toBe(true);
    expect(match.narrow(0, MAX_FLASHES + 4).isEmpty).toBe(false);
  });

  it("reports animation only while a replaced flash is fading", () => {
    const manager = new HighlightManager();
    manager.add([0, 0, 0, 0, 0, 0, 0], 0);
    // Not replaced yet, so not animating
    expect(manager.isAnimating(100)).toBe(false);
    
    // Add a new flash to replace the old one
    manager.add([1, 0, 0, 0, 0, 0, 0], 200);
    // Now animating because the first flash is fading out
    expect(manager.isAnimating(300)).toBe(true);
    
    // Once fade duration passes, animation stops
    expect(manager.isAnimating(200 + manager.fadeDurationMs + 1)).toBe(false);
  });
});
