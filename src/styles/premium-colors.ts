// TAILRD Chrome & Carmona Design System
// Porsche Chrome Blue (3R7) + Carmona Red Metallic Color Language
// No purple/violet anywhere.

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
 950: '#052e16', 900: '#0a3d1f', 800: '#116932', 700: '#2C4A60',
 600: '#4A6880', 500: '#4A6880', 400: '#4A8A6E', 300: '#A8C8B8',
 200: '#D0E8DC', 100: '#E0EEE8', 50: '#f0fdf4',
  },
  amber: {
 950: '#451a03', 900: '#78350f', 800: '#92400e', 700: '#8B6914',
 600: '#6B7280', 500: '#C8D4DC', 400: '#C8D4DC', 300: '#D4AA3C',
 200: '#EAD68A', 100: '#F0F5FA', 50: '#FAF6E8',
  },
  crimson: {
 950: '#100306', 900: '#20050C', 800: '#3E0A17', 700: '#5C1022',
 600: '#7A1A2E', 500: '#9B2438', 400: '#B84455', 300: '#D4707F',
 200: '#E8A1AD', 100: '#F5D0D6', 50: '#FDF2F3',
  },
  forest: {
 950: '#0E2A1A', 900: '#0f3d24', 800: '#1E3D2E', 700: '#2C4A60',
 600: '#1A4A2E', 500: '#2D7A4A', 400: '#5CAA72', 300: '#A8C8B8',
 200: '#D0E8DC', 100: '#E0EEE8', 50: '#f0fdf4',
  },
  gold: {
 950: '#3A2C08', 900: '#5C4610', 800: '#6B4A1A', 700: '#8B6914',
 600: '#8B6914', 500: '#B8922E', 400: '#D4B85C', 300: '#E8D48A',
 200: '#F0E4B0', 100: '#F8F0D0', 50: '#FDFAF0',
  },
  gunmetal: {
 950: '#0D1017', 900: '#1D2128', 800: '#2E3440', 700: '#3B4252',
 600: '#4C566A', 500: '#5E6882', 400: '#7B8698', 300: '#9AA4B4',
 200: '#BCC2CE', 100: '#DEE0E6', 50: '#F0F1F4',
  },
  teal: {
 950: '#042f2e', 900: '#134e4a', 800: '#115e59', 700: '#2C4A60',
 600: '#3E6275', 500: '#4A6880', 400: '#2dd4bf', 300: '#5eead4',
 200: '#C8D4DC', 100: '#E8EEF2', 50: '#f0fdfa',
  },
  steelTeal: {
    950: '#061820', 900: '#0D3040', 800: '#0F4A5C', 700: '#1A6878',
    600: '#2A8A9E', 500: '#4AAEC0', 400: '#72C4D4', 300: '#A0D8E4',
    200: '#C4EAF0', 100: '#DFF4F8', 50: '#F0FAFB',
  },
  copperBronze: {
    950: '#2A1A08', 900: '#4A2E10', 800: '#6B401A', 700: '#8B5A2B',
    600: '#B8763E', 500: '#D4975A', 400: '#E0B07A', 300: '#ECC89E',
    200: '#F4DEC4', 100: '#F9EEE0', 50: '#FDF7F0',
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
 emerald: 'linear-gradient(135deg, #1E2D3D 0%, #2C4A60 50%, #C8D4DC 100%)',
 amber: 'linear-gradient(135deg, #1E2D3D 0%, #6B7280 50%, #C8D4DC 100%)',
 crimson: 'linear-gradient(135deg, #100306 0%, #7A1A2E 50%, #D4707F 100%)',
 forest: 'linear-gradient(135deg, #0E2A1A 0%, #1A4A2E 50%, #5CAA72 100%)',
 gold: 'linear-gradient(135deg, #3A2C08 0%, #8B6914 50%, #D4B85C 100%)',
 gunmetal: 'linear-gradient(135deg, #1D2128 0%, #2E3440 50%, #7B8698 100%)',
 teal: 'linear-gradient(135deg, #042f2e 0%, #3E6275 50%, #2dd4bf 100%)',
 steelTeal: 'linear-gradient(135deg, #061820 0%, #1A6878 50%, #4AAEC0 100%)',
 copperBronze: 'linear-gradient(135deg, #2A1A08 0%, #8B5A2B 50%, #D4975A 100%)',
 titanium: 'linear-gradient(135deg, #111827 0%, #636D80 50%, #B8C0CE 100%)',
 metalSurface:  'linear-gradient(145deg, #F0F5FA 0%, rgba(216,221,230,0.4) 50%, rgba(238,241,245,0.8) 100%)',
 darkMetal: 'linear-gradient(145deg, #111827 0%, #1F2937 50%, #374151 100%)',
 frost: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,249,251,0.85) 100%)',
  },
  glows: {
 porsche:  '0 0 16px rgba(44,74,96,0.20), 0 0 32px rgba(44,74,96,0.10)',
 emerald:  '0 0 16px rgba(22,163,74,0.20), 0 0 32px rgba(22,163,74,0.08)',
 amber: '0 0 16px rgba(217,119,6,0.20), 0 0 32px rgba(217,119,6,0.08)',
 crimson:  '0 0 16px rgba(122,26,46,0.20), 0 0 32px rgba(122,26,46,0.08)',
 forest: '0 0 16px rgba(26,74,46,0.20), 0 0 32px rgba(26,74,46,0.08)',
 gold: '0 0 16px rgba(139,105,20,0.20), 0 0 32px rgba(139,105,20,0.08)',
 gunmetal: '0 0 16px rgba(46,52,64,0.20), 0 0 32px rgba(46,52,64,0.08)',
 teal: '0 0 16px rgba(13,148,136,0.20), 0 0 32px rgba(13,148,136,0.08)',
 steelTeal: '0 0 16px rgba(26,104,120,0.20), 0 0 32px rgba(26,104,120,0.08)',
 copperBronze: '0 0 16px rgba(139,90,43,0.20), 0 0 32px rgba(139,90,43,0.08)',
 titanium: '0 0 16px rgba(99,109,128,0.15), 0 0 32px rgba(99,109,128,0.06)',
  },
};

