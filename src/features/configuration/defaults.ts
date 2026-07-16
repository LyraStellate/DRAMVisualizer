// Initial values for the configuration panels.
import {
  AddressMapping,
  DRAMStructure,
  DRAMStructures,
} from "../../shared/types/dram";
import { getBit } from "../../shared/utils/parsing";

export const DEFAULT_TOTAL_CAPACITY_INPUT = "32GB";
export const DEFAULT_TOTAL_CAPACITY = 2 ** 35;

export const DEFAULT_DRAM_STRUCTURES: DRAMStructures = {
  Channel: 2,
  Rank: 2,
  Bank: 4,
  BankGroup: 8,
  Subarray: 1,
  Row: 32768,
  Column: 8192,
};

/**
 * Bit-assignment order of the linear (identity) mapping: the innermost
 * structure (Column) sits at the LSBs and the outermost (Channel) at the MSBs.
 */
const LINEAR_ORDER: DRAMStructure[] = [
  "Column",
  "Row",
  "Subarray",
  "Bank",
  "BankGroup",
  "Rank",
  "Channel",
];

/**
 * Builds the linear (identity) address mapping for the given structure
 * counts, together with the equivalent mask input strings for the form.
 */
export function buildLinearMapping(structures: DRAMStructures): {
  mapping: AddressMapping;
  masks: Record<DRAMStructure, string[]>;
} {
  const mapping: AddressMapping = {
    Channel: [],
    Rank: [],
    Bank: [],
    BankGroup: [],
    Subarray: [],
    Row: [],
    Column: [],
  };
  const masks: Record<DRAMStructure, string[]> = {
    Channel: [],
    Rank: [],
    Bank: [],
    BankGroup: [],
    Subarray: [],
    Row: [],
    Column: [],
  };
  let base = 0;
  for (const structure of LINEAR_ORDER) {
    const bits = getBit(structures[structure]);
    for (let i = 0; i < bits; i++) {
      const addressBit = base + i;
      mapping[structure].push({ targetBit: i, selectedBits: [addressBit] });
      masks[structure].push(`0x${(1n << BigInt(addressBit)).toString(16)}`);
    }
    base += bits;
  }
  return { mapping, masks };
}

const linearDefaults = buildLinearMapping(DEFAULT_DRAM_STRUCTURES);

/** Linear mapping: one address bit per target bit, Column at the LSBs. */
export const DEFAULT_ADDRESS_MAPPING: AddressMapping = linearDefaults.mapping;

/** The same linear mapping as per-target-bit mask input strings. */
export const DEFAULT_ADDRESS_MAPPING_MASKS: Record<DRAMStructure, string[]> =
  linearDefaults.masks;
