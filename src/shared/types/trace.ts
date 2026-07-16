export interface TraceParseError {
  line: number;
  message: string;
}

export interface TraceSummary {
  total: number;
  errors: TraceParseError[];
}

export interface DecodedAccess {
  index: number;
  /** Hex string (e.g. "0x1A2B3C40"); addresses may exceed 2^53. */
  addrHex: string;
  /** Element index per hierarchy level, in HIERARCHY_ORDER (length 7). */
  path: number[];
  originalLine: number;
}
