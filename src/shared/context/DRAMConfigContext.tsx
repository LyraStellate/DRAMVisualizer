import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { DRAMStructures } from "../types/dram";

type Props = {
  children: ReactNode;
};

// Properties of the DRAM device itself (capacity and hierarchy element
// counts). The address mapping is a memory-controller concern and lives
// outside this context: it goes straight to the WASM decoder.
interface DRAMConfigStateContextType {
  TotalCapacity: number;
  DRAMStructures: DRAMStructures;
}

const DRAMConfigStateContext = createContext<
  DRAMConfigStateContextType | undefined
>(undefined);

export const useDRAMConfigState = () => {
  const context = useContext(DRAMConfigStateContext);
  if (context === undefined) {
    throw new Error(
      "useDRAMConfigState must be used within a DRAMConfigProvider"
    );
  }
  return context;
};

interface DRAMConfigDispatchContextType {
  applyDramConfig: (config: DRAMConfigStateContextType) => void;
}

const DRAMConfigDispatchContext = createContext<
  DRAMConfigDispatchContextType | undefined
>(undefined);

export const useDRAMConfigDispatch = () => {
  const context = useContext(DRAMConfigDispatchContext);
  if (context === undefined) {
    throw new Error(
      "useDRAMConfigDispatch must be used within a DRAMConfigProvider"
    );
  }
  return context;
};

export const DRAMConfigProvider = ({ children }: Props) => {
  const [totalCapacity, setTotalCapacity] = useState<number>(0);
  const [dramStructures, setDRAMStructures] = useState<DRAMStructures>({
    Channel: 1,
    Rank: 1,
    Bank: 1,
    BankGroup: 1,
    Subarray: 1,
    Row: 1,
    Column: 1,
  });

  const stateValue = useMemo(
    () => ({
      TotalCapacity: totalCapacity,
      DRAMStructures: dramStructures,
    }),
    [totalCapacity, dramStructures]
  );

  const applyDramConfig = useCallback(
    (config: DRAMConfigStateContextType) => {
      if (config === undefined) {
        return;
      }
      setTotalCapacity(config.TotalCapacity);
      setDRAMStructures(config.DRAMStructures);
    },
    []
  );

  const dispatchValue = useMemo(
    () => ({
      applyDramConfig,
    }),
    [applyDramConfig]
  );

  return (
    <DRAMConfigStateContext.Provider value={stateValue}>
      <DRAMConfigDispatchContext.Provider value={dispatchValue}>
        {children}
      </DRAMConfigDispatchContext.Provider>
    </DRAMConfigStateContext.Provider>
  );
};
