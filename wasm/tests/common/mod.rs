// Fixture library shared across test binaries; each binary uses only a subset.
#![allow(dead_code)]

use dram_visualizer_lib::models::{AddressFunction, AddressMapping, DRAMStructure};

pub fn simple_4gib() -> (AddressMapping, u64) {
    let mut mapping = AddressMapping::new();
    {
        mapping.insert(
            DRAMStructure::Column,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![0],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![1],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![2],
                },
                AddressFunction {
                    target_bit: 3,
                    select_bits: vec![3],
                },
                AddressFunction {
                    target_bit: 4,
                    select_bits: vec![4],
                },
                AddressFunction {
                    target_bit: 5,
                    select_bits: vec![5],
                },
                AddressFunction {
                    target_bit: 6,
                    select_bits: vec![6],
                },
                AddressFunction {
                    target_bit: 7,
                    select_bits: vec![7],
                },
                AddressFunction {
                    target_bit: 8,
                    select_bits: vec![8],
                },
                AddressFunction {
                    target_bit: 9,
                    select_bits: vec![9],
                },
                AddressFunction {
                    target_bit: 10,
                    select_bits: vec![10],
                },
                AddressFunction {
                    target_bit: 11,
                    select_bits: vec![11],
                },
                AddressFunction {
                    target_bit: 12,
                    select_bits: vec![12],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::BankGroup,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![13],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![14],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::Bank,
            vec![AddressFunction {
                target_bit: 0,
                select_bits: vec![15],
            }],
        );
        mapping.insert(
            DRAMStructure::Row,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![16],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![17],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![18],
                },
                AddressFunction {
                    target_bit: 3,
                    select_bits: vec![19],
                },
                AddressFunction {
                    target_bit: 4,
                    select_bits: vec![20],
                },
                AddressFunction {
                    target_bit: 5,
                    select_bits: vec![21],
                },
                AddressFunction {
                    target_bit: 6,
                    select_bits: vec![22],
                },
                AddressFunction {
                    target_bit: 7,
                    select_bits: vec![23],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::Subarray,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![24],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![25],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![26],
                },
                AddressFunction {
                    target_bit: 3,
                    select_bits: vec![27],
                },
                AddressFunction {
                    target_bit: 4,
                    select_bits: vec![28],
                },
                AddressFunction {
                    target_bit: 5,
                    select_bits: vec![29],
                },
                AddressFunction {
                    target_bit: 6,
                    select_bits: vec![30],
                },
                AddressFunction {
                    target_bit: 7,
                    select_bits: vec![31],
                },
            ],
        );
        mapping.insert(DRAMStructure::Channel, vec![]);
        mapping.insert(DRAMStructure::Rank, vec![]);
    }
    let capacity = 1 << 32;
    (mapping, capacity)
}

pub fn intel_skylake_i5_6200u_ddr4_4gib() -> (AddressMapping, u64) {
    let mut mapping = AddressMapping::new();
    {
        mapping.insert(
            DRAMStructure::Column,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![0],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![1],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![2],
                },
                AddressFunction {
                    target_bit: 3,
                    select_bits: vec![3],
                },
                AddressFunction {
                    target_bit: 4,
                    select_bits: vec![4],
                },
                AddressFunction {
                    target_bit: 5,
                    select_bits: vec![5],
                },
                AddressFunction {
                    target_bit: 6,
                    select_bits: vec![6],
                },
                AddressFunction {
                    target_bit: 7,
                    select_bits: vec![7],
                },
                AddressFunction {
                    target_bit: 8,
                    select_bits: vec![8],
                },
                AddressFunction {
                    target_bit: 9,
                    select_bits: vec![9],
                },
                AddressFunction {
                    target_bit: 10,
                    select_bits: vec![10],
                },
                AddressFunction {
                    target_bit: 11,
                    select_bits: vec![11],
                },
                AddressFunction {
                    target_bit: 12,
                    select_bits: vec![12],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::Row,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![16],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![17],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![18],
                },
                AddressFunction {
                    target_bit: 3,
                    select_bits: vec![19],
                },
                AddressFunction {
                    target_bit: 4,
                    select_bits: vec![20],
                },
                AddressFunction {
                    target_bit: 5,
                    select_bits: vec![21],
                },
                AddressFunction {
                    target_bit: 6,
                    select_bits: vec![22],
                },
                AddressFunction {
                    target_bit: 7,
                    select_bits: vec![23],
                },
                AddressFunction {
                    target_bit: 8,
                    select_bits: vec![24],
                },
                AddressFunction {
                    target_bit: 9,
                    select_bits: vec![25],
                },
                AddressFunction {
                    target_bit: 10,
                    select_bits: vec![26],
                },
                AddressFunction {
                    target_bit: 11,
                    select_bits: vec![27],
                },
                AddressFunction {
                    target_bit: 12,
                    select_bits: vec![28],
                },
                AddressFunction {
                    target_bit: 13,
                    select_bits: vec![29],
                },
                AddressFunction {
                    target_bit: 14,
                    select_bits: vec![30],
                },
                AddressFunction {
                    target_bit: 15,
                    select_bits: vec![31],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::Bank,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![15, 17],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![14, 16],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![6, 13],
                },
            ],
        );
        mapping.insert(DRAMStructure::BankGroup, vec![]);
        mapping.insert(DRAMStructure::Subarray, vec![]);
        mapping.insert(DRAMStructure::Rank, vec![]);
        mapping.insert(DRAMStructure::Channel, vec![]);
    }
    let capacity = 1 << 32;
    (mapping, capacity)
}

