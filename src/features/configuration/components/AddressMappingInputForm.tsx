import {
  AddressFunction,
  DRAMStructure,
  DRAMStructures,
} from "../../../shared/types/dram";
import { getBit } from "../../../shared/utils/parsing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  dramStructures: DRAMStructures;
  value: Record<DRAMStructure, string[]>;
  onChange: (
    dramStructure: DRAMStructure,
    addressFunction: AddressFunction,
    rawMask: string
  ) => void;
}

const parseMask = (value: string): bigint | null => {
  const s = value.trim().replace(/_/g, "");
  if (s === "") return 0n;
  let mask: bigint;
  try {
    mask = BigInt(s);
  } catch {
    return null;
  }
  if (mask < 0n || mask >= 1n << 64n) return null;
  return mask;
};

const maskToSelectedBits = (mask: bigint): number[] => {
  const bits: number[] = [];
  for (let pos = 0; mask > 0n; pos++, mask >>= 1n) {
    if (mask & 1n) bits.push(pos);
  }
  return bits;
};

export const AddresMappingInputForm = ({
  dramStructures,
  value,
  onChange,
}: Props) => {
  const handleSetAddressMapping = (
    key: DRAMStructure,
    index: number,
    raw: string
  ) => {
    const mask = parseMask(raw);
    const newAddressFunction: AddressFunction = {
      targetBit: index,
      selectedBits: mask === null ? [] : maskToSelectedBits(mask),
    };
    onChange(key, newAddressFunction, raw);
  };

  return (
    <div className="flex flex-col gap-4 mt-2">
      {(Object.keys(dramStructures) as Array<keyof DRAMStructures>).map(
        (key) => {
          const structureValue = dramStructures[key];
          const bits = getBit(structureValue);

          if (bits <= 0) {
            return null;
          }

          return (
            <div key={key} className="flex flex-col gap-2 p-3 bg-muted/30 rounded-md border border-border">
              <h4 className="text-sm font-semibold capitalize text-foreground">{key}</h4>

              <div className="grid grid-cols-1 gap-2">
                {Array.from({ length: bits }, (_, index) => {
                  const raw = value[key]?.[index] || "";
                  const mask = parseMask(raw);
                  const invalid = mask === null;
                  return (
                    <div key={`${key}-nbit-${index}`} className="flex items-center gap-2">
                      <Label
                        htmlFor={`${key}-nbit-input-${index}`}
                        className="w-16 text-xs text-muted-foreground shrink-0 text-right"
                      >
                        {key}[{index}]
                      </Label>
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="e.g. 0x14"
                          id={`${key}-nbit-input-${index}`}
                          value={raw}
                          onChange={(e) =>
                            handleSetAddressMapping(key, index, e.target.value)
                          }
                          className={`h-8 text-sm ${invalid ? "border-destructive" : ""}`}
                        />
                        {invalid && <p className="text-[10px] text-destructive mt-0.5">invalid mask</p>}
                        {!invalid && mask > 0n && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            bits: {maskToSelectedBits(mask).join(",")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
};
