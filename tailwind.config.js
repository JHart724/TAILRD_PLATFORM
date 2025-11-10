/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      // San Francisco Font Stack
      fontFamily: {
        'sf': [
          '-apple-system',
          'BlinkMacSystemFont', 
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        'sf-mono': [
          'SF Mono',
          'Monaco', 
          'Inconsolata',
          'Roboto Mono',
          'monospace'
        ]
      },
      
      // Medical Anodized Steel Color Palette
      colors: {
        // Core medical steel grays
        steel: {
          50: '#f8fafc',   // Surgical white
          100: '#f1f5f9',  // Clean steel
          200: '#e2e8f0',  // Light anodized
          300: '#cbd5e1',  // Medical gray
          400: '#94a3b8',  // Instrument gray
          500: '#64748b',  // Steel blue-gray
          600: '#475569',  // Anodized steel
          700: '#334155',  // Deep steel
          800: '#1e293b',  // Surgical steel
          900: '#0f172a',  // Medical black
          950: '#020617'   // Deep medical
        },
        
        // Medical accent colors
        medical: {
          // Heart/cardiology red
          red: {
            50: '#fef2f2',
            100: '#fee2e2', 
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444',  // Primary heart red
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d'
          },
          
          // Clinical blue
          blue: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe', 
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',  // Primary clinical blue
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a'
          },
          
          // Success/healthy green
          green: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac', 
            400: '#4ade80',
            500: '#22c55e',  // Primary success green
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d'
          },
          
          // Warning/caution amber
          amber: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',  // Primary warning amber
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f'
          },
          
          // Porsche liquid medical blue
          'medical-blue': {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe', 
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',  // Primary Porsche liquid blue
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a'
          },

          // Purple for valvular
          purple: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',  // Primary purple
            600: '#9333ea',
            700: '#7c3aed',
            800: '#6b21a8',
            900: '#581c87'
          },
          
          // Teal for peripheral vascular
          teal: {
            50: '#f0fdfa',
            100: '#ccfbf1',
            200: '#99f6e4',
            300: '#5eead4',
            400: '#2dd4bf',
            500: '#14b8a6',  // Primary teal
            600: '#0d9488',
            700: '#0f766e',
            800: '#115e59',
            900: '#134e4a'
          }
        },
        
        // Darker, matte variants for module interfaces
        'matte': {
          // Darker steel variants
          steel: {
            600: '#3a4553',  // Darker than medical-steel-600
            700: '#2c3440',  // Darker than medical-steel-700  
            800: '#1f242e',  // Darker than medical-steel-800
            900: '#161a22'   // Darker than medical-steel-900
          },
          
          // Matte medical colors
          blue: {
            600: '#1e3a8a',
            700: '#1e40af', 
            800: '#1d4ed8',
            900: '#172554'
          },
          
          green: {
            600: '#065f46',
            700: '#064e3b',
            800: '#022c22',
            900: '#14532d'
          },
          
          red: {
            600: '#991b1b',
            700: '#7f1d1d',
            800: '#6b1e1e',
            900: '#4c1d1d'
          },
          
          amber: {
            600: '#92400e',
            700: '#78350f',
            800: '#5b2c0f',
            900: '#3c1a0b'
          }
        },
        
        // Deep color variants for charts and graphs
        'deep': {
          // Deep medical colors for data visualization
          red: {
            500: '#b91c1c',  // Deeper than medical-red-500
            600: '#991b1b',  
            700: '#7f1d1d',
            800: '#6b1e1e'
          },
          
          blue: {
            500: '#1d4ed8',  // Deeper than medical-blue-500
            600: '#1e40af',
            700: '#1e3a8a',
            800: '#172554'
          },
          
          green: {
            500: '#15803d',  // Deeper than medical-green-500
            600: '#16a34a',
            700: '#14532d',
            800: '#0f2a1a'
          },
          
          amber: {
            500: '#d97706',  // Deeper than medical-amber-500
            600: '#b45309',
            700: '#92400e',
            800: '#78350f'
          },
          
          purple: {
            500: '#7c3aed',  // Deeper than medical-purple-500
            600: '#6b21a8',
            700: '#581c87',
            800: '#4c1d95'
          },
          
          teal: {
            500: '#0f766e',  // Deeper than medical-teal-500
            600: '#0d9488',
            700: '#115e59',
            800: '#134e4a'
          },
          
          orange: {
            500: '#ea580c',  // New deep orange
            600: '#dc2626',
            700: '#c2410c',
            800: '#9a3412'
          },
          
          emerald: {
            500: '#059669',  // New deep emerald
            600: '#047857',
            700: '#065f46',
            800: '#064e3b'
          }
        },
        
        // Enhanced glass system
        glass: {
          light: 'rgba(255, 255, 255, 0.55)',
          medium: 'rgba(255, 255, 255, 0.35)',
          strong: 'rgba(255, 255, 255, 0.25)',
          border: 'rgba(255, 255, 255, 0.20)',
          'border-active': 'rgba(66, 182, 208, 0.45)',
          'border-medical': 'rgba(100, 116, 139, 0.30)'  // steel-500 with opacity
        }
      },
      
      // Liquid Crystal Gradients
      backgroundImage: {
        'liquid-crystal': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'liquid-medical': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        'liquid-porsche-blue': 'linear-gradient(to bottom right, #eff6ff 0%, #f1f5f9 50%, #dbeafe 100%)',
        'liquid-steel': 'linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)',
        'liquid-heart': 'linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%)',
        'liquid-clinical': 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
        'retina-surface': 'linear-gradient(145deg, rgba(248,250,252,0.9) 0%, rgba(241,245,249,0.8) 50%, rgba(226,232,240,0.7) 100%)',
        'retina-float': 'linear-gradient(145deg, rgba(255,255,255,0.6) 0%, rgba(248,250,252,0.4) 100%)',
        
        // Web 3.0 Background Gradients
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'web3-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'web3-medical': 'linear-gradient(135deg, #42a5f5 0%, #478ed1 50%, #4a90e2 100%)',
        'web3-success': 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)',
        'web3-warning': 'linear-gradient(135deg, #ffa726 0%, #ff9800 100%)',
        'web3-danger': 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)'
      },
      
      // Enhanced backdrop blur
      backdropBlur: {
        'glass': '12px',
        'glass-strong': '18px',
        'retina': '24px',
        'medical': '16px'
      },
      
      // Apple Liquid Retina Shadow System
      boxShadow: {
        // Basic glass shadows
        'glass': '0 8px 24px rgba(15, 23, 42, 0.12)',
        'glass-hover': '0 12px 32px rgba(15, 23, 42, 0.16)',
        'glass-active': '0 16px 40px rgba(15, 23, 42, 0.20)',
        
        // Retina elevation system
        'retina-1': '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)',
        'retina-2': '0 4px 6px rgba(15, 23, 42, 0.07), 0 2px 4px rgba(15, 23, 42, 0.05)',
        'retina-3': '0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.06)',
        'retina-4': '0 20px 25px rgba(15, 23, 42, 0.09), 0 10px 10px rgba(15, 23, 42, 0.04)',
        'retina-5': '0 25px 50px rgba(15, 23, 42, 0.12), 0 12px 12px rgba(15, 23, 42, 0.08)',
        
        // Medical specific shadows
        'medical-card': '0 4px 12px rgba(100, 116, 139, 0.15), 0 1px 3px rgba(100, 116, 139, 0.1)',
        'medical-float': '0 8px 20px rgba(100, 116, 139, 0.12), 0 3px 6px rgba(100, 116, 139, 0.08)',
        'medical-hover': '0 12px 28px rgba(100, 116, 139, 0.15), 0 5px 10px rgba(100, 116, 139, 0.1)',
        
        // Interactive shadows
        'interactive': '0 4px 14px rgba(59, 130, 246, 0.15), 0 1px 3px rgba(59, 130, 246, 0.1)',
        'interactive-hover': '0 8px 25px rgba(59, 130, 246, 0.18), 0 3px 10px rgba(59, 130, 246, 0.12)',
        
        // Enhanced Glow Effects
        'glow-sm': '0 0 10px rgba(59, 130, 246, 0.4)',
        'glow-md': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-lg': '0 0 30px rgba(59, 130, 246, 0.6)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.4)'
      },
      
      // Animation timing for smooth interactions
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'medical': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      
      // Spacing adjustments for retina displays
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px  
        '100': '25rem',   // 400px
        '104': '26rem',   // 416px
        '112': '28rem',   // 448px
        '128': '32rem'    // 512px
      },

      // Web 3.0 Gradient Animations
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0px) rotate(0deg)',
          },
          '50%': {
            transform: 'translateY(-10px) rotate(1deg)',
          },
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '0.4',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.8',
            transform: 'scale(1.05)',
          },
        },
        'shimmer': {
          '0%': {
            'background-position': '-200% center',
          },
          '100%': {
            'background-position': '200% center',
          },
        },
      },

      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      }
    },
  },
  plugins: [],
};