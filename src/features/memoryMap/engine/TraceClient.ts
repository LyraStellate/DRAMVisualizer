// Windowed access to the trace kept on the Rust side: fetches 4096-entry
// chunks via get_decoded_accesses, keeps a small LRU, and prefetches the next
// chunk once the cursor passes 75% of the current one.

import { invoke } from "../../../shared/backend";
import { DecodedAccess } from "../../../shared/types/trace";

export const CHUNK_SIZE = 4096;
export const MAX_CACHED_CHUNKS = 8;
export const PREFETCH_FRACTION = 0.75;

export type InvokeFn = <T>(
  cmd: string,
  args?: Record<string, unknown>
) => Promise<T>;

export class TraceClient {
  // Map preserves insertion order; re-inserting on hit makes it an LRU.
  private chunks = new Map<number, DecodedAccess[]>();
  private pending = new Map<number, Promise<DecodedAccess[]>>();
  private total = 0;

  constructor(private invokeFn: InvokeFn = invoke) {}

  setTotal(total: number): void {
    this.total = total;
    this.chunks.clear();
    this.pending.clear();
  }

  async get(index: number): Promise<DecodedAccess | null> {
    if (index < 0 || index >= this.total) return null;
    const chunk = Math.floor(index / CHUNK_SIZE);
    const data = await this.fetchChunk(chunk);
    const offset = index - chunk * CHUNK_SIZE;
    if (
      offset >= CHUNK_SIZE * PREFETCH_FRACTION &&
      (chunk + 1) * CHUNK_SIZE < this.total
    ) {
      void this.fetchChunk(chunk + 1).catch(() => {
        // Prefetch failures surface on the blocking fetch instead.
      });
    }
    return data[offset] ?? null;
  }

  private fetchChunk(chunk: number): Promise<DecodedAccess[]> {
    const cached = this.chunks.get(chunk);
    if (cached) {
      this.chunks.delete(chunk);
      this.chunks.set(chunk, cached);
      return Promise.resolve(cached);
    }
    const inflight = this.pending.get(chunk);
    if (inflight) return inflight;
    const promise = this.invokeFn<DecodedAccess[]>("get_decoded_accesses", {
      start: chunk * CHUNK_SIZE,
      count: CHUNK_SIZE,
    }).then(
      (data) => {
        this.pending.delete(chunk);
        this.chunks.set(chunk, data);
        while (this.chunks.size > MAX_CACHED_CHUNKS) {
          const oldest = this.chunks.keys().next().value;
          if (oldest === undefined) break;
          this.chunks.delete(oldest);
        }
        return data;
      },
      (err) => {
        this.pending.delete(chunk);
        throw err;
      }
    );
    this.pending.set(chunk, promise);
    return promise;
  }
}
