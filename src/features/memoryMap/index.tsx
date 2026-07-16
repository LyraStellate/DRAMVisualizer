import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Focus } from "lucide-react";
import { useDRAMConfigState } from "../../shared/context/DRAMConfigContext";
import { HIERARCHY_ORDER } from "../../shared/constants/dram";
import { VisualizerEngine } from "./engine/VisualizerEngine";
import { TraceControls } from "./components/TraceControls";
import { Button } from "@/components/ui/button";

const noopSubscribe = () => () => {};

export const MemoryMapPanel = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<VisualizerEngine | null>(null);

  const { DRAMStructures } = useDRAMConfigState();

  useEffect(() => {
    const container = containerRef.current;
    const glCanvas = glCanvasRef.current;
    const labelCanvas = labelCanvasRef.current;
    if (!container || !glCanvas || !labelCanvas) return;

    const created = new VisualizerEngine(glCanvas, labelCanvas, container);
    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      created.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    });
    observer.observe(container);
    setEngine(created);

    return () => {
      observer.disconnect();
      created.dispose();
      setEngine(null);
    };
  }, []);

  useEffect(() => {
    if (!engine) return;
    engine.setConfig(HIERARCHY_ORDER.map((level) => DRAMStructures[level] ?? 1));
  }, [engine, DRAMStructures]);

  const hover = useSyncExternalStore(
    engine ? engine.subscribe : noopSubscribe,
    engine ? engine.getHover : () => null
  );

  return (
    <div className="flex flex-col gap-2 h-full w-full p-4">
      <TraceControls engine={engine} />
      <div
        ref={containerRef}
        tabIndex={0}
        className="relative flex-1 min-h-[320px] rounded-md border border-border overflow-hidden cursor-grab active:cursor-grabbing outline-none"
        style={{ overscrollBehavior: "none", touchAction: "none" }}
      >
        <canvas
          ref={glCanvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        <canvas
          ref={labelCanvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
        <Button
          variant="secondary"
          size="icon"
          title="Fit view (Home)"
          onClick={() => engine?.fit(true)}
          className="absolute left-2 top-2 h-8 w-8 bg-background/85 hover:bg-background/100 shadow-sm"
        >
          <Focus className="h-4 w-4" />
        </Button>
        {hover && (
          <div
            className="fixed px-2 py-1 bg-gray-900/90 text-white text-xs rounded pointer-events-none whitespace-nowrap z-50"
            style={{
              left: hover.clientX + 14,
              top: hover.clientY + 14,
            }}
          >
            {hover.breadcrumb}
          </div>
        )}
      </div>
    </div>
  );
};
