import { Box, Typography } from "@mui/material";
import { DRAMStructures } from "../../../shared/types/dram";
import { getBit } from "../../../shared/utils/parsing";

interface Props {
  totalCapacity: number;
  dramStructures: DRAMStructures;
}

export const CheckPanel = ({ totalCapacity, dramStructures }: Props) => {
  const totalNbitSum = Object.values(dramStructures).reduce(
    (sum, value) => sum + getBit(value),
    0
  );
  const bitsFromCapacity = getBit(totalCapacity);
  let statusText: string;
  let statusColor: string = "text.secondary";
  let messageDetail: string = `Capacity requires: ${bitsFromCapacity} bits`;
  if (totalNbitSum === bitsFromCapacity) {
    statusText = "Status: Consistent";
    statusColor = "success.main";
  } else {
    statusText = "Status: Inconsistent";
    statusColor = "error.main";
  }
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Bit Count Consistency
      </Typography>
      <Typography variant="body2">{messageDetail}</Typography>
      <Typography
        variant="body2"
        sx={{
          color: statusColor,
          fontWeight: "bold",
          mt: 0.5,
        }}
      >
        {statusText}
      </Typography>
    </Box>
  );
};
