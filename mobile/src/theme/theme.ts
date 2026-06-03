// TalkTally Design System
// Aesthetic: Warm, playful, nurturing — like a children's book meets modern app
// Primary palette: Deep teal + warm coral + soft cream

export const Colors = {
  // Primary
  primary:        '#0D9488', // teal-600 — trust, calm, growth
  primaryLight:   '#CCFBF1', // teal-100
  primaryDark:    '#0F766E', // teal-700

  // Accent
  accent:         '#F97316', // warm orange — energy, encouragement
  accentLight:    '#FFF7ED', // orange-50
  accentDark:     '#EA6C00',

  // Success
  success:        '#10B981', // emerald
  successLight:   '#D1FAE5',
  successDark:    '#065F46',

  // Warning
  warning:        '#F59E0B',
  warningLight:   '#FEF3C7',

  // Danger
  danger:         '#EF4444',
  dangerLight:    '#FEE2E2',

  // Neutrals
  ink:            '#1C1917', // warm black
  inkLight:       '#57534E', // warm gray
  inkFaint:       '#A8A29E', // muted
  surface:        '#FFFBF7', // warm white — main background
  surfaceCard:    '#FFFFFF',
  surfaceMuted:   '#F5F0EB', // warm gray bg

  // Borders
  border:         '#E7E0D9',
  borderFocus:    '#0D9488',
};

export const Typography = {
  // Display — big emotional moments
  display: {
    fontSize: 40,
    fontWeight: '900' as const,
    letterSpacing: -1,
    lineHeight: 46,
    color: Colors.ink,
  },
  // Heading — screen titles
  h1: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 34,
    color: Colors.ink,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    color: Colors.ink,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: Colors.ink,
  },
  // Body
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: Colors.inkLight,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: Colors.inkFaint,
  },
  // Labels
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: Colors.inkFaint,
  },
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
};

export const Radius = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
};