pub fn intel_haswell_i5_4210u_ddr3_4gib() -> (AddressMapping, u64) {
    let mut mapping = AddressMapping::new();
    {
        mapping.insert(
            DRAMStructure::Column,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![0],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![1],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![2],
                },
                AddressFunction {
                    target_bit: 3,
                    select_bits: vec![3],
                },
                AddressFunction {
                    target_bit: 4,
                    select_bits: vec![4],
                },
                AddressFunction {
                    target_bit: 5,
                    select_bits: vec![5],
                },
                AddressFunction {
                    target_bit: 6,
                    select_bits: vec![6],
                },
                AddressFunction {
                    target_bit: 7,
                    select_bits: vec![7],
                },
                AddressFunction {
                    target_bit: 8,
                    select_bits: vec![8],
                },
                AddressFunction {
                    target_bit: 9,
                    select_bits: vec![9],
                },
                AddressFunction {
                    target_bit: 10,
                    select_bits: vec![10],
                },
                AddressFunction {
                    target_bit: 11,
                    select_bits: vec![11],
                },
                AddressFunction {
                    target_bit: 12,
                    select_bits: vec![12],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::Row,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![16],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![17],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![18],
                },
                AddressFunction {
                    target_bit: 3,
                    select_bits: vec![19],
                },
                AddressFunction {
                    target_bit: 4,
                    select_bits: vec![20],
                },
                AddressFunction {
                    target_bit: 5,
                    select_bits: vec![21],
                },
                AddressFunction {
                    target_bit: 6,
                    select_bits: vec![22],
                },
                AddressFunction {
                    target_bit: 7,
                    select_bits: vec![23],
                },
                AddressFunction {
                    target_bit: 8,
                    select_bits: vec![24],
                },
                AddressFunction {
                    target_bit: 9,
                    select_bits: vec![25],
                },
                AddressFunction {
                    target_bit: 10,
                    select_bits: vec![26],
                },
                AddressFunction {
                    target_bit: 11,
                    select_bits: vec![27],
                },
                AddressFunction {
                    target_bit: 12,
                    select_bits: vec![28],
                },
                AddressFunction {
                    target_bit: 13,
                    select_bits: vec![29],
                },
                AddressFunction {
                    target_bit: 14,
                    select_bits: vec![30],
                },
                AddressFunction {
                    target_bit: 15,
                    select_bits: vec![31],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::Bank,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![15, 18],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![14, 17],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![13, 16],
                },
            ],
        );
        mapping.insert(DRAMStructure::BankGroup, vec![]);
        mapping.insert(DRAMStructure::Subarray, vec![]);
        mapping.insert(DRAMStructure::Rank, vec![]);
        mapping.insert(DRAMStructure::Channel, vec![]);
    }
    let capacity = 1 << 32;
    (mapping, capacity)
}

