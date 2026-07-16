import { useState } from "react";
import { TextField, Typography } from "@mui/material";
import { getBit, parseDRAMTotalCapacity } from "../../../shared/utils/parsing";
import {
  DEFAULT_TOTAL_CAPACITY,
  DEFAULT_TOTAL_CAPACITY_INPUT,
} from "../defaults";

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
    }
    setTotalCapacity(result.value);
    onChange(result.value);
  };

  return (
    <>
      <TextField
        label="Total Capacity (e.g., 2GB)"
        variant="outlined"
        size="small"
        value={inputValue}
        onChange={(e) => handleCapacityChange(e.target.value)}
        error={!!error}
        helperText={error || " "}
      />
      <Typography variant="body2">{`Total memory bits from settings: ${getBit(
        totalCapacity
      )}`}</Typography>
    </>
  );
};
