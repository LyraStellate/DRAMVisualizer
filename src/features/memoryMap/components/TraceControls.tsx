import {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  Collapse,
  IconButton,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { invoke } from "../../../shared/backend";
import { HIERARCHY_ORDER } from "../../../shared/constants/dram";
import { DecodedAccess, TraceSummary } from "../../../shared/types/trace";
import { TraceClient } from "../engine/TraceClient";
import { VisualizerEngine } from "../engine/VisualizerEngine";

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
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.trace,.log,text/plain"
          hidden
          onChange={onFileChange}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          Load file
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<EditNoteIcon />}
          onClick={() => setPasteOpen((open) => !open)}
        >
          Paste
        </Button>
        <Tooltip title="Step one access">
          <span>
            <IconButton
              size="small"
              disabled={!hasTrace || atEnd || loading}
              onClick={() => void step()}
            >
              <SkipNextIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={playing ? "Pause" : "Play"}>
          <span>
            <IconButton
              size="small"
              disabled={!hasTrace || atEnd}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Reset">
          <span>
            <IconButton size="small" disabled={!hasTrace} onClick={reset}>
              <RestartAltIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={{ width: 120, px: 1 }}>
          <Slider
            size="small"
            min={50}
            max={2000}
            step={50}
            value={intervalMs}
            onChange={(_, value) => setIntervalMs(value as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v} ms`}
          />
        </Box>
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {summary
            ? `${cursor.toLocaleString()} / ${summary.total.toLocaleString()}`
            : "no trace loaded"}
        </Typography>
        {current && (
          <>
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {current.addrHex}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {current.path
                .map((index, level) => `${HIERARCHY_ORDER[level]} ${index}`)
                .join(" › ")}
            </Typography>
          </>
        )}
      </Stack>

      <Collapse in={pasteOpen}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            size="small"
            placeholder={"0x1A2B3C40\n0xDEADBEEF"}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 13 } } }}
          />
          <Button
            variant="contained"
            size="small"
            disabled={loading || pasteText.trim() === ""}
            onClick={() => void loadContent(pasteText)}
          >
            Load
          </Button>
        </Stack>
      </Collapse>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {summary && summary.errors.length > 0 && (
        <Alert severity="warning">
          {summary.errors.length} line(s) failed to parse (e.g. line{" "}
          {summary.errors[0].line}: {summary.errors[0].message})
        </Alert>
      )}
    </Stack>
  );
};
