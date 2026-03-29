/**
 * TAILRD Semantic Token System — Frosted Glass Light Theme
 * Porsche Chrome Blue (3R7) + Carmona Red Metallic palette.
 * No purple/violet — all modules use approved colors.
 */

export const semanticTokens = {
  colors: {
 // Chart and Data Visualization — approved palette
 'chart.primary': '#2C4A60', // Chrome Blue Dark
 'chart.secondary': '#4A6880', // Chrome Blue Mid
 'chart.tertiary': '#1A4A2E', // Deep Forest Green
 'chart.quaternary': '#8B6914', // Aged Gold
 'chart.success': '#4A6880', // green.600
 'chart.warning': '#6B7280', // amber.600
 'chart.danger': '#7A1A2E', // Carmona Red
 'chart.info': '#2E3440', // Gunmetal

 // Risk Stratification
 'risk.low': '#4A6880',
 'risk.moderate': '#C8D4DC',
 'risk.high': '#9B2438', // Carmona Red Mid
 'risk.critical': '#7A1A2E', // Carmona Red

 // Status Indicators
 'status.success': '#4A6880',
 'status.warning': '#6B7280',
 'status.danger': '#7A1A2E', // Carmona Red
 'status.info': '#2C4A60', // Chrome Blue Dark
 'status.neutral': '#636D80', // titanium.500

 // Surface Colors — light frosted glass
 'surface.primary': '#ffffff',
 'surface.secondary': '#F8F9FB', // titanium.50
 'surface.tertiary': '#EEF1F5', // titanium.100
 'surface.elevated': '#ffffff',
 'surface.overlay': 'rgba(44, 74, 96, 0.50)',

 // Text Colors — dark on light
 'text.primary': '#111827', // titanium.900
 'text.secondary': '#4A5568', // titanium.600
 'text.muted': '#636D80', // titanium.500
 'text.disabled': '#8D96A8', // titanium.400
 'text.inverse': '#F8F9FB', // titanium.50

 // Border Colors — chrome-tinted glass
 'border.default': 'rgba(200, 212, 220, 0.40)',
 'border.muted': 'rgba(200, 212, 220, 0.25)',
 'border.strong': 'rgba(200, 212, 220, 0.60)',
 'border.interactive': '#2C4A60',

 // Module Colors — approved palette, NO purple
 'module.heartFailure': '#2C4A60', // Chrome Blue Dark
 'module.ep': '#4A6880', // Chrome Blue Mid
 'module.structural': '#7A1A2E', // Carmona Red
 'module.coronary': '#1A4A2E', // Deep Forest Green
 'module.valvular': '#8B6914', // Aged Gold
 'module.vascular': '#2E3440', // Gunmetal
 'module.revenue': '#4A6880', // green.600
 'module.admin': '#636D80', // titanium.500
  },

  shadows: {
 'card': '0 1px 3px rgba(44, 74, 96, 0.08), 0 1px 2px rgba(44, 74, 96, 0.04)',
 'card.hover': '0 4px 12px rgba(44, 74, 96, 0.12), 0 2px 4px rgba(44, 74, 96, 0.06)',
 'modal': '0 20px 48px rgba(44, 74, 96, 0.18), 0 8px 16px rgba(44, 74, 96, 0.08)',
 'interactive': '0 2px 8px rgba(44, 74, 96, 0.12), 0 1px 2px rgba(44, 74, 96, 0.06)',
 'glass': '0 4px 24px -4px rgba(44, 74, 96, 0.08)',
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
  '--porsche-500': '#5A8AB0',
  '--titanium-900': '#111827',
  '--chrome-600': '#2C4A60',
  '--arterial-600': '#7A1A2E',
};

export const injectSemanticCSS = () => {
  if (typeof document !== 'undefined') {
 const root = document.documentElement;
 Object.entries(semanticCSSProperties).forEach(([property, value]) => {
 root.style.setProperty(property, value);
 });
  }
};
