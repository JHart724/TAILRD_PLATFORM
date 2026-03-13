// TAILRD Chrome & Crimson Design System
// Chrome Blue + Arterial Red Color Language

export const porsche = {
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

export const premiumColors = {
  liquidMetal: porsche,
  titanium: {
 50: '#F8F9FB', 100: '#EEF1F5', 200: '#D8DDE6', 300: '#B8C0CE',
 400: '#8D96A8', 500: '#636D80', 600: '#4A5568', 700: '#374151',
 800: '#1F2937', 900: '#111827', 950: '#0A0F1A',
  },
  green: {
 950: '#052e16', 900: '#0a3d1f', 800: '#116932', 700: '#15803d',
 600: '#16a34a', 500: '#22c55e', 400: '#4ade80', 300: '#86efac',
 200: '#bbf7d0', 100: '#dcfce7', 50: '#f0fdf4',
  },
  amber: {
 950: '#451a03', 900: '#78350f', 800: '#92400e', 700: '#b45309',
 600: '#d97706', 500: '#f59e0b', 400: '#fbbf24', 300: '#fcd34d',
 200: '#fde68a', 100: '#fef3c7', 50: '#fffbeb',
  },
  crimson: {
 950: '#2D0609', 900: '#4A0B11', 800: '#6B1019', 700: '#8B1520',
 600: '#B01C2E', 500: '#D94452', 400: '#E87380', 300: '#F3A5AC',
 200: '#F9CDD1', 100: '#FCE4E6', 50: '#FDF2F3',
  },
  violet: {
 950: '#2e1065', 900: '#3b0764', 800: '#581c87', 700: '#6d28d9',
 600: '#7c3aed', 500: '#8b5cf6', 400: '#a78bfa', 300: '#c4b5fd',
 200: '#ddd6fe', 100: '#ede9fe', 50: '#f5f3ff',
  },
  teal: {
 950: '#042f2e', 900: '#134e4a', 800: '#115e59', 700: '#0f766e',
 600: '#0d9488', 500: '#14b8a6', 400: '#2dd4bf', 300: '#5eead4',
 200: '#99f6e4', 100: '#ccfbf1', 50: '#f0fdfa',
  },
  neutral: {
 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4',
 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040',
 800: '#262626', 900: '#171717', 950: '#0a0a0a',
  },
  gradients: {
 porsche: 'linear-gradient(135deg, #0D2640 0%, #3D6F94 40%, #5A8AB0 70%, #A8C5DD 100%)',
 porscheDark: 'linear-gradient(135deg, #061525 0%, #1A3B5C 35%, #3D6F94 70%, #7BA3C4 100%)',
 porscheSubtle: 'linear-gradient(135deg, #F0F5FA 0%, #D4E4F0 50%, #A8C5DD 100%)',
 emerald: 'linear-gradient(135deg, #052e16 0%, #16a34a 50%, #4ade80 100%)',
 amber: 'linear-gradient(135deg, #451a03 0%, #d97706 50%, #fbbf24 100%)',
 crimson: 'linear-gradient(135deg, #2D0609 0%, #B01C2E 50%, #E87380 100%)',
 violet: 'linear-gradient(135deg, #2e1065 0%, #7c3aed 50%, #a78bfa 100%)',
 teal: 'linear-gradient(135deg, #042f2e 0%, #0d9488 50%, #2dd4bf 100%)',
 titanium: 'linear-gradient(135deg, #111827 0%, #636D80 50%, #B8C0CE 100%)',
 metalSurface:  'linear-gradient(145deg, #F0F5FA 0%, rgba(216,221,230,0.4) 50%, rgba(238,241,245,0.8) 100%)',
 darkMetal: 'linear-gradient(145deg, #111827 0%, #1F2937 50%, #374151 100%)',
 frost: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,249,251,0.85) 100%)',
  },
  glows: {
 porsche:  '0 0 16px rgba(61,111,148,0.4), 0 0 32px rgba(61,111,148,0.2)',
 emerald:  '0 0 16px rgba(22,163,74,0.3), 0 0 32px rgba(22,163,74,0.1)',
 amber: '0 0 16px rgba(217,119,6,0.3), 0 0 32px rgba(217,119,6,0.1)',
 crimson:  '0 0 16px rgba(176,28,46,0.3), 0 0 32px rgba(176,28,46,0.1)',
 violet: '0 0 16px rgba(124,58,237,0.3), 0 0 32px rgba(124,58,237,0.1)',
 teal: '0 0 16px rgba(13,148,136,0.3), 0 0 32px rgba(13,148,136,0.1)',
 titanium: '0 0 16px rgba(99,109,128,0.2), 0 0 32px rgba(99,109,128,0.08)',
  },
};

