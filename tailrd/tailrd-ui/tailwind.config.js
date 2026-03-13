/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // TAILRD Premium Web3 Color Palette
      colors: {
        // Premium Green Scale
        green: {
          900: '#14532d', // Deep forest green
          800: '#166534', // Forest green
          600: '#16a34a', // Emerald green
          400: '#4ade80', // Light emerald
        },
        
        // Premium Amber Scale  
        amber: {
          900: '#78350f', // Deep amber
          800: '#92400e', // Dark amber
          600: '#d97706', // Golden amber
          400: '#fbbf24', // Light amber
        },
        
        // Premium Gold Scale
        gold: {
          900: '#7c2d12', // Deep bronze-gold
          800: '#9a3412', // Dark gold
          600: '#dc2626', // Rich gold
          400: '#f59e0b', // Bright gold
        },
        
        // Premium Teal Scale
        teal: {
          900: '#134e4a', // Deep teal
          800: '#115e59', // Dark teal  
          600: '#0d9488', // Ocean teal
          400: '#2dd4bf', // Light teal
        },
        
        // Premium Blue Scale
        blue: {
          900: '#1e3a8a', // Deep navy
          800: '#1e40af', // Dark blue
          600: '#2563eb', // Royal blue
          400: '#60a5fa', // Light blue
        },
        
        // Premium Burgundy Scale
        burgundy: {
          900: '#7f1d1d', // Deep wine
          800: '#991b1b', // Dark burgundy
        },
        
        // Premium Neutral Scale (full range)
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
      },
      
      // Premium Background Gradients
      backgroundImage: {
        'gradient-green': 'linear-gradient(135deg, #14532d 0%, #16a34a 50%, #4ade80 100%)',
        'gradient-amber': 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #fbbf24 100%)',
        'gradient-gold': 'linear-gradient(135deg, #7c2d12 0%, #dc2626 50%, #f59e0b 100%)',
        'gradient-teal': 'linear-gradient(135deg, #134e4a 0%, #0d9488 50%, #2dd4bf 100%)',
        'gradient-blue': 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #60a5fa 100%)',
        'gradient-burgundy': 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
      },
      
      // Premium Glow Effects
      boxShadow: {
        'glow-green': '0 0 20px rgba(22, 163, 74, 0.4), 0 0 40px rgba(22, 163, 74, 0.2)',
        'glow-amber': '0 0 20px rgba(217, 119, 6, 0.4), 0 0 40px rgba(217, 119, 6, 0.2)',
        'glow-gold': '0 0 20px rgba(220, 38, 38, 0.4), 0 0 40px rgba(220, 38, 38, 0.2)',
        'glow-teal': '0 0 20px rgba(13, 148, 136, 0.4), 0 0 40px rgba(13, 148, 136, 0.2)',
        'glow-blue': '0 0 20px rgba(37, 99, 235, 0.4), 0 0 40px rgba(37, 99, 235, 0.2)',
        'glow-burgundy': '0 0 20px rgba(153, 27, 27, 0.4), 0 0 40px rgba(153, 27, 27, 0.2)',
      },
      
      // Premium animations
      keyframes: {
        'premium-glow': {
          '0%, 100%': {
            opacity: '0.4',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.8',
            transform: 'scale(1.02)',
          },
        },
        'premium-shimmer': {
          '0%': {
            'background-position': '-200% center',
          },
          '100%': {
            'background-position': '200% center',
          },
        },
      },
      
      animation: {
        'premium-glow': 'premium-glow 3s ease-in-out infinite',
        'premium-shimmer': 'premium-shimmer 2.5s linear infinite',
      }
    },
  },
  plugins: [],
};