pub fn intel_core_i9_12900k() -> (AddressMapping, u64) {
    let mut mapping = AddressMapping::new();
    mapping.insert(DRAMStructure::Channel, vec![]);
    mapping.insert(
        DRAMStructure::Rank,
        vec![AddressFunction {
            target_bit: 0,
            select_bits: vec![15, 19],
        }],
    );
    mapping.insert(
        DRAMStructure::Bank,
        vec![
            AddressFunction {
                target_bit: 0,
                select_bits: vec![16, 20, 23, 24, 27, 30, 33],
            },
            AddressFunction {
                target_bit: 1,
                select_bits: vec![17, 21, 22, 25, 28, 31, 34],
            },
        ],
    );
    mapping.insert(
        DRAMStructure::BankGroup,
        vec![
            AddressFunction {
                target_bit: 0,
                select_bits: vec![9, 11, 13],
            },
            AddressFunction {
                target_bit: 1,
                select_bits: vec![14, 18, 26, 29, 32],
            },
        ],
    );
    mapping.insert(DRAMStructure::Subarray, vec![]);
    mapping.insert(
        DRAMStructure::Row,
        (0..=16)
            .map(|i| AddressFunction {
                target_bit: i,
                select_bits: vec![18 + i],
            })
            .collect(),
    );
    mapping.insert(
        DRAMStructure::Column,
        (0..=12)
            .map(|i| AddressFunction {
                target_bit: i,
                select_bits: vec![i],
            })
            .collect(),
    );

    let capacity = 1 << 35;

    (mapping, capacity)
}

pub fn intel_core_i9_12900k_with_subarray() -> (AddressMapping, u64) {
    let mut mapping = AddressMapping::new();
    {
        mapping.insert(DRAMStructure::Channel, vec![]);
        mapping.insert(
            DRAMStructure::Rank,
            vec![AddressFunction {
                target_bit: 0,
                select_bits: vec![15, 19],
            }],
        );
        mapping.insert(
            DRAMStructure::Bank,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![16, 20, 23, 24, 27, 30, 33],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![17, 21, 22, 25, 28, 31, 34],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::BankGroup,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![9, 11, 13],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![14, 18, 26, 29, 32, 35],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::Subarray,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![24],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![25],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![26],
                },
                AddressFunction {
                    target_bit: 3,
                    select_bits: vec![27],
                },
                AddressFunction {
                    target_bit: 4,
                    select_bits: vec![28],
                },
                AddressFunction {
                    target_bit: 5,
                    select_bits: vec![29],
                },
                AddressFunction {
                    target_bit: 6,
                    select_bits: vec![30],
                },
                AddressFunction {
                    target_bit: 7,
                    select_bits: vec![31],
                },
                AddressFunction {
                    target_bit: 8,
                    select_bits: vec![32],
                },
                AddressFunction {
                    target_bit: 9,
                    select_bits: vec![33],
                },
                AddressFunction {
                    target_bit: 10,
                    select_bits: vec![34],
                },
                AddressFunction {
                    target_bit: 11,
                    select_bits: vec![35],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::Row,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![19],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![20],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![21],
                },
                AddressFunction {
                    target_bit: 3,
                    select_bits: vec![22],
                },
                AddressFunction {
                    target_bit: 4,
                    select_bits: vec![23],
                },
            ],
        );
        mapping.insert(
            DRAMStructure::Column,
            vec![
                AddressFunction {
                    target_bit: 0,
                    select_bits: vec![0],
                },
                AddressFunction {
                    target_bit: 1,
                    select_bits: vec![1],
                },
                AddressFunction {
                    target_bit: 2,
                    select_bits: vec![2],
                },
                AddressFunction {
                    target_bit: 3,
                    select_bits: vec![3],
                },
                AddressFunction {
                    target_bit: 4,
                    select_bits: vec![4],
                },
                AddressFunction {
                    target_bit: 5,
                    select_bits: vec![5],
                },
                AddressFunction {
                    target_bit: 6,
                    select_bits: vec![6],
                },
                AddressFunction {
                    target_bit: 7,
                    select_bits: vec![7],
                },
                AddressFunction {
                    target_bit: 8,
                    select_bits: vec![8],
                },
                AddressFunction {
                    target_bit: 9,
                    select_bits: vec![9],
                },
                AddressFunction {
                    target_bit: 10,
                    select_bits: vec![10],
                },
                AddressFunction {
                    target_bit: 11,
                    select_bits: vec![11],
                },
                AddressFunction {
                    target_bit: 12,
                    select_bits: vec![12],
                },
            ],
        );
    }

    let capacity = 1 << 35;

    (mapping, capacity)
}
