/**
 * TAILRD Chrome & Crimson Theme System
 *
 * Combines the Tailwind configuration with semantic tokens
 * for consistent component usage. All values are Chrome & Crimson.
 */

import { semanticTokens, injectSemanticCSS } from './semanticTokens';

// Re-export semantic tokens for easy importing
export { semanticTokens, getSemanticColor, useSemanticTokens } from './semanticTokens';

// Chrome & Crimson palette directly from tailwind.config.js
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
 50: '#FDF2F3', 100: '#FCE4E6', 200: '#F9CDD1', 300: '#F3A5AC',
 400: '#E87380', 500: '#D94452', 600: '#B01C2E', 700: '#8B1520',
 800: '#6B1019', 900: '#4A0B11'
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
 },

 purple: {
 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7c3aed',
 800: '#6b21a8', 900: '#581c87'
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
 border: '1px solid #D8DDE6',
 borderRadius: '0.75rem',
 boxShadow: semanticTokens.shadows.card,
 padding: semanticTokens.spacing.lg,
 },

 button: {
 primary: {
 background: '#3D6F94',
 color: '#F8F9FB',
 border: 'none',
 borderRadius: '0.5rem',
 padding: `${semanticTokens.spacing.sm} ${semanticTokens.spacing.md}`,
 transition: semanticTokens.transitions.fast,
 },

 secondary: {
 background: '#ffffff',
 color: '#4A5568',
 border: '1px solid #D8DDE6',
 borderRadius: '0.5rem',
 padding: `${semanticTokens.spacing.sm} ${semanticTokens.spacing.md}`,
 transition: semanticTokens.transitions.fast,
 }
 },

 modal: {
 overlay: {
 background: 'rgba(13, 38, 64, 0.50)',
 },

 content: {
 background: '#ffffff',
 border: '1px solid #EEF1F5',
 borderRadius: '1rem',
 boxShadow: semanticTokens.shadows.modal,
 maxWidth: '90vw',
 maxHeight: '90vh',
 }
 }
  }
};

// Chart color palettes
export const chartPalettes = {
  categorical: [
 '#3D6F94',
 '#0d9488',
 '#7c3aed',
 '#d97706',
 '#B01C2E',
 '#5A8AB0',
  ],

  risk: [
 '#22c55e',
 '#f59e0b',
 '#D94452',
 '#B01C2E',
  ],

  status: [
 '#16a34a',
 '#d97706',
 '#B01C2E',
 '#3D6F94',
 '#636D80',
  ],

  modules: [
 '#3D6F94',
 '#7c3aed',
 '#d97706',
 '#0d9488',
 '#2A5578',
 '#B01C2E',
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
 document.documentElement.setAttribute('data-theme', 'chrome-crimson');
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
