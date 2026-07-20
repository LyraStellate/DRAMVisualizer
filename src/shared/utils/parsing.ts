import { DEFAULT_VALUE } from "../constants/number";

type ParseResult = {
  value: number;
  error: string | null;
};

export function getBit(value: number): number {
  if (value <= 0) return 0;
  if (value === 1) return 0;
  return Math.floor(Math.log2(value - 1)) + 1;
}

export function parseDRAMTotalCapacity(sizeStr: string): ParseResult {
  if (sizeStr == "") {
    return { value: DEFAULT_VALUE, error: "Input is empty" };
  }
  const cleanedStr = sizeStr.trim().toUpperCase();
  const sizePattern = /^(\d+(?:\.\d+)?)\s*([KMGT])?([B])?$/;
  const match = cleanedStr.match(sizePattern);
  if (!match) {
    return {
      value: DEFAULT_VALUE,
      error:
        "Invalid format. Example: 2GB, 512M, 1024KB, 2048B, or 4096 (Bytes)",
    };
  }
  const value = parseFloat(match[1]);
  const prefix = match[2] || "";
  const unitChar = match[3] || "";
  let multiplier = 1;
  if (prefix === "K") multiplier = 1024;
  else if (prefix === "M") multiplier = 1024 * 1024;
  else if (prefix === "G") multiplier = 1024 * 1024 * 1024;
  else if (prefix !== "")
    return { value: DEFAULT_VALUE, error: `Unknown prefix: ${prefix}` };
  if (unitChar !== "B" && unitChar !== "")
    return {
      value: DEFAULT_VALUE,
      error: `Invalid unit character: ${unitChar}`,
    };
  const bytes = value * multiplier;
  if (bytes <= 0 || !isFinite(bytes) || isNaN(bytes)) {
    return {
      value: DEFAULT_VALUE,
      error: "Cannot convert to a valid byte count (must be greater than 0)",
    };
  }
  return { value: bytes, error: null };
}

