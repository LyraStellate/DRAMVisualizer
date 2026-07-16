import { Box, TextField, Typography } from "@mui/material";
import {
  AddressFunction,
  DRAMStructure,
  DRAMStructures,
} from "../../../shared/types/dram";
import { getBit } from "../../../shared/utils/parsing";

interface Props {
  dramStructures: DRAMStructures;
  /** Mask input string per structure per target bit (controlled). */
  value: Record<DRAMStructure, string[]>;
  onChange: (
    dramStructure: DRAMStructure,
    addressFunction: AddressFunction,
    rawMask: string
  ) => void;
}

/**
 * Parses an address-bit mask ("0x14", "0b10100", "20", "_" separators
 * allowed). Returns null for invalid input or bits beyond address bit 63.
 */
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

/** Set-bit positions of the mask, ascending (0x14 -> [2, 4]). */
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
    <>
      {(Object.keys(dramStructures) as Array<keyof DRAMStructures>).map(
        (key) => {
          const structureValue = dramStructures[key];
          const bits = getBit(structureValue);

          if (bits <= 0) {
            return null;
          }

          return (
            <Box key={key}>
              <Typography variant="h6" component="h3">
                {key}
              </Typography>

              {Array.from({ length: bits }, (_, index) => {
                const raw = value[key]?.[index] || "";
                const mask = parseMask(raw);
                const invalid = mask === null;
                return (
                  <Box key={`${key}-nbit-${index}`}>
                    <Typography
                      variant="body2"
                      component="label"
                      htmlFor={`${key}-nbit-input-${index}`}
                    >
                      {key}[{index}]
                    </Typography>
                    <TextField
                      type="text"
                      placeholder="mask, e.g. 0x14"
                      id={`${key}-nbit-input-${index}`}
                      value={raw}
                      onChange={(e) =>
                        handleSetAddressMapping(key, index, e.target.value)
                      }
                      error={invalid}
                      helperText={
                        invalid
                          ? "invalid mask"
                          : mask > 0n
                            ? `bits: ${maskToSelectedBits(mask).join(",")}`
                            : " "
                      }
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                );
              })}
            </Box>
          );
        }
      )}
    </>
  );
};
