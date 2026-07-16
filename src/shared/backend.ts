import init, { DramVisualizerCore } from "../../wasm/pkg/dram_visualizer_lib";

let corePromise: Promise<DramVisualizerCore> | null = null;

function getCore(): Promise<DramVisualizerCore> {
  if (!corePromise) {
    corePromise = init().then(() => new DramVisualizerCore());
  }
  return corePromise;
}

export async function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  const core = await getCore();
  switch (cmd) {
    case "setup_memory_controller":
      return core.setupMemoryController(args!.mapping) as T;
    case "load_access_trace":
      return core.loadAccessTrace(args!.content as string) as T;
    case "get_decoded_accesses":
      return core.getDecodedAccesses(
        args!.start as number,
        args!.count as number
      ) as T;
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}
