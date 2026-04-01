// Porsche Metallic Semantic Color Tokens
export const semantic = {
  critical: { text: '#9B2438', bg: '#FDF2F3', border: '#F5D0D6', light: '#F5D0D6' },
  warning:  { text: '#8B6914', bg: '#FAF6E8', border: '#F4ECC0', light: '#EAD68A' },
  good:     { text: '#2D6147', bg: '#F0F7F4', border: '#D8EDE6', light: '#B0D9C6' },
  info:     { text: '#2C4A60', bg: '#F0F5FA', border: '#D4E4F0', light: '#B8C9D9' },
  muted:    { text: '#636D80', bg: '#F8F9FB', border: '#D8DDE6', light: '#EEF1F5' },
  device:   { text: '#1A6878', bg: '#F0FAFB', border: '#C4EAF0', light: '#A0D8E4' },  // Steel Teal
  financial: { text: '#8B5A2B', bg: '#FDF7F0', border: '#F4DEC4', light: '#ECC89E' }, // Copper Bronze
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

export type SemanticKey = keyof typeof semantic;
