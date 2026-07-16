mod common;

#[cfg(test)]
mod tests {
    use dram_visualizer_lib::{
        models::{AddressFunction, AddressMapping, DRAMStructure, TraceEntry},
        parse::{AddressDecoder, create_all_structure_from_mapping},
        trace::{MAX_DECODE_WINDOW, decode_to_canonical_path, decode_window},
    };

    use crate::common::simple_4gib;

    /// simple_4gib maps Column to bits 0..=12, BankGroup to 13..=14, Bank to 15,
    /// Row to 16..=23 and Subarray to 24..=31 (Channel/Rank unmapped). Building an
    /// address from field values lets us assert the canonical-order path exactly.
    fn addr_of(col: u64, bg: u64, bank: u64, row: u64, sa: u64) -> u64 {
        col | (bg << 13) | (bank << 15) | (row << 16) | (sa << 24)
    }

    #[test]
    fn decode_reorders_to_canonical_order() {
        let (mapping, _) = simple_4gib();
        let decoder = AddressDecoder::new(&mapping);
        let structures = create_all_structure_from_mapping(&mapping);

        // AddressDecoder::decode returns DRAM_FIELD_ORDER (Column first!);
        // the canonical path must be [Channel, Rank, BankGroup, Bank, Subarray, Row, Column].
        let path = decode_to_canonical_path(&decoder, &structures, addr_of(5, 3, 1, 200, 129));
        assert_eq!(path, [0, 0, 3, 1, 129, 200, 5]);

        // Unmapped structures (Channel, Rank) stay 0 even for all-ones addresses.
        let path = decode_to_canonical_path(&decoder, &structures, u64::MAX);
        assert_eq!(path[0], 0);
        assert_eq!(path[1], 0);
    }

    #[test]
    fn decode_applies_xor_of_selected_bits() {
        // Channel <- XOR of address bits {6, 14}, per the design's hand-checkable example.
        let mut mapping = AddressMapping::new();
        mapping.insert(
            DRAMStructure::Channel,
            vec![AddressFunction {
                target_bit: 0,
                select_bits: vec![6, 14],
            }],
        );
        let decoder = AddressDecoder::new(&mapping);
        let structures = create_all_structure_from_mapping(&mapping);

        let channel = |addr: u64| decode_to_canonical_path(&decoder, &structures, addr)[0];
        assert_eq!(channel(0), 0);
        assert_eq!(channel(1 << 6), 1);
        assert_eq!(channel(1 << 14), 1);
        assert_eq!(channel((1 << 6) | (1 << 14)), 0);
    }

    #[test]
    fn decode_window_clamps_to_trace_end_and_max_count() {
        let (mapping, _) = simple_4gib();
        let decoder = AddressDecoder::new(&mapping);
        let structures = create_all_structure_from_mapping(&mapping);
        let trace: Vec<TraceEntry> = (0..10)
            .map(|i| TraceEntry {
                addr: addr_of(i, 0, 0, 0, 0),
                original_line: i as usize + 1,
            })
            .collect();

        // Window past the end of the trace is clamped.
        let window = decode_window(&decoder, &structures, &trace, 8, 100);
        assert_eq!(window.len(), 2);
        assert_eq!(window[0].index, 8);
        assert_eq!(window[1].index, 9);
        assert_eq!(window[1].path[6], 9); // Column
        assert_eq!(window[1].addr_hex, format!("{:#X}", addr_of(9, 0, 0, 0, 0)));

        // Start beyond the end yields an empty window.
        assert!(decode_window(&decoder, &structures, &trace, 10, 5).is_empty());
        assert!(decode_window(&decoder, &structures, &trace, 1000, 5).is_empty());

        // The per-call count is capped at MAX_DECODE_WINDOW.
        let long: Vec<TraceEntry> = (0..MAX_DECODE_WINDOW as u64 + 100)
            .map(|i| TraceEntry { addr: i, original_line: i as usize + 1 })
            .collect();
        let window = decode_window(&decoder, &structures, &long, 0, usize::MAX);
        assert_eq!(window.len(), MAX_DECODE_WINDOW);
    }

    #[test]
    fn decode_clamps_indices_to_configured_counts() {
        let (mapping, _) = simple_4gib();
        let decoder = AddressDecoder::new(&mapping);
        // Deliberately inconsistent config: pretend BankGroup only has 2 elements
        // although the mapping produces indices up to 3.
        let mut structures = create_all_structure_from_mapping(&mapping);
        structures.insert(DRAMStructure::BankGroup, 2);

        let path = decode_to_canonical_path(&decoder, &structures, addr_of(0, 3, 0, 0, 0));
        assert_eq!(path[2], 1); // clamped to count - 1
    }
}
