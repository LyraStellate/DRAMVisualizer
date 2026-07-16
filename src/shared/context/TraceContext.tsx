import React, { createContext, useContext, useState, ReactNode } from "react";

interface TraceContextState {
  traceText: string;
  setTraceText: (text: string) => void;
  currentLine: number | null;
  setCurrentLine: (line: number | null) => void;
}

const TraceContext = createContext<TraceContextState | undefined>(undefined);

export const TraceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [traceText, setTraceText] = useState<string>("");
  const [currentLine, setCurrentLine] = useState<number | null>(null);

  return (
    <TraceContext.Provider
      value={{ traceText, setTraceText, currentLine, setCurrentLine }}
    >
      {children}
    </TraceContext.Provider>
  );
};

export const useTraceContext = (): TraceContextState => {
  const context = useContext(TraceContext);
  if (!context) {
    throw new Error("useTraceContext must be used within a TraceProvider");
  }
  return context;
};
