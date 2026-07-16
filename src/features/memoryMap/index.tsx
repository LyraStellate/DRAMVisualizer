import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import { useDRAMConfigState } from "../../shared/context/DRAMConfigContext";
import { HIERARCHY_ORDER } from "../../shared/constants/dram";
import { VisualizerEngine } from "./engine/VisualizerEngine";
import { TraceControls } from "./components/TraceControls";

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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <TraceControls engine={engine} />
      <Box
        ref={containerRef}
        tabIndex={0}
        sx={{
          position: "relative",
          height: "70vh",
          minHeight: 320,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          overscrollBehavior: "none",
          touchAction: "none",
          cursor: "grab",
          "&:active": { cursor: "grabbing" },
          outline: "none",
        }}
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
        <Tooltip title="Fit view (Home)">
          <IconButton
            size="small"
            onClick={() => engine?.fit(true)}
            sx={{
              position: "absolute",
              left: 8,
              top: 8,
              bgcolor: "rgba(255,255,255,0.85)",
              "&:hover": { bgcolor: "rgba(255,255,255,1)" },
            }}
          >
            <CenterFocusStrongIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {hover && (
          <Box
            sx={{
              position: "fixed",
              left: hover.clientX + 14,
              top: hover.clientY + 14,
              px: 1,
              py: 0.5,
              bgcolor: "rgba(40, 44, 52, 0.92)",
              color: "#fff",
              fontSize: 12,
              borderRadius: 1,
              pointerEvents: "none",
              zIndex: (theme) => theme.zIndex.tooltip,
              whiteSpace: "nowrap",
            }}
          >
            {hover.breadcrumb}
          </Box>
        )}
      </Box>
    </Box>
  );
};
