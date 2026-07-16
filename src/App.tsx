import React from "react";
import { Box, ThemeProvider, createTheme } from "@mui/material";
import { ConfigurationPanel } from "./features/configuration";
import { DRAMConfigProvider } from "./shared/context/DRAMConfigContext";
import { MemoryMapPanel } from "./features/memoryMap";

const theme = createTheme();

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <DRAMConfigProvider>
        <Box>
          <ConfigurationPanel />

          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <MemoryMapPanel />
          </Box>
        </Box>
      </DRAMConfigProvider>
    </ThemeProvider>
  );
};

export default App;
