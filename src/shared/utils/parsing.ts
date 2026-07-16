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

export function parseHexNumberToBytes(sizeStr: string): ParseResult {
  if (!sizeStr.trim()) {
    return { value: DEFAULT_VALUE, error: "Size input is empty" };
  }
  const cleanedStr = sizeStr.trim().toLowerCase();
  let sizeBytes: number;
  if (cleanedStr.startsWith("0x")) {
    sizeBytes = parseInt(cleanedStr.substring(2), 16);
  } else {
    if (/^[0-9a-f]+$/.test(cleanedStr)) {
      sizeBytes = parseInt(cleanedStr, 16);
    } else {
      return {
        value: DEFAULT_VALUE,
        error:
          "Invalid hexadecimal size. Expected e.g., 0x1000 or 1000 (hex bytes).",
      };
    }
  }
  if (isNaN(sizeBytes) || sizeBytes <= 0 || !isFinite(sizeBytes)) {
    return {
      value: DEFAULT_VALUE,
      error: "Invalid byte count from hex. Value must be a positive number.",
    };
  }
  return { value: sizeBytes, error: null };
}

export function parseNbitMappingToPositions(mappingStr: string): number[] {
  if (!mappingStr || !mappingStr.trim()) return [];
  const positions = mappingStr.split(",").map((s) => parseInt(s.trim(), 10));
  if (positions.some(isNaN)) return [];
  return positions;
}
