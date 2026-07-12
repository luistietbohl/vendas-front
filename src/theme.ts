import { createTheme } from '@mui/material/styles';

export const brandFont = "'Pacifico', cursive";

export const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 768,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    primary: {
      main: '#0E4F82',
      dark: '#0A3A61',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F0A8CE',
      light: '#F6C2E0',
      contrastText: '#0A3A61',
    },
    background: {
      default: '#FFFBF6',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0A3A61',
    },
  },
  typography: {
    fontFamily: "'Nunito', sans-serif",
    h5: {
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 700,
          paddingLeft: 20,
          paddingRight: 20,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#0E4F82',
          color: '#FFFFFF',
          fontWeight: 700,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#F6C2E0',
          },
        },
      },
    },
  },
});
