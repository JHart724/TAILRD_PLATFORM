// TAILRD Premium Web3 Color System

// Main color scales with all shades
export const colors = {
  green: {
    900: '#14532d', // Deep forest green
    800: '#166534', // Forest green
    600: '#16a34a', // Emerald green
    400: '#4ade80', // Light emerald
  },
  
  amber: {
    900: '#78350f', // Deep amber
    800: '#92400e', // Dark amber
    600: '#d97706', // Golden amber
    400: '#fbbf24', // Light amber
  },
  
  gold: {
    900: '#7c2d12', // Deep bronze-gold
    800: '#9a3412', // Dark gold
    600: '#dc2626', // Rich gold
    400: '#f59e0b', // Bright gold
  },
  
  teal: {
    900: '#134e4a', // Deep teal
    800: '#115e59', // Dark teal
    600: '#0d9488', // Ocean teal
    400: '#2dd4bf', // Light teal
  },
  
  blue: {
    900: '#1e3a8a', // Deep navy
    800: '#1e40af', // Dark blue
    600: '#2563eb', // Royal blue
    400: '#60a5fa', // Light blue
  },
  
  burgundy: {
    900: '#7f1d1d', // Deep wine
    800: '#991b1b', // Dark burgundy
  },
  
  neutral: {
    50: '#fafafa',   // Pure white
    100: '#f5f5f5',  // Off white
    200: '#e5e5e5',  // Light gray
    300: '#d4d4d4',  // Soft gray
    400: '#a3a3a3',  // Medium gray
    500: '#737373',  // True gray
    600: '#525252',  // Dark gray
    700: '#404040',  // Darker gray
    800: '#262626',  // Very dark gray
    900: '#171717',  // Near black
    950: '#0a0a0a',  // Deep black
  },
  
  // Gradient definitions
  gradients: {
    green: 'linear-gradient(135deg, #14532d 0%, #16a34a 50%, #4ade80 100%)',
    amber: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #fbbf24 100%)',
    gold: 'linear-gradient(135deg, #7c2d12 0%, #dc2626 50%, #f59e0b 100%)',
    teal: 'linear-gradient(135deg, #134e4a 0%, #0d9488 50%, #2dd4bf 100%)',
    blue: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #60a5fa 100%)',
    burgundy: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
  },
  
  // Glow effect definitions
  glows: {
    green: '0 0 20px rgba(22, 163, 74, 0.4), 0 0 40px rgba(22, 163, 74, 0.2)',
    amber: '0 0 20px rgba(217, 119, 6, 0.4), 0 0 40px rgba(217, 119, 6, 0.2)',
    gold: '0 0 20px rgba(220, 38, 38, 0.4), 0 0 40px rgba(220, 38, 38, 0.2)',
    teal: '0 0 20px rgba(13, 148, 136, 0.4), 0 0 40px rgba(13, 148, 136, 0.2)',
    blue: '0 0 20px rgba(37, 99, 235, 0.4), 0 0 40px rgba(37, 99, 235, 0.2)',
    burgundy: '0 0 20px rgba(153, 27, 27, 0.4), 0 0 40px rgba(153, 27, 27, 0.2)',
  }
};

// Clinical color mapping for medical contexts
export const clinicalColors = {
  success: colors.green[600],     // #16a34a - Success/healthy state
  warning: colors.amber[600],     // #d97706 - Warning/caution
  opportunity: colors.gold[600],  // #dc2626 - Opportunity/improvement needed
  info: colors.teal[600],        // #0d9488 - Information/neutral
  critical: colors.burgundy[900], // #7f1d1d - Critical/urgent
  secondary: colors.blue[600],    // #2563eb - Secondary actions
};

// Chart colors for data visualization (in order of preference)
export const chartColors = [
  colors.teal[600],     // #0d9488 - Primary chart color
  colors.blue[600],     // #2563eb - Secondary chart color
  colors.green[600],    // #16a34a - Success/positive data
  colors.amber[600],    // #d97706 - Warning/neutral data
  colors.gold[600],     // #dc2626 - Alert/negative data
  colors.burgundy[800], // #991b1b - Critical data
  colors.neutral[600],  // #525252 - Additional data series
  colors.teal[400],     // #2dd4bf - Light variation
  colors.blue[400],     // #60a5fa - Light variation
  colors.green[400],    // #4ade80 - Light variation
];

// Utility function to get color with alpha
export const withAlpha = (color: string, alpha: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Export default colors object
export default colors;