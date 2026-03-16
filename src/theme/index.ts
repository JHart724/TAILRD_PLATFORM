/**
 * TAILRD Chrome & Carmona Theme System
 *
 * Porsche Chrome Blue (3R7) + Carmona Red Metallic.
 * No purple/violet anywhere.
 */

import { semanticTokens, injectSemanticCSS } from './semanticTokens';

// Re-export semantic tokens for easy importing
export { semanticTokens, getSemanticColor, useSemanticTokens } from './semanticTokens';

// Chrome & Carmona palette directly from tailwind.config.js
export const medicalPalette = {
  titanium: {
 50: '#F8F9FB',
 100: '#EEF1F5',
 200: '#D8DDE6',
 300: '#B8C0CE',
 400: '#8D96A8',
 500: '#636D80',
 600: '#4A5568',
 700: '#374151',
 800: '#1F2937',
 900: '#111827',
 950: '#0A0F1A'
  },

  medical: {
 red: {
 50: '#FDF2F3', 100: '#F5D0D6', 200: '#E8A1AD', 300: '#D4707F',
 400: '#B84455', 500: '#9B2438', 600: '#7A1A2E', 700: '#5C1022',
 800: '#3E0A17', 900: '#20050C'
 },

 blue: {
 50: '#F0F5FA', 100: '#D4E4F0', 200: '#B8C9D9', 300: '#A8C5DD',
 400: '#7BA3C4', 500: '#5A8AB0', 600: '#3D6F94', 700: '#2A5578',
 800: '#1A3B5C', 900: '#0D2640'
 },

 green: {
 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
 800: '#166534', 900: '#14532d'
 },

 amber: {
 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
 800: '#92400e', 900: '#78350f'
 },

 teal: {
 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
 800: '#115e59', 900: '#134e4a'
 }
  }
};

// Theme configuration object
export const theme = {
  colors: {
 ...medicalPalette,
 semantic: semanticTokens.colors,
  },

  shadows: semanticTokens.shadows,
  spacing: semanticTokens.spacing,
  transitions: semanticTokens.transitions,

  components: {
 card: {
 background: '#ffffff',
 border: '1px solid rgba(200, 212, 220, 0.40)',
 borderRadius: '0.75rem',
 boxShadow: semanticTokens.shadows.card,
 padding: semanticTokens.spacing.lg,
 },

 button: {
 primary: {
 background: '#2C4A60',
 color: '#F8F9FB',
 border: 'none',
 borderRadius: '0.5rem',
 padding: `${semanticTokens.spacing.sm} ${semanticTokens.spacing.md}`,
 transition: semanticTokens.transitions.fast,
 },

 secondary: {
 background: '#ffffff',
 color: '#4A5568',
 border: '1px solid rgba(200, 212, 220, 0.40)',
 borderRadius: '0.5rem',
 padding: `${semanticTokens.spacing.sm} ${semanticTokens.spacing.md}`,
 transition: semanticTokens.transitions.fast,
 }
 },

 modal: {
 overlay: {
 background: 'rgba(44, 74, 96, 0.50)',
 },

 content: {
 background: '#ffffff',
 border: '1px solid rgba(200, 212, 220, 0.40)',
 borderRadius: '1rem',
 boxShadow: semanticTokens.shadows.modal,
 maxWidth: '90vw',
 maxHeight: '90vh',
 }
 }
  }
};

// Chart color palettes — NO purple/violet
export const chartPalettes = {
  categorical: [
 '#2C4A60',
 '#1A4A2E',
 '#8B6914',
 '#7A1A2E',
 '#2E3440',
 '#4A6880',
  ],

  risk: [
 '#22c55e',
 '#f59e0b',
 '#9B2438',
 '#7A1A2E',
  ],

  status: [
 '#16a34a',
 '#d97706',
 '#7A1A2E',
 '#2C4A60',
 '#636D80',
  ],

  modules: [
 '#2C4A60',
 '#4A6880',
 '#7A1A2E',
 '#1A4A2E',
 '#8B6914',
 '#2E3440',
 '#16a34a',
  ]
};

export const getChartColor = (index: number, palette: keyof typeof chartPalettes = 'categorical'): string => {
  const colors = chartPalettes[palette];
  return colors[index % colors.length];
};

export const getRiskColor = (level: 'low' | 'moderate' | 'high' | 'critical'): string => {
  return semanticTokens.colors[`risk.${level}`];
};

export const getModuleColor = (module: string): string => {
  const moduleKey = `module.${module}` as keyof typeof semanticTokens.colors;
  return semanticTokens.colors[moduleKey] || semanticTokens.colors['module.admin'];
};

export const initializeTheme = () => {
  injectSemanticCSS();

  if (typeof document !== 'undefined') {
 document.documentElement.setAttribute('data-theme', 'chrome-carmona');
  }
};

export const useTheme = () => {
  return {
 colors: theme.colors,
 semantic: semanticTokens.colors,
 shadows: semanticTokens.shadows,
 spacing: semanticTokens.spacing,
 transitions: semanticTokens.transitions,
 getChartColor,
 getRiskColor,
 getModuleColor,
  };
};

export default theme;
