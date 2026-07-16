import { DRAMStructures } from "../../../shared/types/dram";
import { getBit } from "../../../shared/utils/parsing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  totalCapacity: number;
  dramStructures: DRAMStructures;
}

export const CheckPanel = ({ totalCapacity, dramStructures }: Props) => {
  const totalNbitSum = Object.values(dramStructures).reduce(
    (sum, value) => sum + getBit(value),
    0
  );
  const bitsFromCapacity = getBit(totalCapacity);
  const isConsistent = totalNbitSum === bitsFromCapacity;

  return (
    <Alert variant={isConsistent ? "default" : "destructive"} className="mt-2 py-2 px-3">
      {isConsistent ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle className="text-xs font-semibold mb-0.5 flex items-center">
        Geometry Consistency
      </AlertTitle>
      <AlertDescription className="text-[10px] mt-0.5">
        Capacity bits: <strong>{bitsFromCapacity}</strong> | Structure bits: <strong>{totalNbitSum}</strong>
        {!isConsistent && " (Mismatch)"}
      </AlertDescription>
    </Alert>
  );
};
