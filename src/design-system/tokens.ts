/**
 * TAILRD Frosted Glass Design System — Design Tokens
 * Single source of truth for programmatic color/style access.
 * Porsche Chrome Blue (3R7) + Carmona Red Metallic palette.
 */

// ─── Chrome Blue (Porsche Liquid Metal 3R7) ─────────────────

export const chrome = {
  50:  '#F0F5FA',
  100: '#D4E4F0',
  200: '#B8C9D9',
  300: '#A8C5DD',
  400: '#7BA3C4',
  500: '#5A8AB0',
  600: '#3D6F94',
  700: '#2A5578',
  800: '#1A3B5C',
  900: '#0D2640',
  950: '#061525',
} as const;

// ─── Carmona Red Metallic ───────────────────────────────────

export const arterial = {
  50:  '#FDF2F3',
  100: '#F5D0D6',
  200: '#E8A1AD',
  300: '#D4707F',
  400: '#B84455',
  500: '#9B2438',
  600: '#7A1A2E',
  700: '#5C1022',
  800: '#3E0A17',
  900: '#20050C',
  950: '#100306',
} as const;

// ─── Titanium Neutrals ──────────────────────────────────────

export const neutral = {
  50:  '#F8F9FB',
  100: '#EEF1F5',
  200: '#D8DDE6',
  300: '#B8C0CE',
  400: '#8D96A8',
  500: '#636D80',
  600: '#4A5568',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
  950: '#0A0F1A',
} as const;

// ─── Light Surface System ───────────────────────────────────

export const surface = {
  base:     '#F4F6F8',
  raised:   '#FFFFFF',
  elevated: '#FFFFFF',
  overlay:  'rgba(44, 74, 96, 0.50)',
  bright:   '#F0F2F5',
} as const;

// ─── Semantic Colors (light-first) ──────────────────────────

export const semantic = {
  // Surfaces
  background: surface.base,
  surfacePrimary: surface.raised,
  surfaceSecondary: '#F8F9FB',
  surfaceTertiary: '#EEF1F5',

  // Text (dark on light)
  textPrimary: '#111827',        // titanium.900
  textSecondary: '#4A5568',      // titanium.600
  textMuted: '#636D80',          // titanium.500
  textDisabled: '#8D96A8',       // titanium.400
  textInverse: '#F8F9FB',        // titanium.50

  // Borders (chrome-tinted)
  borderDefault: 'rgba(200, 212, 220, 0.40)',
  borderMuted: 'rgba(200, 212, 220, 0.25)',
  borderStrong: 'rgba(200, 212, 220, 0.60)',
  borderInteractive: 'rgba(44, 74, 96, 0.50)',

  // Interactive
  primaryAction: '#2C4A60',
  primaryHover: '#1A3B5C',
  dangerAction: '#9B2438',
  dangerHover: '#7A1A2E',
  successAction: '#22C55E',
  warningAction: '#F59E0B',
} as const;

// ─── Module Identity Colors (Approved Palette) ──────────────
// HF=#2C4A60, EP=#4A6880, SH=#7A1A2E, Coronary=#1A4A2E,
// Valvular=#8B6914, Peripheral=#2E3440

export const moduleColors = {
  heartFailure:         { mid: '#2C4A60', glow: '#8FA8BC', peak: '#C8D4DC', name: 'Chrome Blue Dark' },
  electrophysiology:    { mid: '#4A6880', glow: '#8FA8BC', peak: '#C8D4DC', name: 'Chrome Blue Mid' },
  structuralHeart:      { mid: '#7A1A2E', glow: '#9B2438', peak: '#D4707F', name: 'Carmona Red' },
  coronaryIntervention: { mid: '#1A4A2E', glow: '#2D7A4A', peak: '#5CAA72', name: 'Deep Forest' },
  valvularDisease:      { mid: '#8B6914', glow: '#B8922E', peak: '#D4B85C', name: 'Aged Gold' },
  peripheralVascular:   { mid: '#2E3440', glow: '#4C566A', peak: '#7B8698', name: 'Gunmetal' },
} as const;