export const clinicalColors = {
  success: premiumColors.green[600],
  warning: premiumColors.amber[600],
  critical: premiumColors.crimson[600],
  info: porsche[600],
  opportunity: premiumColors.amber[500],
  secondary: porsche[600],
} as const;

export const chartColors = [
  '#2C4A60',  // Chrome Blue dark
  '#9B2438',  // Carmona Red
  '#C4982A',  // Metallic Gold
  '#2D6147',  // Racing Green
  '#1A6878',  // Steel Teal
  '#8B5A2B',  // Copper Bronze
  '#4A6880',  // Chrome Blue mid
  '#7A1A2E',  // Carmona deep
  '#8B6914',  // Gold deep
  '#3D7A5C',  // Racing Green mid
  '#2A8A9E',  // Steel Teal mid
  '#B8763E',  // Copper Bronze mid
] as const;

export const moduleThemes = {
  heartFailure: {
 primary: '#2C4A60', accent: '#9B2438',
 gradient: premiumColors.gradients.porsche, glow: premiumColors.glows.porsche,
 surface: porsche[50], border: porsche[200],
  },
  electrophysiology: {
 primary: '#4A6880', accent: '#8FA8BC',
 gradient: premiumColors.gradients.porscheSubtle, glow: premiumColors.glows.porsche,
 surface: porsche[50], border: porsche[200],
  },
  structuralHeart: {
 primary: '#7A1A2E', accent: '#9B2438',
 gradient: premiumColors.gradients.crimson, glow: premiumColors.glows.crimson,
 surface: premiumColors.crimson[50], border: premiumColors.crimson[200],
  },
  coronaryIntervention: {
 primary: '#1A4A2E', accent: '#2D7A4A',
 gradient: premiumColors.gradients.forest, glow: premiumColors.glows.forest,
 surface: premiumColors.green[50], border: premiumColors.green[200],
  },
  valvularDisease: {
 primary: '#8B6914', accent: '#B8922E',
 gradient: premiumColors.gradients.gold, glow: premiumColors.glows.gold,
 surface: premiumColors.gold[50], border: premiumColors.gold[200],
  },
  peripheralVascular: {
 primary: '#2E3440', accent: '#4C566A',
 gradient: premiumColors.gradients.gunmetal, glow: premiumColors.glows.gunmetal,
 surface: premiumColors.gunmetal[50], border: premiumColors.gunmetal[200],
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
