import { KeyboardEvent, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { DRAMStructures } from "../../../shared/types/dram";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  value: DRAMStructures;
  onChange: (key: keyof DRAMStructures, value: string) => void;
}

/** Element counts must be powers of two (1, 2, 4, …). */
export const isPowerOfTwo = (n: number): boolean =>
  Number.isInteger(n) && n >= 1 && Number.isInteger(Math.log2(n));

const MAX_COUNT = 2 ** 52; // stay within exact integer range

export const DRAMStructuresInputForm = ({ value, onChange }: Props) => {
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(value).map(([key, count]) => [key, String(count)])
    )
  );

  const handleChange = (key: keyof DRAMStructures, raw: string) => {
    setInputs((prev) => ({ ...prev, [key]: raw }));
    if (isPowerOfTwo(parseInt(raw, 10))) {
      onChange(key, raw);
    }
  };

  const stepBy = (key: keyof DRAMStructures, direction: 1 | -1) => {
    const parsed = parseInt(inputs[key] ?? String(value[key]), 10);
    const base = isPowerOfTwo(parsed) ? parsed : value[key];
    const next =
      direction === 1 ? Math.min(MAX_COUNT, base * 2) : Math.max(1, base / 2);
    handleChange(key, String(next));
  };

  const handleKeyDown = (
    key: keyof DRAMStructures,
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      stepBy(key, e.key === "ArrowUp" ? 1 : -1);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 mt-2">
      {(Object.keys(value) as Array<keyof DRAMStructures>).map((key) => {
        const raw = inputs[key] ?? String(value[key]);
        const invalid = !isPowerOfTwo(parseInt(raw, 10));
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`dram-struct-${key}`} className="text-xs text-muted-foreground">
              {key}
            </Label>
            <div className="relative">
              <Input
                id={`dram-struct-${key}`}
                type="text"
                value={raw}
                onChange={(e) => handleChange(key, e.target.value)}
                onKeyDown={(e) => handleKeyDown(key, e)}
                className={`pr-8 text-sm h-8 ${invalid ? "border-destructive" : ""}`}
              />
              <div className="absolute right-1 top-1 flex flex-col">
                <button
                  type="button"
                  tabIndex={-1}
                  className="h-3 w-3 hover:bg-accent rounded flex items-center justify-center text-muted-foreground"
                  onClick={() => stepBy(key, 1)}
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  className="h-3 w-3 hover:bg-accent rounded flex items-center justify-center text-muted-foreground"
                  onClick={() => stepBy(key, -1)}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