// Module key → glass CSS class mapping
export const moduleGlassClass: Record<string, string> = {
  hf:         'glass-chrome-blue',
  ep:         'glass-chrome-blue',
  structural: 'glass-carmona-red',
  coronary:   'glass-forest-green',
  valvular:   'glass-liquid-teal',
  peripheral: 'glass-gunmetal',
};

// Module key → glow shadow mapping
export const moduleGlowShadow: Record<string, string> = {
  hf:         'shadow-glow-chrome',
  ep:         'shadow-glow-chrome',
  structural: 'shadow-glow-blood',
  coronary:   'shadow-glow-forest',
  valvular:   'shadow-glow-gold',
  peripheral: 'shadow-glow-gunmetal',
};

// ─── Status Colors ───────────────────────────────────────────

export const statusColors = {
  critical: { color: '#9B2438', glow: 'rgba(155, 36, 56, 0.35)' },
  warning:  { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.35)' },
  healthy:  { color: '#22C55E', glow: 'rgba(34, 197, 94, 0.35)' },
  info:     { color: '#5A8AB0', glow: 'rgba(90, 138, 176, 0.35)' },
} as const;

// ─── Chart Palette (no purple/violet) ────────────────────────

export const chartColors = [
  '#2C4A60', // Chrome Blue Dark (HF)
  '#4A6880', // Chrome Blue Mid (EP)
  '#7A1A2E', // Carmona Red (SH)
  '#1A4A2E', // Deep Forest (Coronary)
  '#8B6914', // Aged Gold (Valvular)
  '#2E3440', // Gunmetal (Peripheral)
  '#8FA8BC', // Chrome Blue Light
  '#9B2438', // Carmona Red Mid
] as const;

// ─── Shadow Tokens (light theme) ────────────────────────────

export const shadows = {
  glass:     '0 4px 24px -4px rgba(44, 74, 96, 0.08)',
  glassHover:'0 8px 32px -4px rgba(44, 74, 96, 0.12)',
  elevated:  '0 12px 40px -4px rgba(44, 74, 96, 0.16)',
  modal:     '0 20px 60px -8px rgba(44, 74, 96, 0.20)',
  bezel:     'inset 0 1px 0 0 rgba(255, 255, 255, 0.60)',
  bezelHover:'inset 0 1px 0 0 rgba(255, 255, 255, 0.80)',
  // Legacy (backward compat)
  card:      '0 1px 3px rgba(44, 74, 96, 0.08), 0 1px 2px rgba(44, 74, 96, 0.04)',
  cardHover: '0 4px 12px rgba(44, 74, 96, 0.12), 0 2px 4px rgba(44, 74, 96, 0.06)',
} as const;

// ─── Typography Scale ────────────────────────────────────────

export const typography = {
  display: {
    fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
    fontWeight: 700,
  },
  body: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
    fontWeight: 400,
  },
  data: {
    fontFamily: "'IBM Plex Mono', 'SF Mono', Monaco, monospace",
    fontWeight: 400,
  },
} as const;

// ─── Spacing Scale ───────────────────────────────────────────

export const spacing = {
  xs:   '0.25rem',  // 4px
  sm:   '0.5rem',   // 8px
  md:   '1rem',     // 16px
  lg:   '1.5rem',   // 24px
  xl:   '2rem',     // 32px
  '2xl':'3rem',     // 48px
  '3xl':'4rem',     // 64px
} as const;

// ─── Border Radii ────────────────────────────────────────────

export const radii = {
  sm:   '0.375rem', // 6px
  md:   '0.5rem',   // 8px
  lg:   '0.75rem',  // 12px
  xl:   '1rem',     // 16px
  '2xl':'1.5rem',   // 24px
  full: '9999px',
} as const;

// ─── Transitions ─────────────────────────────────────────────

export const transitions = {
  fast:   '150ms ease-out',
  normal: '200ms ease-out',
  slow:   '300ms ease-out',
  chrome: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
} as const;

// ─── Export all ──────────────────────────────────────────────

const designTokens = {
  chrome,
  arterial,
  neutral,
  surface,
  semantic,
  chartColors,
  moduleColors,
  moduleGlassClass,
  moduleGlowShadow,
  statusColors,
  shadows,
  typography,
  spacing,
  radii,
  transitions,
} as const;

export default designTokens;
