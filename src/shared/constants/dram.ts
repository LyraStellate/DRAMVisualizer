// Canonical hierarchy order, outermost → innermost.
// Must match the Rust `DRAMStructure` enum declaration order / `CANONICAL_ORDER`
// (models.rs). Access paths ([u32; 7] from the backend) are indexed in this order.
export const HIERARCHY_ORDER = [
  "Channel",
  "Rank",
  "BankGroup",
  "Bank",
  "Subarray",
  "Row",
  "Column",
] as const;

export const NUM_LEVELS = 7;
