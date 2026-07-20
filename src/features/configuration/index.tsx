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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Settings2, Cpu, Database } from "lucide-react";

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
    <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar bg-card">
      <div className="p-4 border-b border-border bg-muted/20">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Configuration
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Adjust DRAM and Memory Controller parameters
        </p>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["dram-config", "mc-config"]}
        className="w-full"
      >
        <AccordionItem value="dram-config" className="border-b border-border">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 font-semibold">
              <Database className="w-4 h-4 text-muted-foreground" />
              DRAM Geometry
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="flex flex-col gap-5 pt-2">
              <TotalCapacityInputForm onChange={handleTotalCapacityUpdate} />
              
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Structures</span>
                <DRAMStructuresInputForm
                  value={dramStructures}
                  onChange={handleDRAMStructuresChange}
                />
              </div>

              <CheckPanel
                dramStructures={dramStructures}
                totalCapacity={totalCapacity}
              />
              <Button onClick={handleDramConfigApply} className="w-full mt-2" size="sm">
                Apply Geometry
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mc-config" className="border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 font-semibold">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              Memory Controller
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-8">
            <div className="flex flex-col gap-4 pt-2">
              <AddresMappingInputForm
                dramStructures={dramStructures}
                value={maskInputs}
                onChange={handleAddressMappingChange}
              />
              <Button
                onClick={handleMemoryControllerApply}
                className="w-full mt-2"
                size="sm"
              >
                Apply Controller Config
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
