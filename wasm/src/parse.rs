use crate::models::{AddressMapping, AllDRAMStructure, DRAMStructure};

/// The order in which DRAM structures are laid out as decoder fields.
const DRAM_FIELD_ORDER: [DRAMStructure; 7] = [
    DRAMStructure::Column,
    DRAMStructure::Channel,
    DRAMStructure::BankGroup,
    DRAMStructure::Rank,
    DRAMStructure::Bank,
    DRAMStructure::Row,
    DRAMStructure::Subarray,
];

/// Decodes a physical address into its DRAM location: the element index of every
/// mapped DRAM structure (e.g. Row 3, Column 5).
///
/// The XOR masks are precomputed from the address mapping once, so `decode` only
/// costs one masked popcount per address function.
pub struct AddressDecoder {
    /// Per structure: the XOR mask of each address function, indexed by its target bit.
    fields: Vec<(DRAMStructure, Vec<u64>)>,
}

impl AddressDecoder {
    pub fn new(mapping: &AddressMapping) -> Self {
        let mut fields = Vec::new();
        for &structure in &DRAM_FIELD_ORDER {
            let Some(functions) = mapping.get(&structure) else {
                continue;
            };
            let Some(width) = functions.iter().map(|f| f.target_bit as usize + 1).max() else {
                continue; // No address functions: the structure has a single element.
            };
            let mut masks = vec![0u64; width];
            for func in functions {
                masks[func.target_bit as usize] = func
                    .select_bits
                    .iter()
                    .fold(0u64, |mask, &bit| mask | (1u64 << bit));
            }
            fields.push((structure, masks));
        }
        Self { fields }
    }

    /// Returns the element index of each DRAM structure for `addr`,
    /// in `DRAM_FIELD_ORDER` order.
    pub fn decode(&self, addr: u64) -> Vec<(DRAMStructure, u64)> {
        self.fields
            .iter()
            .map(|(structure, masks)| {
                // Bit i of the index is the XOR (parity) of the selected address bits.
                let value = masks.iter().enumerate().fold(0u64, |value, (i, &mask)| {
                    value | (u64::from((addr & mask).count_ones() & 1) << i)
                });
                (*structure, value)
            })
            .collect()
    }
}

pub fn create_all_structure_from_mapping(mapping: &AddressMapping) -> AllDRAMStructure {
    let mut all_structure = AllDRAMStructure::new();

    for (dram_struct, addr_funcs) in mapping.iter() {
        let num_bits = addr_funcs.len() as u32;
        let num_elements = 2_u64.pow(num_bits);
        all_structure.insert(*dram_struct, num_elements);
    }

    all_structure
}
