import { KeyboardEvent, useState } from "react";
import {
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { DRAMStructures } from "../../../shared/types/dram";

interface Props {
  value: DRAMStructures;
  onChange: (key: keyof DRAMStructures, value: string) => void;
}

/** Element counts must be powers of two (1, 2, 4, …). */
export const isPowerOfTwo = (n: number): boolean =>
  Number.isInteger(n) && n >= 1 && Number.isInteger(Math.log2(n));

const MAX_COUNT = 2 ** 52; // stay within exact integer range

export const DRAMStructuresInputForm = ({ value, onChange }: Props) => {
  // Raw text per field so invalid intermediate input stays visible while
  // typing; only powers of two are committed to the parent.
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

  // The native number spinner only steps additively, so the field uses
  // custom arrows that double / halve the count instead.
  const stepBy = (key: keyof DRAMStructures, direction: 1 | -1) => {
    const parsed = parseInt(inputs[key] ?? String(value[key]), 10);
    const base = isPowerOfTwo(parsed) ? parsed : value[key];
    const next =
      direction === 1 ? Math.min(MAX_COUNT, base * 2) : Math.max(1, base / 2);
    handleChange(key, String(next));
  };

  const handleKeyDown = (
    key: keyof DRAMStructures,
    e: KeyboardEvent<HTMLDivElement>
  ) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      stepBy(key, e.key === "ArrowUp" ? 1 : -1);
    }
  };

  return (
    <>
      {(Object.keys(value) as Array<keyof DRAMStructures>).map((key) => {
        const raw = inputs[key] ?? String(value[key]);
        const invalid = !isPowerOfTwo(parseInt(raw, 10));
        return (
          <TextField
            key={key}
            label={key}
            type="text"
            value={raw}
            onChange={(e) => handleChange(key, e.target.value)}
            onKeyDown={(e) => handleKeyDown(key, e)}
            error={invalid}
            helperText={invalid ? "must be a power of 2 (1, 2, 4, …)" : " "}
            variant="outlined"
            size="small"
            slotProps={{
              input: {
                inputMode: "numeric",
                endAdornment: (
                  <InputAdornment position="end">
                    <Stack spacing={0}>
                      <IconButton
                        aria-label={`double ${key}`}
                        size="small"
                        sx={{ p: 0 }}
                        onClick={() => stepBy(key, 1)}
                      >
                        <KeyboardArrowUpIcon fontSize="inherit" />
                      </IconButton>
                      <IconButton
                        aria-label={`halve ${key}`}
                        size="small"
                        sx={{ p: 0 }}
                        onClick={() => stepBy(key, -1)}
                      >
                        <KeyboardArrowDownIcon fontSize="inherit" />
                      </IconButton>
                    </Stack>
                  </InputAdornment>
                ),
              },
            }}
          />
        );
      })}
    </>
  );
};
