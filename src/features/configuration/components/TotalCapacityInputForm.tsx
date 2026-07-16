import { useState } from "react";
import { getBit, parseDRAMTotalCapacity } from "../../../shared/utils/parsing";
import {
  DEFAULT_TOTAL_CAPACITY,
  DEFAULT_TOTAL_CAPACITY_INPUT,
} from "../defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  onChange: (value: number) => void;
}

export const TotalCapacityInputForm = ({ onChange }: Props) => {
  const [inputValue, setInputValue] = useState<string>(
    DEFAULT_TOTAL_CAPACITY_INPUT
  );
  const [totalCapacity, setTotalCapacity] = useState<number>(
    DEFAULT_TOTAL_CAPACITY
  );
  const [error, setError] = useState<string | null>(null);

  const handleCapacityChange = (value: string) => {
    setError(null);
    setInputValue(value);
    const result = parseDRAMTotalCapacity(value);
    if (result.error) {
      setError(result.error);
    } else {
      setTotalCapacity(result.value);
      onChange(result.value);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor="total-capacity">Total Capacity</Label>
        <Input
          id="total-capacity"
          type="text"
          placeholder="e.g., 2GB"
          value={inputValue}
          onChange={(e) => handleCapacityChange(e.target.value)}
          className={error ? "border-destructive" : ""}
        />
        {error ? (
          <p className="text-[10px] text-destructive">{error}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Total memory bits: {getBit(totalCapacity)}
          </p>
        )}
      </div>
    </div>
  );
};
