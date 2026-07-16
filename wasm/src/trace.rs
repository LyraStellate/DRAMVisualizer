//! Memory access trace parsing and decoding.
//!
//! Trace format (one hex address per line, "0x" prefix required;
//! blank lines are skipped):
//! ```text
//! 0x1A2B3C40
//! 0xDEADBEEF
//! ```

use crate::models::{
    AllDRAMStructure, DRAMStructure, DecodedAccess, TraceEntry, TraceParseError,
};
use crate::parse::AddressDecoder;

/// Upper bound on the number of accesses decoded per `get_decoded_accesses` call.
pub const MAX_DECODE_WINDOW: usize = 8192;

/// Parses a whole trace. Failed lines are collected as errors; parsing continues.
pub fn parse_trace(content: &str) -> (Vec<TraceEntry>, Vec<TraceParseError>) {
    let mut entries = Vec::new();
    let mut errors = Vec::new();
    for (i, raw) in content.lines().enumerate() {
        match parse_line(raw) {
            Ok(Some(entry)) => entries.push(entry),
            Ok(None) => {}
            Err(message) => errors.push(TraceParseError {
                line: i + 1,
                message,
            }),
        }
    }
    (entries, errors)
}

fn parse_line(raw: &str) -> Result<Option<TraceEntry>, String> {
    let line = raw.trim();
    if line.is_empty() {
        return Ok(None);
    }
    let mut tokens = line.split_whitespace();
    let addr_token = tokens.next().expect("non-empty line has a token");
    if tokens.next().is_some() {
        return Err("expected a single address per line".to_string());
    }
    let addr = parse_addr(addr_token)?;
    Ok(Some(TraceEntry { addr }))
}

fn parse_addr(token: &str) -> Result<u64, String> {
    let Some(hex) = token
        .strip_prefix("0x")
        .or_else(|| token.strip_prefix("0X"))
    else {
        return Err(format!("invalid address '{token}' (expected 0x-prefixed hex)"));
    };
    u64::from_str_radix(hex, 16)
        .map_err(|_| format!("invalid address '{token}' (expected 0x-prefixed hex)"))
}

fn canonical_index(structure: DRAMStructure) -> usize {
    match structure {
        DRAMStructure::Channel => 0,
        DRAMStructure::Rank => 1,
        DRAMStructure::BankGroup => 2,
        DRAMStructure::Bank => 3,
        DRAMStructure::Subarray => 4,
        DRAMStructure::Row => 5,
        DRAMStructure::Column => 6,
    }
}

/// Decodes `addr` into a `[u32; 7]` path in `models::CANONICAL_ORDER`
/// (`canonical_index` mirrors that order).
///
/// `AddressDecoder::decode` returns values in the solver-internal
/// `DRAM_FIELD_ORDER`; this function is the single place that reorders them.
/// Structures missing from the decoder output (unmapped, single element) stay 0.
/// Each index is clamped to the configured element count as a defense against
/// inconsistent configurations.
pub fn decode_to_canonical_path(
    decoder: &AddressDecoder,
    structures: &AllDRAMStructure,
    addr: u64,
) -> [u32; 7] {
    let mut path = [0u32; 7];
    for (structure, value) in decoder.decode(addr) {
        let count = structures.get(&structure).copied().unwrap_or(1).max(1);
        let clamped = value.min(count - 1).min(u64::from(u32::MAX));
        path[canonical_index(structure)] = clamped as u32;
    }
    path
}

/// Decodes the window `[start, start + count)` of `trace`, clamping both the
/// window size (to `MAX_DECODE_WINDOW`) and the trace end.
pub fn decode_window(
    decoder: &AddressDecoder,
    structures: &AllDRAMStructure,
    trace: &[TraceEntry],
    start: usize,
    count: usize,
) -> Vec<DecodedAccess> {
    let start = start.min(trace.len());
    let end = start
        .saturating_add(count.min(MAX_DECODE_WINDOW))
        .min(trace.len());
    trace[start..end]
        .iter()
        .enumerate()
        .map(|(offset, entry)| DecodedAccess {
            index: start + offset,
            addr_hex: format!("{:#X}", entry.addr),
            path: decode_to_canonical_path(decoder, structures, entry.addr),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_hex_addresses() {
        let (entries, errors) = parse_trace("0x10\n0X1f\n0x30\n");
        assert!(errors.is_empty());
        assert_eq!(
            entries,
            vec![
                TraceEntry { addr: 0x10 },
                TraceEntry { addr: 0x1F },
                TraceEntry { addr: 0x30 },
            ]
        );
    }

    #[test]
    fn skips_blank_lines() {
        let (entries, errors) = parse_trace("\n   \n0x40\n\n");
        assert!(errors.is_empty());
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].addr, 0x40);
    }

    #[test]
    fn rejects_unprefixed_and_non_hex_addresses() {
        let (entries, errors) = parse_trace("255\nDEADBEEF\n0xnothex\n0x10\n");
        assert_eq!(entries, vec![TraceEntry { addr: 0x10 }]);
        assert_eq!(errors.len(), 3);
        assert_eq!(errors[0].line, 1);
        assert_eq!(errors[1].line, 2);
        assert_eq!(errors[2].line, 3);
    }

    #[test]
    fn collects_errors_and_continues() {
        let (entries, errors) = parse_trace("0x10\nR 0x20\n0x1 0x2 extra\n0x30\n");
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[1].addr, 0x30);
        assert_eq!(errors.len(), 2);
        assert_eq!(errors[0].line, 2);
        assert_eq!(errors[1].line, 3);
    }
}
