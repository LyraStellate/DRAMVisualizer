import { useState } from "react";
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
import { Button } from "@/components/ui/button";

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
    if (!isPowerOfTwo(num)) {
      return;
    }

    const newStructures = { ...dramStructures, [key]: num };
    setDRAMStructures(newStructures);

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

  const handleDramConfigApply = () => {
    dramDispatch.applyDramConfig({
      TotalCapacity: totalCapacity,
      DRAMStructures: dramStructures,
    });
  };

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
    <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold mb-4">DRAM Configuration</h2>
        <div className="flex flex-col gap-4">
          <TotalCapacityInputForm onChange={handleTotalCapacityUpdate} />
          <DRAMStructuresInputForm
            value={dramStructures}
            onChange={handleDRAMStructuresChange}
          />
          <CheckPanel
            dramStructures={dramStructures}
            totalCapacity={totalCapacity}
          />
          <Button onClick={handleDramConfigApply} className="w-full mt-2">
            Apply DRAM Configuration
          </Button>
        </div>
      </div>

      <div className="p-4 pb-8">
        <h2 className="text-lg font-bold mb-4">Memory Controller Config</h2>
        <div className="flex flex-col gap-4">
          <AddresMappingInputForm
            dramStructures={dramStructures}
            value={maskInputs}
            onChange={handleAddressMappingChange}
          />
          <Button
            onClick={handleMemoryControllerApply}
            className="w-full mt-2"
            variant="secondary"
          >
            Apply Memory Controller Config
          </Button>
        </div>
      </div>
    </div>
  );
};