export const clinicalColors = {
  success: premiumColors.green[600],
  warning: premiumColors.amber[600],
  critical: premiumColors.crimson[600],
  info: porsche[600],
  opportunity: premiumColors.amber[500],
  secondary: premiumColors.teal[600],
} as const;

export const chartColors = [
  porsche[600], premiumColors.crimson[600], premiumColors.teal[600],
  premiumColors.amber[600], porsche[500], premiumColors.violet[600],
  premiumColors.titanium[500], porsche[300], premiumColors.teal[400],
  premiumColors.green[600],
] as const;

export const moduleThemes = {
  heartFailure: {
 primary: porsche[600], accent: premiumColors.crimson[600],
 gradient: premiumColors.gradients.porsche, glow: premiumColors.glows.porsche,
 surface: porsche[50], border: porsche[200],
  },
  electrophysiology: {
 primary: premiumColors.amber[600], accent: premiumColors.amber[800],
 gradient: premiumColors.gradients.amber, glow: premiumColors.glows.amber,
 surface: premiumColors.amber[50], border: premiumColors.amber[200],
  },
  structuralHeart: {
 primary: premiumColors.violet[600], accent: premiumColors.violet[800],
 gradient: premiumColors.gradients.violet, glow: premiumColors.glows.violet,
 surface: premiumColors.violet[50], border: premiumColors.violet[200],
  },
  coronaryIntervention: {
 primary: premiumColors.crimson[600], accent: premiumColors.crimson[800],
 gradient: premiumColors.gradients.crimson, glow: premiumColors.glows.crimson,
 surface: premiumColors.crimson[50], border: premiumColors.crimson[200],
  },
  valvularDisease: {
 primary: porsche[700], accent: premiumColors.violet[500],
 gradient: premiumColors.gradients.porscheDark, glow: premiumColors.glows.porsche,
 surface: porsche[50], border: porsche[200],
  },
  peripheralVascular: {
 primary: premiumColors.teal[600], accent: premiumColors.green[600],
 gradient: premiumColors.gradients.teal, glow: premiumColors.glows.teal,
 surface: premiumColors.teal[50], border: premiumColors.teal[200],
  },
} as const;

export const withAlpha = (color: string, alpha: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const premiumClasses = {
  metalCard: 'bg-white border border-titanium-200 shadow-chrome-card rounded-xl',
  metalHover: 'transition-all duration-200 ease-chrome hover:shadow-chrome-card-hover hover:-translate-y-0.5',
  textPorsche: 'bg-gradient-to-r from-porsche-800 via-porsche-600 to-porsche-400 bg-clip-text text-transparent',
  btnPrimary: 'bg-porsche-600 hover:bg-porsche-700 text-white font-medium px-6 py-3 rounded-lg shadow-chrome-card hover:shadow-chrome-card-hover transition-all duration-200',
  btnSecondary: 'bg-white hover:bg-titanium-50 text-titanium-700 font-medium px-6 py-3 rounded-lg border border-titanium-200 shadow-chrome-card transition-all duration-200',
  btnGhost: 'bg-white border border-porsche-200 text-porsche-700 font-medium px-6 py-3 rounded-lg hover:bg-porsche-50 transition-all duration-200',
} as const;

export default premiumColors;
