import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Paper,
  Typography,
} from "@mui/material";
import { useDRAMConfigDispatch } from "../../shared/context/DRAMConfigContext";
import { TotalCapacityInputForm } from "./components/TotalCapacityInputForm";
import {
  AddressFunction,
  AddressMapping,
  DRAMStructure,
  DRAMStructures,
} from "../../shared/types/dram";
import { AddresMappingInputForm } from "./components/AddressMappingInputForm";
import {
  DRAMStructuresInputForm,
  isPowerOfTwo,
} from "./components/DRAMStructuresInputForm";
import { CheckPanel } from "./components/CheckPanel";
import { invoke } from "../../shared/backend";
import {
  buildLinearMapping,
  DEFAULT_ADDRESS_MAPPING,
  DEFAULT_ADDRESS_MAPPING_MASKS,
  DEFAULT_DRAM_STRUCTURES,
  DEFAULT_TOTAL_CAPACITY,
} from "./defaults";

export const ConfigurationPanel = () => {
  const [totalCapacity, setTotalCapacity] = useState<number>(
    DEFAULT_TOTAL_CAPACITY
  );
  const [dramStructures, setDRAMStructures] = useState<DRAMStructures>(
    DEFAULT_DRAM_STRUCTURES
  );
  const [addressMapping, setAddressMapping] = useState<AddressMapping>(
    DEFAULT_ADDRESS_MAPPING
  );
  const [maskInputs, setMaskInputs] = useState<Record<DRAMStructure, string[]>>(
    DEFAULT_ADDRESS_MAPPING_MASKS
  );
  const dramDispatch = useDRAMConfigDispatch();

  const handleTotalCapacityUpdate = (validValue: number) => {
    setTotalCapacity(validValue);
  };

  const handleDRAMStructuresChange = (
    key: keyof DRAMStructures,
    value: string
  ) => {
    const num = parseInt(value, 10);
    // The form only commits powers of two; guard anyway.
    if (!isPowerOfTwo(num)) {
      return;
    }

    const newStructures = { ...dramStructures, [key]: num };
    setDRAMStructures(newStructures);

    // A changed DRAM shape invalidates the current address mapping, so
    // regenerate a fresh linear mapping from the new structure counts.
    const linear = buildLinearMapping(newStructures);
    setAddressMapping(linear.mapping);
    setMaskInputs(linear.masks);
  };

  const handleAddressMappingChange = (
    key: DRAMStructure,
    addressFunction: AddressFunction,
    rawMask: string
  ) => {
    setAddressMapping((prev) => {
      const newArray = [...(prev[key] || [])];
      newArray[addressFunction.targetBit] = addressFunction;
      return { ...prev, [key]: newArray };
    });
    setMaskInputs((prev) => {
      const newArray = [...(prev[key] || [])];
      newArray[addressFunction.targetBit] = rawMask;
      return { ...prev, [key]: newArray };
    });
  };

  // DRAM configuration (device properties): drives the Memory Map layout.
  const handleDramConfigApply = () => {
    dramDispatch.applyDramConfig({
      TotalCapacity: totalCapacity,
      DRAMStructures: dramStructures,
    });
  };

  // Memory controller configuration: builds the address decoder in WASM.
  const handleMemoryControllerApply = async () => {
    try {
      console.log("Setting up memory controller with mapping:", addressMapping);
      await invoke("setup_memory_controller", { mapping: addressMapping });
      console.log("Memory controller setup successful.");
    } catch (error) {
      console.error("Failed to apply mc configuration:", error);
    }
  };

  return (
    <Paper>
      <Box>
        <Accordion>
          <AccordionSummary>
            <Typography variant="h6" component="h2" gutterBottom>
              DRAM Configuration
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography fontWeight="medium">DRAM Size</Typography>
              <TotalCapacityInputForm onChange={handleTotalCapacityUpdate} />
            </Box>
            <Box>
              <Typography fontWeight="medium">DRAM Structure</Typography>
              <DRAMStructuresInputForm
                value={dramStructures}
                onChange={handleDRAMStructuresChange}
              />
              <CheckPanel
                dramStructures={dramStructures}
                totalCapacity={totalCapacity}
              />
            </Box>
            <Box>
              <Button onClick={handleDramConfigApply}>
                Apply DRAM Configuration
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary>
            <Typography variant="h6" component="h2" gutterBottom>
              Memory Controller Configuration
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography fontWeight="medium">Address Mapping</Typography>
              <AddresMappingInputForm
                dramStructures={dramStructures}
                value={maskInputs}
                onChange={handleAddressMappingChange}
              />
            </Box>
            <Box>
              <Button onClick={handleMemoryControllerApply}>
                Apply Memory Controller Configuration
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Paper>
  );
};
