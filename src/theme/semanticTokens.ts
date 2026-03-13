/**
 * TAILRD Semantic Token System — Chrome & Crimson Edition
 * Maps clinical meaning to the Chrome & Crimson color palette.
 * These tokens ensure consistency across all 6 cardiovascular modules.
 */

export const semanticTokens = {
  colors: {
 // Chart and Data Visualization — Chrome & Crimson
 'chart.primary': '#3D6F94', // chrome.600
 'chart.secondary': '#636D80', // titanium.500
 'chart.tertiary': '#0d9488', // teal.600
 'chart.quaternary': '#7c3aed', // violet.600
 'chart.success': '#16a34a', // green.600
 'chart.warning': '#d97706', // amber.600
 'chart.danger': '#B01C2E', // arterial.600
 'chart.info': '#2A5578', // chrome.700

 // Risk Stratification
 'risk.low': '#22c55e',
 'risk.moderate': '#f59e0b',
 'risk.high': '#D94452', // arterial.500
 'risk.critical': '#B01C2E', // arterial.600

 // Status Indicators
 'status.success': '#16a34a',
 'status.warning': '#d97706',
 'status.danger': '#B01C2E', // arterial.600
 'status.info': '#3D6F94', // chrome.600
 'status.neutral': '#636D80', // titanium.500

 // Surface Colors — Chrome-forward
 'surface.primary': '#ffffff',
 'surface.secondary': '#F8F9FB', // titanium.50
 'surface.tertiary': '#EEF1F5', // titanium.100
 'surface.elevated': '#ffffff', // SOLID — no more glass
 'surface.overlay': 'rgba(13, 38, 64, 0.50)',  // chrome.900 at 50%

 // Text Colors — warm neutrals
 'text.primary': '#111827', // titanium.900
 'text.secondary': '#4A5568', // titanium.600
 'text.muted': '#636D80', // titanium.500
 'text.disabled': '#8D96A8', // titanium.400
 'text.inverse': '#F8F9FB', // titanium.50

 // Border Colors — chrome scale
 'border.default': '#D8DDE6', // titanium.200
 'border.muted': '#EEF1F5', // titanium.100
 'border.strong': '#B8C0CE', // titanium.300
 'border.interactive': '#3D6F94',  // chrome.600

 // Module Colors — Each module retains its identity
 'module.heartFailure': '#3D6F94', // chrome.600
 'module.ep': '#d97706', // amber.600
 'module.structural': '#7c3aed', // violet.600
 'module.coronary': '#B01C2E', // arterial.600
 'module.valvular': '#2A5578', // chrome.700
 'module.vascular': '#0d9488', // teal.600
 'module.revenue': '#16a34a', // green.600
 'module.admin': '#636D80', // titanium.500
  },

  shadows: {
 'card': '0 1px 3px rgba(13, 38, 64, 0.08), 0 1px 2px rgba(13, 38, 64, 0.04)',
 'card.hover': '0 4px 12px rgba(13, 38, 64, 0.12), 0 2px 4px rgba(13, 38, 64, 0.06)',
 'modal': '0 20px 48px rgba(13, 38, 64, 0.18), 0 8px 16px rgba(13, 38, 64, 0.08)',
 'interactive': '0 2px 8px rgba(61, 111, 148, 0.15), 0 1px 2px rgba(61, 111, 148, 0.08)',
 'glass': '0 1px 3px rgba(13, 38, 64, 0.08)',
  },

  spacing: {
 'xs': '0.25rem',
 'sm': '0.5rem',
 'md': '1rem',
 'lg': '1.5rem',
 'xl': '2rem',
 '2xl': '3rem',
 '3xl': '4rem',
  },

  transitions: {
 'fast': '150ms ease-out',
 'normal': '200ms ease-out',
 'slow': '300ms ease-out',
 'metal': 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  }
};

export type SemanticColorToken = keyof typeof semanticTokens.colors;
export type SemanticShadowToken = keyof typeof semanticTokens.shadows;

export const getSemanticColor = (token: SemanticColorToken): string => {
  return semanticTokens.colors[token];
};

export const useSemanticTokens = () => semanticTokens;

export const semanticCSSProperties = {
  '--chart-primary': semanticTokens.colors['chart.primary'],
  '--chart-secondary': semanticTokens.colors['chart.secondary'],
  '--chart-success': semanticTokens.colors['chart.success'],
  '--chart-warning': semanticTokens.colors['chart.warning'],
  '--chart-danger': semanticTokens.colors['chart.danger'],
  '--risk-low': semanticTokens.colors['risk.low'],
  '--risk-moderate': semanticTokens.colors['risk.moderate'],
  '--risk-high': semanticTokens.colors['risk.high'],
  '--risk-critical': semanticTokens.colors['risk.critical'],
  '--status-success': semanticTokens.colors['status.success'],
  '--status-warning': semanticTokens.colors['status.warning'],
  '--status-danger': semanticTokens.colors['status.danger'],
  '--status-info': semanticTokens.colors['status.info'],
  '--porsche-500': '#5A8AB0', // chrome.500
  '--titanium-900': '#111827',
  '--chrome-600': '#3D6F94',
  '--arterial-600': '#B01C2E',
};

export const injectSemanticCSS = () => {
  if (typeof document !== 'undefined') {
 const root = document.documentElement;
 Object.entries(semanticCSSProperties).forEach(([property, value]) => {
 root.style.setProperty(property, value);
 });
  }
};
