import { describe, expect, it } from "vitest";
import {
  AFTERGLOW,
  BLINK_MS,
  FADE_END_MS,
  HighlightManager,
  MAX_FLASHES,
  intensityAt,
} from "../HighlightManager";

describe("intensityAt", () => {
  it("starts at full intensity and blinks", () => {
    expect(intensityAt(0, false)).toBeCloseTo(1.0, 6);
    // Half a period later the cosine is at its minimum.
    expect(intensityAt(110, false)).toBeCloseTo(0.1, 6);
    // One full period later it is back at the maximum.
    expect(intensityAt(220, false)).toBeCloseTo(1.0, 6);
  });

  it("fades linearly to zero after the blink phase", () => {
    const atBlinkEnd = intensityAt(BLINK_MS, false);
    const mid = intensityAt((BLINK_MS + FADE_END_MS) / 2, false);
    expect(mid).toBeCloseTo(atBlinkEnd / 2, 6);
    expect(intensityAt(FADE_END_MS, false)).toBe(0);
    expect(intensityAt(FADE_END_MS + 10_000, false)).toBe(0);
  });

  it("keeps an afterglow for the latest flash only", () => {
    expect(intensityAt(FADE_END_MS + 10_000, true)).toBe(AFTERGLOW);
    const mid = intensityAt((BLINK_MS + FADE_END_MS) / 2, true);
    const atBlinkEnd = intensityAt(BLINK_MS, true);
    expect(mid).toBeCloseTo((atBlinkEnd + AFTERGLOW) / 2, 6);
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

  it("reports animation only while a flash is younger than the fade end", () => {
    const manager = new HighlightManager();
    manager.add([0, 0, 0, 0, 0, 0, 0], 0);
    expect(manager.isAnimating(100)).toBe(true);
    expect(manager.isAnimating(FADE_END_MS + 1)).toBe(false);
    // The afterglow still renders (snapshot non-empty) without animating.
    expect(manager.snapshot(FADE_END_MS + 1).isEmpty).toBe(false);
  });
});
