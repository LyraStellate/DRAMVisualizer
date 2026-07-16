import {
  AddressFunction,
  DRAMStructure,
  DRAMStructures,
} from "../../../shared/types/dram";
import { getBit } from "../../../shared/utils/parsing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  const validKeys = (Object.keys(dramStructures) as Array<keyof DRAMStructures>).filter(
    (key) => getBit(dramStructures[key]) > 0
  );

  return (
    <Accordion type="single" collapsible className="w-full flex flex-col gap-2">
      {validKeys.map((key) => {
        const bits = getBit(dramStructures[key]);

        return (
          <AccordionItem
            key={key}
            value={key}
            className="border border-border rounded-md bg-muted/20 overflow-hidden px-0"
          >
            <AccordionTrigger className="px-3 py-2 text-sm font-semibold capitalize hover:no-underline hover:bg-muted/40 transition-colors">
              {key} Mapping
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 pt-2 border-t border-border bg-background">
              <div className="grid grid-cols-1 gap-2.5">
                {Array.from({ length: bits }, (_, index) => {
                  const raw = value[key]?.[index] || "";
                  const mask = parseMask(raw);
                  const invalid = mask === null;
                  return (
                    <div key={`${key}-nbit-${index}`} className="flex items-start gap-2 pt-1">
                      <Label
                        htmlFor={`${key}-nbit-input-${index}`}
                        className="w-12 text-xs text-muted-foreground shrink-0 text-right font-mono mt-2"
                      >
                        {key.substring(0, 3)}[{index}]
                      </Label>
                      <div className="flex-1 flex flex-col gap-1">
                        <Input
                          type="text"
                          placeholder="e.g. 0x14"
                          id={`${key}-nbit-input-${index}`}
                          value={raw}
                          onChange={(e) =>
                            handleSetAddressMapping(key, index, e.target.value)
                          }
                          className={`h-8 text-sm font-mono ${invalid ? "border-destructive" : ""}`}
                        />
                        {invalid && <p className="text-xs text-destructive">invalid mask</p>}
                        {!invalid && mask > 0n && (
                          <p className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-sm break-all font-mono">
                            bits: {maskToSelectedBits(mask).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
