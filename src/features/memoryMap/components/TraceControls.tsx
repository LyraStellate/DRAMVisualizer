import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { StepForward, Play, Pause, RotateCcw } from "lucide-react";
import { invoke } from "../../../shared/backend";
import { HIERARCHY_ORDER } from "../../../shared/constants/dram";
import { DecodedAccess, TraceSummary } from "../../../shared/types/trace";
import { TraceClient } from "../engine/TraceClient";
import { VisualizerEngine } from "../engine/VisualizerEngine";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTraceContext } from "../../../shared/context/TraceContext";

interface Props {
  engine: VisualizerEngine | null;
}

export const TraceControls = ({ engine }: Props) => {
  const { traceText, setCurrentLine } = useTraceContext();
  const [summary, setSummary] = useState<TraceSummary | null>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [intervalMs, setIntervalMs] = useState(500);
  const [current, setCurrent] = useState<DecodedAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clientRef = useRef<TraceClient>();
  if (!clientRef.current) clientRef.current = new TraceClient();

  const cursorRef = useRef(0);
  const totalRef = useRef(0);
  const steppingRef = useRef(false);
  const engineRef = useRef(engine);
  const loadedTextRef = useRef<string | null>(null);
  engineRef.current = engine;

  const loadContent = useCallback(async (content: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<TraceSummary>("load_access_trace", {
        content,
      });
      clientRef.current!.setTotal(result.total);
      totalRef.current = result.total;
      cursorRef.current = 0;
      loadedTextRef.current = content;
      setSummary(result);
      setCursor(0);
      setCurrent(null);
      setCurrentLine(null);
      setPlaying(false);
      engineRef.current?.clearFlashes();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [setCurrentLine]);

  // Ensure content is loaded if changed before playing or stepping
  const ensureLoaded = useCallback(async () => {
    if (traceText.trim() === "") return false;
    if (traceText !== loadedTextRef.current) {
      await loadContent(traceText);
      // Wait for React state to process if needed, but the ref is updated instantly
    }
    return true;
  }, [traceText, loadContent]);

  const step = useCallback(async () => {
    if (steppingRef.current) return;
    
    // Auto-load if modified
    const isLoaded = await ensureLoaded();
    if (!isLoaded) {
      setPlaying(false);
      return;
    }

    const index = cursorRef.current;
    if (index >= totalRef.current) {
      setPlaying(false);
      return;
    }
    steppingRef.current = true;
    try {
      const access = await clientRef.current!.get(index);
      if (access) {
        engineRef.current?.flashAccess(access);
        setCurrent(access);
        setCurrentLine(access.originalLine);
      }
      cursorRef.current = index + 1;
      setCursor(index + 1);
    } catch (e) {
      setError(String(e));
      setPlaying(false);
    } finally {
      steppingRef.current = false;
    }
  }, [ensureLoaded, setCurrentLine]);

  const reset = useCallback(() => {
    cursorRef.current = 0;
    setCursor(0);
    setCurrent(null);
    setCurrentLine(null);
    setPlaying(false);
    engineRef.current?.clearFlashes();
  }, [setCurrentLine]);

  useEffect(() => {
    engineRef.current?.setPlaybackSpeed(intervalMs);
  }, [intervalMs, engineRef.current]);

  useEffect(() => {
    if (!playing) return;
    void step();
    const id = window.setInterval(() => {
      void step();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, intervalMs, step]);

  const hasTraceText = traceText.trim().length > 0;
  const hasLoadedTrace = summary !== null && summary.total > 0;
  const atEnd = hasLoadedTrace && cursor >= summary.total;

  return (
    <div className="flex flex-col gap-2 p-4 pb-0">
      <div className="flex flex-row items-center flex-wrap gap-2">
        <Button
          variant="outline"
          size="icon"
          title="Step one access"
          disabled={!hasTraceText || (hasLoadedTrace && atEnd) || loading}
          onClick={() => void step()}
        >
          <StepForward className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title={playing ? "Pause" : "Play (Auto loads if changed)"}
          disabled={!hasTraceText || (hasLoadedTrace && atEnd)}
          onClick={() => {
            if (!playing) {
              void ensureLoaded().then(success => {
                if (success) setPlaying(true);
              });
            } else {
              setPlaying(false);
            }
          }}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Reset"
          disabled={!hasTraceText}
          onClick={reset}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2 w-32 px-2">
          <Slider
            min={50}
            max={2000}
            step={50}
            value={[intervalMs]}
            onValueChange={(val) => setIntervalMs(val[0])}
          />
          <span className="text-xs text-muted-foreground w-12 text-right">
            {intervalMs}ms
          </span>
        </div>

        <span className="text-sm font-mono text-muted-foreground">
          {summary
            ? `${cursor.toLocaleString()} / ${summary.total.toLocaleString()}`
            : "0 / 0"}
        </span>

        {current && (
          <div className="flex items-center gap-2 text-sm ml-auto">
            <span className="font-mono font-medium">{current.addrHex}</span>
            <span className="text-muted-foreground text-xs bg-muted px-2 py-1 rounded-md">
              {current.path
                .map((index, level) => `${HIERARCHY_ORDER[level].substring(0,3)}[${index}]`)
                .join(" › ")}
            </span>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-2 py-2">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      {summary && summary.errors.length > 0 && (
        <Alert className="mt-2 py-2 bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-500">
          <AlertDescription className="text-xs">
            {summary.errors.length} line(s) failed to parse (e.g. line{" "}
            {summary.errors[0].line}: {summary.errors[0].message})
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
