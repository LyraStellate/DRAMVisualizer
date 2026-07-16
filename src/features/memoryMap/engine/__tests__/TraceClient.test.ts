import { describe, expect, it } from "vitest";
import { DecodedAccess } from "../../../../shared/types/trace";
import {
  CHUNK_SIZE,
  MAX_CACHED_CHUNKS,
  TraceClient,
} from "../TraceClient";

function makeFakeInvoke(total: number) {
  const calls: { start: number; count: number }[] = [];
  const invoke = async <T,>(
    cmd: string,
    args?: Record<string, unknown>
  ): Promise<T> => {
    expect(cmd).toBe("get_decoded_accesses");
    const start = args!.start as number;
    const count = args!.count as number;
    calls.push({ start, count });
    const end = Math.min(start + count, total);
    const data: DecodedAccess[] = [];
    for (let i = start; i < end; i++) {
      data.push({
        index: i,
        addrHex: `0x${i.toString(16).toUpperCase()}`,
        path: [0, 0, 0, 0, 0, 0, i % 7],
        originalLine: i + 1,
      });
    }
    return data as T;
  };
  return { invoke, calls };
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("TraceClient", () => {
  it("fetches the containing chunk and serves entries from it", async () => {
    const { invoke, calls } = makeFakeInvoke(10_000);
    const client = new TraceClient(invoke);
    client.setTotal(10_000);

    const access = await client.get(0);
    expect(access!.index).toBe(0);
    expect(calls).toEqual([{ start: 0, count: CHUNK_SIZE }]);

    // Subsequent reads inside the same chunk hit the cache.
    await client.get(1);
    await client.get(100);
    expect(calls.length).toBe(1);
  });

  it("returns null outside the trace without invoking", async () => {
    const { invoke, calls } = makeFakeInvoke(10);
    const client = new TraceClient(invoke);
    client.setTotal(10);
    expect(await client.get(-1)).toBeNull();
    expect(await client.get(10)).toBeNull();
    expect(calls.length).toBe(0);
    expect((await client.get(9))!.index).toBe(9);
  });

  it("prefetches the next chunk past 75% of the current one", async () => {
    const { invoke, calls } = makeFakeInvoke(3 * CHUNK_SIZE);
    const client = new TraceClient(invoke);
    client.setTotal(3 * CHUNK_SIZE);

    const beforeThreshold = Math.floor(CHUNK_SIZE * 0.75) - 1;
    await client.get(beforeThreshold);
    await flushMicrotasks();
    expect(calls.map((c) => c.start)).toEqual([0]);

    await client.get(Math.floor(CHUNK_SIZE * 0.75));
    await flushMicrotasks();
    expect(calls.map((c) => c.start)).toEqual([0, CHUNK_SIZE]);

    // Crossing into the prefetched chunk needs no new fetch.
    await client.get(CHUNK_SIZE);
    expect(calls.length).toBe(2);
  });

  it("does not prefetch past the end of the trace", async () => {
    const { invoke, calls } = makeFakeInvoke(CHUNK_SIZE);
    const client = new TraceClient(invoke);
    client.setTotal(CHUNK_SIZE);
    await client.get(CHUNK_SIZE - 1);
    await flushMicrotasks();
    expect(calls.length).toBe(1);
  });

  it("evicts the least recently used chunk beyond the cache limit", async () => {
    const total = (MAX_CACHED_CHUNKS + 2) * CHUNK_SIZE;
    const { invoke, calls } = makeFakeInvoke(total);
    const client = new TraceClient(invoke);
    client.setTotal(total);

    // Touch chunk 0, then fill the cache with MAX_CACHED_CHUNKS more chunks
    // (using early offsets so no prefetch fires).
    for (let chunk = 0; chunk <= MAX_CACHED_CHUNKS; chunk++) {
      await client.get(chunk * CHUNK_SIZE);
    }
    const fetchesSoFar = calls.length;
    expect(fetchesSoFar).toBe(MAX_CACHED_CHUNKS + 1);

    // Chunk 0 was evicted → refetch. Chunk MAX_CACHED_CHUNKS is still cached.
    await client.get(MAX_CACHED_CHUNKS * CHUNK_SIZE);
    expect(calls.length).toBe(fetchesSoFar);
    await client.get(0);
    expect(calls.length).toBe(fetchesSoFar + 1);
  });

  it("deduplicates concurrent fetches of the same chunk", async () => {
    const { invoke, calls } = makeFakeInvoke(CHUNK_SIZE);
    const client = new TraceClient(invoke);
    client.setTotal(CHUNK_SIZE);
    const [a, b] = await Promise.all([client.get(0), client.get(1)]);
    expect(a!.index).toBe(0);
    expect(b!.index).toBe(1);
    expect(calls.length).toBe(1);
  });
});
