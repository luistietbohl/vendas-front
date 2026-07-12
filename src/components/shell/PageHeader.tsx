import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { brandFont } from "../../theme";

type Props = {
  title: string;
  action?: ReactNode;
};

export default function PageHeader({ title, action }: Props) {
  return (
    <Box
      sx={{
        bgcolor: "secondary.main",
        color: "primary.dark",
        px: { xs: 2, md: 4 },
        py: 2,
        mb: 3,
        borderRadius: "0 0 24px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1,
      }}
    >
      <Typography
        variant="h5"
        component="h1"
        sx={{ fontFamily: brandFont, fontWeight: 400 }}
      >
        {title}
      </Typography>
      {action && <Box>{action}</Box>}
    </Box>
  );
}
