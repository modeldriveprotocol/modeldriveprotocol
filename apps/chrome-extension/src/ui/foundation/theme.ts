import { createTheme, type PaletteMode } from '@mui/material/styles'

export function createExtensionTheme(mode: PaletteMode) {
  const isDark = mode === 'dark'

  return createTheme({
    shape: {
      borderRadius: 4
    },
    palette: {
      mode,
      primary: {
        main: isDark ? '#7aa2ff' : '#2563eb'
      },
      secondary: {
        main: isDark ? '#55c3d6' : '#0891b2'
      },
      background: {
        default: isDark ? '#10151d' : '#f5f7fb',
        paper: isDark ? '#161d27' : '#ffffff'
      },
      success: {
        main: isDark ? '#3ecf8e' : '#0f9d58'
      },
      warning: {
        main: '#f59e0b'
      },
      error: {
        main: isDark ? '#ff7b72' : '#dc2626'
      },
      divider: isDark ? '#263242' : '#d9e0ea',
      text: {
        primary: isDark ? '#edf2ff' : '#102038',
        secondary: isDark ? '#9fb0c8' : '#5d6b82'
      }
    },
    typography: {
      fontFamily: "'Avenir Next', 'Segoe UI', sans-serif",
      h4: {
        fontWeight: 800,
        letterSpacing: '-0.03em'
      },
      h5: {
        fontWeight: 800,
        letterSpacing: '-0.02em'
      },
      h6: {
        fontWeight: 700
      },
      button: {
        textTransform: 'none',
        fontWeight: 700
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: 'none'
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundImage: 'none'
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 4
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 4
          }
        }
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 4
          }
        }
      }
    }
  })
}
