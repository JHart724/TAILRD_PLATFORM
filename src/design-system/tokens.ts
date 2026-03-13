/**
 * TAILRD Liquid Metal Design System — Design Tokens
 * Single source of truth for programmatic color/style access.
 * All hex values match tailwind.config.js definitions.
 */

// ─── Chrome Blue (Porsche 918 Liquid Metal) ──────────────────

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

// ─── Dragon Blood (Metallic Crimson) ─────────────────────────

export const arterial = {
  50:  '#FDF2F3',
  100: '#FCE4E6',
  200: '#F9CDD1',
  300: '#F3A5AC',
  400: '#E87380',
  500: '#D94452',
  600: '#B01C2E',
  700: '#8B1520',
  800: '#6B1019',
  900: '#4A0B11',
  950: '#2D0609',
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

// ─── Dark Surface System ─────────────────────────────────────

export const surface = {
  base:     '#060A12',
  raised:   '#0C1220',
  elevated: '#121A2A',
  overlay:  '#1A2436',
  bright:   '#222E42',
} as const;

// ─── Semantic Colors (dark-first) ────────────────────────────

export const semantic = {
  // Surfaces
  background: surface.base,
  surfacePrimary: surface.raised,
  surfaceSecondary: surface.elevated,
  surfaceTertiary: surface.overlay,

  // Text (light on dark)
  textPrimary: chrome[100],       // #D4E4F0
  textSecondary: chrome[300],     // #A8C5DD
  textMuted: chrome[400],         // #7BA3C4
  textDisabled: '#4A5568',
  textInverse: '#111827',

  // Borders (glass edges)
  borderDefault: 'rgba(255, 255, 255, 0.06)',
  borderMuted: 'rgba(255, 255, 255, 0.04)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  borderInteractive: 'rgba(61, 111, 148, 0.5)',

  // Interactive
  primaryAction: chrome[600],
  primaryHover: chrome[700],
  dangerAction: arterial[600],
  dangerHover: arterial[700],
  successAction: '#22C55E',
  warningAction: '#F59E0B',
} as const;

// ─── Module Identity Colors (Liquid Metal) ───────────────────

export const moduleColors = {
  heartFailure:         { mid: '#3D6F94', glow: '#A8C5DD', peak: '#C8DAE8', name: 'Chrome Blue' },
  electrophysiology:    { mid: '#B45309', glow: '#FBBF24', peak: '#FDE68A', name: 'Liquid Amber' },
  structuralHeart:      { mid: '#7C3AED', glow: '#C084FC', peak: '#E9D5FF', name: 'Chrome Violet' },
  coronaryIntervention: { mid: '#8B1520', glow: '#D42A3E', peak: '#F06070', name: 'Dragon Blood' },
  valvularDisease:      { mid: '#0D9488', glow: '#2DD4BF', peak: '#99F6E4', name: 'Liquid Teal' },
  peripheralVascular:   { mid: '#15803D', glow: '#4ADE80', peak: '#BBF7D0', name: 'Chrome Emerald' },
} as const;

// Module key → glass CSS class mapping
export const moduleGlassClass: Record<string, string> = {
  hf:         'glass-chrome-blue',
  ep:         'glass-liquid-amber',
  structural: 'glass-chrome-violet',
  coronary:   'glass-dragon-blood',
  valvular:   'glass-liquid-teal',
  peripheral: 'glass-chrome-emerald',
};

// Module key → glow shadow mapping
export const moduleGlowShadow: Record<string, string> = {
  hf:         'shadow-glow-chrome',
  ep:         'shadow-glow-amber',
  structural: 'shadow-glow-violet',
  coronary:   'shadow-glow-blood',
  valvular:   'shadow-glow-teal',
  peripheral: 'shadow-glow-emerald',
};

// ─── Status Colors ───────────────────────────────────────────

export const statusColors = {
  critical: { color: '#D42A3E', glow: 'rgba(212, 42, 62, 0.5)' },
  warning:  { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.5)' },
  healthy:  { color: '#22C55E', glow: 'rgba(34, 197, 94, 0.5)' },
  info:     { color: '#5A8AB0', glow: 'rgba(90, 138, 176, 0.5)' },
} as const;

// ─── Chart Palette (metallic-adjusted) ───────────────────────

export const chartColors = [
  '#5A8AB0', // chrome.500
  '#D42A3E', // dragon blood midtone
  '#FBBF24', // liquid amber glow
  '#C084FC', // chrome violet glow
  '#2DD4BF', // liquid teal glow
  '#4ADE80', // chrome emerald glow
  '#A8C5DD', // chrome.300
  '#F06070', // dragon blood highlight
] as const;

// ─── Shadow Tokens ───────────────────────────────────────────

export const shadows = {
  glass:     '0 4px 24px -4px rgba(0, 0, 0, 0.3)',
  glassHover:'0 8px 32px -4px rgba(0, 0, 0, 0.4)',
  elevated:  '0 12px 40px -4px rgba(0, 0, 0, 0.45)',
  modal:     '0 20px 60px -8px rgba(0, 0, 0, 0.6)',
  bezel:     'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
  bezelHover:'inset 0 1px 0 0 rgba(255, 255, 255, 0.12)',
  // Legacy (backward compat)
  card:      '0 1px 3px rgba(13, 38, 64, 0.08), 0 1px 2px rgba(13, 38, 64, 0.04)',
  cardHover: '0 4px 12px rgba(13, 38, 64, 0.12), 0 2px 4px rgba(13, 38, 64, 0.06)',
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
