import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@de/ui'

export const theme = {
  colors: {
    ...COLORS,
    // Platform overrides
    background: COLORS.c0,
    card: COLORS.c1,
    cardElevated: COLORS.c2,
    tabBar: COLORS.c1,
    tabBarBorder: 'rgba(255,255,255,0.06)',
    fab: COLORS.accent,
  },

  typography: TYPOGRAPHY,
  spacing: SPACING,
  radii: RADII,

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 12,
    },
    accent: {
      shadowColor: COLORS.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
  },

  // Glass card style
  glass: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADII.lg,
  },

  // Bottom nav height (for scroll insets)
  bottomNavHeight: 60,
  fabSize: 56,
} as const

export type Theme = typeof theme
