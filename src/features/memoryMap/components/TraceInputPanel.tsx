import React, { useRef, useEffect } from "react";
import { useTraceContext } from "../../../shared/context/TraceContext";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_DISPLAY_LINES = 10000;

export const TraceInputPanel: React.FC = () => {
  const { traceText, setTraceText, currentLine, setRequestSeekLine } = useTraceContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    setTraceText(text);
  };

  const lines = traceText.split("\n");
  const isTruncated = lines.length > MAX_DISPLAY_LINES;
  const displayedLines = isTruncated ? lines.slice(0, MAX_DISPLAY_LINES) : lines;

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current && highlightRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      lineNumbersRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollTop = scrollTop;
    }
  };

  useEffect(() => {
    // Attempt auto-scroll to current line
    if (currentLine !== null && textareaRef.current) {
      // Calculate approximate pixel position
      const lineHeight = 20; // 1.25rem = 20px typically
      const targetScroll = Math.max(0, (currentLine - 1) * lineHeight - 100);
      textareaRef.current.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  }, [currentLine]);

  return (
    <div className="h-full w-full flex flex-col bg-card border-l border-border relative">
      <div className="p-3 border-b border-border bg-muted/20 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Trace Input
          </h2>
          <div>
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
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              Load file
            </Button>
          </div>
        </div>
        {isTruncated && (
          <p className="text-[10px] text-destructive">
            Display limited to {MAX_DISPLAY_LINES} lines to prevent freezing. Playback will still run the full trace.
          </p>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden bg-background">
        {/* Highlight Layer */}
        <div
          ref={highlightRef}
          className="absolute inset-0 pointer-events-none overflow-hidden pl-12"
          aria-hidden="true"
        >
          <div className="relative w-full" style={{ height: `${displayedLines.length * 20 + 16}px` }}>
            {currentLine !== null && currentLine <= displayedLines.length && (
              <div
                className="absolute w-full bg-yellow-500/20 dark:bg-yellow-500/30"
                style={{
                  top: `${(currentLine - 1) * 20 + 8}px`,
                  height: "20px",
                }}
              />
            )}
          </div>
        </div>

        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          className="absolute z-10 top-0 left-0 bottom-0 w-12 bg-muted/30 border-r border-border overflow-hidden text-right pr-2 py-2 select-none text-muted-foreground font-mono text-xs leading-[20px]"
          aria-hidden="true"
        >
          {displayedLines.map((_: string, i: number) => (
            <div
              key={i}
              className={`cursor-pointer hover:bg-muted/50 ${currentLine === i + 1 ? "text-foreground font-bold" : ""}`}
              onClick={() => setRequestSeekLine(i + 1)}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          className="absolute inset-0 w-full h-full pl-14 pr-2 py-2 bg-transparent text-foreground font-mono text-xs leading-[20px] resize-none focus:outline-none focus:ring-0 custom-scrollbar"
          value={isTruncated ? displayedLines.join("\n") + "\n... (truncated)" : traceText}
          onChange={(e) => {
            if (!isTruncated) {
              setTraceText(e.target.value);
            }
          }}
          onScroll={handleScroll}
          spellCheck={false}
          readOnly={isTruncated}
          placeholder="Paste hex addresses here..."
        />
      </div>
    </div>
  );
};
