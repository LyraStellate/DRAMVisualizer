import { DRAMStructures } from "../../../shared/types/dram";
import { getBit } from "../../../shared/utils/parsing";

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
    <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border">
      <h4 className="text-sm font-semibold mb-1">Bit Count Consistency</h4>
      <p className="text-xs text-muted-foreground mb-1">
        Capacity requires: {bitsFromCapacity} bits
      </p>
      <p
        className={`text-sm font-bold ${
          isConsistent ? "text-green-600 dark:text-green-400" : "text-destructive"
        }`}
      >
        Status: {isConsistent ? "Consistent" : "Inconsistent"}
      </p>
    </div>
  );
};
