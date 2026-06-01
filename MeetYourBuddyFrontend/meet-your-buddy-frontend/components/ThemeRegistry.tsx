'use client';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#22d3ee',
    },
    background: {
      default: '#020617',
      paper: 'rgba(15, 23, 42, 0.72)',
    },
    text: {
      primary: '#f8fafc',
      secondary: 'rgba(226,232,240,0.72)',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: 'Outfit, Arial, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: 'rgba(255,255,255,0.04)',
          color: '#f8fafc',
        },
        notchedOutline: {
          borderColor: 'rgba(255,255,255,0.12)',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'rgba(226,232,240,0.68)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none',
          fontWeight: 700,
        },
      },
    },
  },
});

export default function ThemeRegistry({
  children,
}: {
  children: ReactNode;
}) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}