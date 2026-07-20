// Grow-only CPU-side instance buffer, rebuilt every frame. Layout per
// instance (36 bytes, nine 4-byte slots):
//   0: pos.x   1: pos.y     — camera-relative CSS px (float32)
//   2: size.x  3: size.y    — CSS px (float32)
//   4: fill RGBA (u8×4)     5: border RGBA (u8×4, alpha 0 = no border)
//   6: borderPx  7: cornerPx  8: flash intensity (0..1)

const SLOTS_PER_INSTANCE = 9;
export const STRIDE_BYTES = SLOTS_PER_INSTANCE * 4;

/** Packs an RGBA color (0..255 each) for the u8-normalized GL attributes. */
export function rgba(r: number, g: number, b: number, a: number): number {
  // Little-endian byte order matches gl.UNSIGNED_BYTE attribute reads.
  return (r | (g << 8) | (b << 16) | (a << 24)) >>> 0;
}

export class InstanceWriter {
  buffer: ArrayBuffer;
  f32: Float32Array;
  u32: Uint32Array;
  count = 0;
  /** Set when the backing buffer was reallocated (renderer must bufferData). */
  grew = false;
  private capacity: number;

  constructor(initialCapacity = 4096) {
    this.capacity = initialCapacity;
    this.buffer = new ArrayBuffer(initialCapacity * STRIDE_BYTES);
    this.f32 = new Float32Array(this.buffer);
    this.u32 = new Uint32Array(this.buffer);
  }

  reset(): void {
    this.count = 0;
    this.grew = false;
  }

  push(
    x: number,
    y: number,
    w: number,
    h: number,
    fill: number,
    border: number,
    borderPx: number,
    cornerPx: number,
    flash: number
  ): void {
    if (this.count === this.capacity) this.grow();
    const base = this.count * SLOTS_PER_INSTANCE;
    this.f32[base] = x;
    this.f32[base + 1] = y;
    this.f32[base + 2] = w;
    this.f32[base + 3] = h;
    this.u32[base + 4] = fill;
    this.u32[base + 5] = border;
    this.f32[base + 6] = borderPx;
    this.f32[base + 7] = cornerPx;
    this.f32[base + 8] = flash;
    this.count++;
  }

  get bytesUsed(): number {
    return this.count * STRIDE_BYTES;
  }

  private grow(): void {
    this.capacity *= 2;
    const next = new ArrayBuffer(this.capacity * STRIDE_BYTES);
    new Uint32Array(next).set(this.u32);
    this.buffer = next;
    this.f32 = new Float32Array(next);
    this.u32 = new Uint32Array(next);
    this.grew = true;
  }
}
