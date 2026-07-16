import {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Upload, FileEdit, StepForward, Play, Pause, RotateCcw } from "lucide-react";
import { invoke } from "../../../shared/backend";
import { HIERARCHY_ORDER } from "../../../shared/constants/dram";
import { DecodedAccess, TraceSummary } from "../../../shared/types/trace";
import { TraceClient } from "../engine/TraceClient";
import { VisualizerEngine } from "../engine/VisualizerEngine";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  engine: VisualizerEngine | null;
}

export const TraceControls = ({ engine }: Props) => {
  const [summary, setSummary] = useState<TraceSummary | null>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [intervalMs, setIntervalMs] = useState(500);
  const [current, setCurrent] = useState<DecodedAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const clientRef = useRef<TraceClient>();
  if (!clientRef.current) clientRef.current = new TraceClient();

  const cursorRef = useRef(0);
  const totalRef = useRef(0);
  const steppingRef = useRef(false);
  const engineRef = useRef(engine);
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
      setSummary(result);
      setCursor(0);
      setCurrent(null);
      setPlaying(false);
      engineRef.current?.clearFlashes();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const step = useCallback(async () => {
    if (steppingRef.current) return;
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
      }
      cursorRef.current = index + 1;
      setCursor(index + 1);
    } catch (e) {
      setError(String(e));
      setPlaying(false);
    } finally {
      steppingRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    cursorRef.current = 0;
    setCursor(0);
    setCurrent(null);
    setPlaying(false);
    engineRef.current?.clearFlashes();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      void step();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, intervalMs, step]);

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await loadContent(await file.text());
  };

  const hasTrace = summary !== null && summary.total > 0;
  const atEnd = summary !== null && cursor >= summary.total;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.trace,.log,text/plain"
          hidden
          onChange={onFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Load file
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPasteOpen((open) => !open)}
        >
          <FileEdit className="w-4 h-4 mr-2" />
          Paste
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          title="Step one access"
          disabled={!hasTrace || atEnd || loading}
          onClick={() => void step()}
        >
          <StepForward className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title={playing ? "Pause" : "Play"}
          disabled={!hasTrace || atEnd}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Reset"
          disabled={!hasTrace}
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
            : "no trace loaded"}
        </span>

        {current && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono font-medium">{current.addrHex}</span>
            <span className="text-muted-foreground text-xs">
              {current.path
                .map((index, level) => `${HIERARCHY_ORDER[level]} ${index}`)
                .join(" › ")}
            </span>
          </div>
        )}
      </div>

      {pasteOpen && (
        <div className="flex flex-row items-start gap-2">
          <textarea
            className="flex-1 min-h-[80px] text-sm font-mono p-2 rounded-md border border-input bg-transparent shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder={"0x1A2B3C40\n0xDEADBEEF"}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <Button
            size="sm"
            disabled={loading || pasteText.trim() === ""}
            onClick={() => void loadContent(pasteText)}
          >
            Load
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {summary && summary.errors.length > 0 && (
        <Alert>
          <AlertDescription>
            {summary.errors.length} line(s) failed to parse (e.g. line{" "}
            {summary.errors[0].line}: {summary.errors[0].message})
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
