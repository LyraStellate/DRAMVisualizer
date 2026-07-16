mod common;
#[cfg(test)]
mod tests {
    use dram_visualizer_lib::{
        models::{AddressFunction, AddressMapping, AllDRAMStructure, DRAMStructure},
        parse::{AddressDecoder, create_all_structure_from_mapping},
    };

    use crate::common::intel_core_i9_12900k;

    #[test]
    fn test_address_decoder() {
        let mut mapping = AddressMapping::new();
        // Column: identity on address bits 0-1.
        mapping.insert(
            DRAMStructure::Column,
            (0..=1)
                .map(|i| AddressFunction {
                    target_bit: i,
                    select_bits: vec![i],
                })
                .collect(),
        );
        // Bank: XOR of address bits 2 and 4.
        mapping.insert(
            DRAMStructure::Bank,
            vec![AddressFunction {
                target_bit: 0,
                select_bits: vec![2, 4],
            }],
        );
        // Row: identity on address bits 3 and 5.
        mapping.insert(
            DRAMStructure::Row,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![3],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![5],
                },
            ],
        );

        let decoder = AddressDecoder::new(&mapping);

        // addr = 0b101101: bits 0, 2, 3, 5 are set.
        let location = decoder.decode(0b101101);
        assert_eq!(
            location,
            vec![
                (DRAMStructure::Column, 0b01),
                (DRAMStructure::Bank, 1), // bit2 ^ bit4 = 1 ^ 0
                (DRAMStructure::Row, 0b11),
            ]
        );

        // addr = 0b010100: bits 2 and 4 are set, so the bank XOR cancels out.
        let location = decoder.decode(0b010100);
        assert_eq!(
            location,
            vec![
                (DRAMStructure::Column, 0),
                (DRAMStructure::Bank, 0), // bit2 ^ bit4 = 1 ^ 1
                (DRAMStructure::Row, 0),
            ]
        );
    }

    #[test]
    fn test_create_all_structure_from_mapping() {
        let (mapping, _) = intel_core_i9_12900k();
        let result = create_all_structure_from_mapping(&mapping);

        let mut expected_result = AllDRAMStructure::new();
        {
            expected_result.insert(DRAMStructure::Channel, 1); // 0 bit
            expected_result.insert(DRAMStructure::Rank, 2); // 1 bit 
            expected_result.insert(DRAMStructure::Bank, 4); // 2 bit
            expected_result.insert(DRAMStructure::BankGroup, 4); // 2 bit
            expected_result.insert(DRAMStructure::Subarray, 1); // 0 bit
            expected_result.insert(DRAMStructure::Row, 131072); // 17 bit
            expected_result.insert(DRAMStructure::Column, 8192); // 13 bit
        }

        assert_eq!(
            expected_result[&DRAMStructure::Channel],
            result[&DRAMStructure::Channel]
        );
        assert_eq!(
            expected_result[&DRAMStructure::Rank],
            result[&DRAMStructure::Rank]
        );
        assert_eq!(
            expected_result[&DRAMStructure::Bank],
            result[&DRAMStructure::Bank]
        );
        assert_eq!(
            expected_result[&DRAMStructure::BankGroup],
            result[&DRAMStructure::BankGroup]
        );
        assert_eq!(
            expected_result[&DRAMStructure::Row],
            result[&DRAMStructure::Row]
        );
        assert_eq!(
            expected_result[&DRAMStructure::Subarray],
            result[&DRAMStructure::Subarray]
        );
        assert_eq!(
            expected_result[&DRAMStructure::Column],
            result[&DRAMStructure::Column]
        );
    }
}
