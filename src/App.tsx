import React from "react";
import { ConfigurationPanel } from "./features/configuration";
import { DRAMConfigProvider } from "./shared/context/DRAMConfigContext";
import { MemoryMapPanel } from "./features/memoryMap";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";

import { TraceProvider } from "./shared/context/TraceContext";
import { TraceInputPanel } from "./features/memoryMap/components/TraceInputPanel";

const App: React.FC = () => {
  return (
    <DRAMConfigProvider>
      <TraceProvider>
        <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={20} minSize={15} className="border-r border-border bg-card">
              <ConfigurationPanel />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={10} minSize={5} className="border-r border-border bg-card">
              <TraceInputPanel />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={70} className="flex flex-col bg-background relative">
              <MemoryMapPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </TraceProvider>
    </DRAMConfigProvider>
  );
};

export default App;
