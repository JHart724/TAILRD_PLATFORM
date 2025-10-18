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
        'liquid-steel': 'linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)',
        'liquid-heart': 'linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%)',
        'liquid-clinical': 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
        'retina-surface': 'linear-gradient(145deg, rgba(248,250,252,0.9) 0%, rgba(241,245,249,0.8) 50%, rgba(226,232,240,0.7) 100%)',
        'retina-float': 'linear-gradient(145deg, rgba(255,255,255,0.6) 0%, rgba(248,250,252,0.4) 100%)'
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
        'interactive-hover': '0 8px 25px rgba(59, 130, 246, 0.18), 0 3px 10px rgba(59, 130, 246, 0.12)'
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
      }
    },
  },
  plugins: [],
};