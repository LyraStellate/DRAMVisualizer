use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq, Serialize, Deserialize, PartialOrd, Ord)]
pub enum DRAMStructure {
    Channel,
    Rank,
    BankGroup,
    Bank,
    Subarray,
    Row,
    Column,
}

/// The canonical display order of the DRAM hierarchy, from the outermost
/// structure to the innermost. Access paths (`[u32; 7]`) are always expressed
/// in this order at the IPC boundary; the solver-internal `DRAM_FIELD_ORDER`
/// must never leak to the frontend.
pub const CANONICAL_ORDER: [DRAMStructure; 7] = [
    DRAMStructure::Channel,
    DRAMStructure::Rank,
    DRAMStructure::BankGroup,
    DRAMStructure::Bank,
    DRAMStructure::Subarray,
    DRAMStructure::Row,
    DRAMStructure::Column,
];

pub type AllDRAMStructure = HashMap<DRAMStructure, u64>;

#[derive(Debug, Hash, PartialEq, Eq, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddressFunction {
    pub target_bit: u8,
    #[serde(rename = "selectedBits", alias = "selectedBit")]
    pub select_bits: Vec<u8>,
}

pub type AddressMapping = HashMap<DRAMStructure, Vec<AddressFunction>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TraceEntry {
    pub addr: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TraceParseError {
    pub line: usize,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TraceSummary {
    pub total: usize,
    pub errors: Vec<TraceParseError>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DecodedAccess {
    pub index: usize,
    /// Hex string (e.g. "0x1A2B3C40") to avoid JS's 2^53 limit.
    pub addr_hex: String,
    /// Element index per hierarchy level, in `CANONICAL_ORDER`. Unmapped levels are 0.
    pub path: [u32; 7],
}
