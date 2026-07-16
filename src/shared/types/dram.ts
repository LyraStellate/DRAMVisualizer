export type DRAMStructure =
  | "Channel"
  | "Rank"
  | "Bank"
  | "BankGroup"
  | "Subarray"
  | "Row"
  | "Column";

export type DRAMStructures = Record<DRAMStructure, number>;

export interface AddressFunction {
  targetBit: number;
  selectedBits: number[];
}

export type AddressMapping = Record<DRAMStructure, AddressFunction[]>;
