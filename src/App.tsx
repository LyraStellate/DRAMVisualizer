import React from "react";
import { ConfigurationPanel } from "./features/configuration";
import { DRAMConfigProvider } from "./shared/context/DRAMConfigContext";
import { MemoryMapPanel } from "./features/memoryMap";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";

const App: React.FC = () => {
  return (
    <DRAMConfigProvider>
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={33} minSize={20} className="border-r border-border bg-card">
            <ConfigurationPanel />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={67} className="flex flex-col bg-background relative">
            <MemoryMapPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </DRAMConfigProvider>
  );
};

export default App;
