/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      // ─── Typography ────────────────────────────────────────────
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
        'body': ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        'data': ['IBM Plex Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
        // Legacy aliases
        'sf': ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        'sf-mono': ['IBM Plex Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
      },

      // ─── Approved Color System ────────────────────────────────
      // Porsche Liquid Metal Chrome Blue (3R7) + Carmona Red Metallic
      colors: {
        // Chrome Blue (Porsche Liquid Metal) — primary
        chrome: {
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
        },

        // Legacy alias — DO NOT add new references. Use chrome-* instead.
        porsche: {
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
        },

        // Carmona Red Metallic — alerts, arterial, active indicators
        arterial: {
          50:  '#FDF2F3',
          100: '#F5D0D6',
          200: '#E8A1AD',
          300: '#D4707F',
          400: '#B84455',
          500: '#9B2438',
          600: '#7A1A2E',
          700: '#5C1022',
          800: '#3E0A17',
          900: '#20050C',
          950: '#100306',
        },

        // Legacy crimson alias → arterial
        crimson: {
          50:  '#FDF2F3',
          100: '#F5D0D6',
          200: '#E8A1AD',
          300: '#D4707F',
          400: '#B84455',
          500: '#9B2438',
          600: '#7A1A2E',
          700: '#5C1022',
          800: '#3E0A17',
          900: '#20050C',
          950: '#100306',
        },

        // Titanium neutrals — warm chrome tones
        titanium: {
          50:  '#F8F9FB',
          100: '#EEF1F5',
          200: '#D8DDE6',
          300: '#B8C0CE',
          400: '#8D96A8',
          500: '#636D80',
          600: '#4A5568',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#0A0F1A',
        },

        // ─── Light Surface System (frosted glass atmosphere) ────
        surface: {
          base:     '#F4F6F8',   // Light app background
          raised:   '#FFFFFF',   // Card background
          elevated: '#FFFFFF',   // Hover / elevated card
          overlay:  'rgba(44, 74, 96, 0.50)',  // Modal overlay
          bright:   '#F0F2F5',   // Active states
        },

        // ─── Glass Border System (light theme) ─────────────────
        glass: {
          light:          'rgba(200, 212, 220, 0.25)',
          medium:         'rgba(200, 212, 220, 0.40)',
          strong:         'rgba(200, 212, 220, 0.60)',
          border:         'rgba(200, 212, 220, 0.40)',
          'border-hover':  'rgba(200, 212, 220, 0.60)',
          'border-active': 'rgba(44, 74, 96, 0.30)',
        },

        // ─── Module Accent Colors (approved palette) ────────────
        // HF=#2C4A60, EP=#4A6880, SH=#7A1A2E, Coronary=#1A4A2E,
        // Valvular=#8B6914, Peripheral=#2E3440
        'mod-hf':         { mid: '#2C4A60', glow: '#8FA8BC', peak: '#C8D4DC' },
        'mod-ep':         { mid: '#4A6880', glow: '#8FA8BC', peak: '#C8D4DC' },
        'mod-structural': { mid: '#7A1A2E', glow: '#9B2438', peak: '#D4707F' },
        'mod-coronary':   { mid: '#1A4A2E', glow: '#2D7A4A', peak: '#5CAA72' },
        'mod-valvular':   { mid: '#8B6914', glow: '#B8922E', peak: '#D4B85C' },
        'mod-peripheral': { mid: '#2E3440', glow: '#4C566A', peak: '#7B8698' },

        // Medical accent palettes (kept for chart usage)
        medical: {
          red: {
            50: '#FDF2F3', 100: '#F5D0D6', 200: '#E8A1AD', 300: '#D4707F',
            400: '#B84455', 500: '#9B2438', 600: '#7A1A2E', 700: '#5C1022',
            800: '#3E0A17', 900: '#20050C'
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
        },

        // Deep chart variants
        'deep': {
          red:     { 500: '#5C1022', 600: '#3E0A17', 700: '#20050C', 800: '#100306' },
          blue:    { 500: '#1A3B5C', 600: '#0D2640', 700: '#061525', 800: '#030B12' },
          green:   { 500: '#15803d', 600: '#16a34a', 700: '#14532d', 800: '#0f2a1a' },
          amber:   { 500: '#d97706', 600: '#b45309', 700: '#92400e', 800: '#78350f' },
          teal:    { 500: '#0f766e', 600: '#0d9488', 700: '#115e59', 800: '#134e4a' },
          orange:  { 500: '#ea580c', 600: '#dc2626', 700: '#c2410c', 800: '#9a3412' },
          emerald: { 500: '#059669', 600: '#047857', 700: '#065f46', 800: '#064e3b' }
        },

        // Supporting accent colors from approved palette
        forest:   { DEFAULT: '#1A4A2E', light: '#2D7A4A', dark: '#0E2A1A' },
        gold: {
          50:  '#FDFAF0',
          100: '#F8F0D0',
          200: '#F0E4B0',
          300: '#E8D48A',
          400: '#D4B85C',
          500: '#B8922E',
          600: '#8B6914',
          700: '#8B6914',
          800: '#6B4A1A',
          900: '#5C4610',
          950: '#3A2C08',
          DEFAULT: '#8B6914',
          light: '#B8922E',
          dark: '#5C4610',
        },
        gunmetal: { DEFAULT: '#2E3440', light: '#4C566A', dark: '#1D2128' },
        bronze:   { DEFAULT: '#6B4A1A', light: '#8B6A3A', dark: '#4A3210' },
        deepteal: { DEFAULT: '#1A3A40', light: '#2A5A62', dark: '#0E2226' },
      },

      // ─── Gradients ─────────────────────────────────────────────
      backgroundImage: {
        // Chrome Blue metallic
        'liquid-metal':        'linear-gradient(135deg, #0D2640 0%, #3D6F94 40%, #5A8AB0 70%, #A8C5DD 100%)',
        'liquid-metal-dark':   'linear-gradient(135deg, #061525 0%, #1A3B5C 35%, #3D6F94 70%, #7BA3C4 100%)',
        'liquid-metal-subtle': 'linear-gradient(135deg, #F0F5FA 0%, #D4E4F0 50%, #A8C5DD 100%)',
        // Glass panel gradient (light frosted)
        'glass-gradient':      'linear-gradient(135deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.60) 100%)',
        'glass-gradient-hover':'linear-gradient(135deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.72) 100%)',
        // Chrome surface gradients
        'chrome-gradient':        'linear-gradient(135deg, #0D2640 0%, #3D6F94 40%, #5A8AB0 70%, #A8C5DD 100%)',
        'chrome-gradient-subtle': 'linear-gradient(135deg, #F0F5FA 0%, #D4E4F0 50%, #B8C9D9 100%)',
        'chrome-surface':         'linear-gradient(145deg, #F0F5FA 0%, #F8F9FB 50%, #EEF1F5 100%)',
        // Button metallic
        'btn-chrome':      'linear-gradient(135deg, #2C4A60 0%, #4A6880 50%, #2C4A60 100%)',
        'btn-chrome-hover':'linear-gradient(135deg, #1A3B5C 0%, #2C4A60 50%, #1A3B5C 100%)',
        'btn-danger':      'linear-gradient(135deg, #9B2438 0%, #7A1A2E 50%, #9B2438 100%)',
        // Legacy keys (kept for backward compat)
        'liquid-crystal':       'linear-gradient(135deg, #3D6F94 0%, #5A8AB0 100%)',
        'liquid-medical':       'linear-gradient(135deg, #F8F9FB 0%, #EEF1F5 50%, #D8DDE6 100%)',
        'liquid-porsche-blue':  'linear-gradient(to bottom right, #F0F5FA 0%, #F8F9FB 50%, #D4E4F0 100%)',
        'liquid-steel':         'linear-gradient(135deg, #636D80 0%, #4A5568 50%, #374151 100%)',
        'liquid-heart':         'linear-gradient(135deg, #F5D0D6 0%, #E8A1AD 50%, #D4707F 100%)',
        'liquid-clinical':      'linear-gradient(135deg, #D4E4F0 0%, #B8C9D9 50%, #A8C5DD 100%)',
        'retina-surface':       'linear-gradient(145deg, #F0F5FA 0%, #F8F9FB 50%, #EEF1F5 100%)',
        'retina-float':         'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,249,251,0.9) 100%)',
        'gradient-radial':      'radial-gradient(var(--tw-gradient-stops))',
        'metal-surface':        'linear-gradient(145deg, #F0F5FA 0%, rgba(216,221,230,0.4) 50%, rgba(238,241,245,0.8) 100%)',
        'metal-frost':          'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,249,251,0.85) 100%)',
        'web3-primary':         'linear-gradient(135deg, #2C4A60 0%, #4A6880 100%)',
        'web3-medical':         'linear-gradient(135deg, #5A8AB0 0%, #3D6F94 50%, #2A5578 100%)',
        'web3-success':         'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)',
        'web3-warning':         'linear-gradient(135deg, #ffa726 0%, #ff9800 100%)',
        'web3-danger':          'linear-gradient(135deg, #9B2438 0%, #7A1A2E 100%)',
      },

      // ─── Backdrop Blur ─────────────────────────────────────────
      backdropBlur: {
        'glass':        '24px',
        'glass-strong': '32px',
        'glass-subtle': '12px',
      },

      // ─── Shadows (Light Theme — subtle chrome tints) ──────────
      boxShadow: {
        // Glass panel shadows (light bg → subtle depth)
        'glass':         '0 4px 24px -4px rgba(44, 74, 96, 0.08)',
        'glass-hover':   '0 8px 32px -4px rgba(44, 74, 96, 0.12)',
        'glass-elevated':'0 12px 40px -4px rgba(44, 74, 96, 0.16)',
        // Chrome bezel (inset highlight for light cards)
        'bezel':         'inset 0 1px 0 0 rgba(255, 255, 255, 0.60)',
        'bezel-hover':   'inset 0 1px 0 0 rgba(255, 255, 255, 0.80)',
        'bezel-strong':  'inset 0 1px 0 0 rgba(255, 255, 255, 1.0)',
        // Glow accents (per-module aura)
        'glow-chrome':   '0 0 16px rgba(44, 74, 96, 0.20), 0 0 32px rgba(44, 74, 96, 0.08)',
        'glow-blood':    '0 0 16px rgba(122, 26, 46, 0.25), 0 0 32px rgba(122, 26, 46, 0.10)',
        'glow-amber':    '0 0 16px rgba(139, 105, 20, 0.25), 0 0 32px rgba(139, 105, 20, 0.10)',
        'glow-forest':   '0 0 16px rgba(26, 74, 46, 0.25), 0 0 32px rgba(26, 74, 46, 0.10)',
        'glow-gold':     '0 0 16px rgba(139, 105, 20, 0.25), 0 0 32px rgba(139, 105, 20, 0.10)',
        'glow-gunmetal': '0 0 16px rgba(46, 52, 64, 0.25), 0 0 32px rgba(46, 52, 64, 0.10)',
        'glow-teal':     '0 0 16px rgba(26, 58, 64, 0.25), 0 0 32px rgba(26, 58, 64, 0.10)',
        'glow-emerald':  '0 0 16px rgba(34, 197, 94, 0.25), 0 0 32px rgba(34, 197, 94, 0.10)',
        // Status glow (indicator dots)
        'status-critical': '0 0 8px rgba(155, 36, 56, 0.40), 0 0 16px rgba(155, 36, 56, 0.20)',
        'status-warning':  '0 0 8px rgba(245, 158, 11, 0.40), 0 0 16px rgba(245, 158, 11, 0.20)',
        'status-healthy':  '0 0 8px rgba(34, 197, 94, 0.40), 0 0 16px rgba(34, 197, 94, 0.20)',
        'status-info':     '0 0 8px rgba(90, 138, 176, 0.40), 0 0 16px rgba(90, 138, 176, 0.20)',
        // Chrome card system (light theme)
        'chrome-card':       '0 1px 3px rgba(44, 74, 96, 0.08), 0 1px 2px rgba(44, 74, 96, 0.04)',
        'chrome-card-hover': '0 4px 12px rgba(44, 74, 96, 0.12), 0 2px 4px rgba(44, 74, 96, 0.06)',
        'chrome-elevated':   '0 12px 32px rgba(44, 74, 96, 0.14), 0 4px 8px rgba(44, 74, 96, 0.06)',
        // Retina/metal (backward compat)
        'retina-1': '0 1px 2px rgba(44, 74, 96, 0.06), 0 1px 1px rgba(44, 74, 96, 0.04)',
        'retina-2': '0 2px 4px rgba(44, 74, 96, 0.06), 0 1px 2px rgba(44, 74, 96, 0.04)',
        'retina-3': '0 4px 8px rgba(44, 74, 96, 0.08), 0 2px 4px rgba(44, 74, 96, 0.04)',
        'retina-4': '0 8px 16px rgba(44, 74, 96, 0.10), 0 4px 6px rgba(44, 74, 96, 0.04)',
        'retina-5': '0 12px 24px rgba(44, 74, 96, 0.12), 0 6px 8px rgba(44, 74, 96, 0.06)',
        'medical-card':  '0 1px 3px rgba(44, 74, 96, 0.08), 0 1px 2px rgba(44, 74, 96, 0.04)',
        'medical-float': '0 4px 12px rgba(44, 74, 96, 0.10), 0 2px 4px rgba(44, 74, 96, 0.06)',
        'medical-hover': '0 6px 16px rgba(44, 74, 96, 0.12), 0 3px 6px rgba(44, 74, 96, 0.06)',
        'interactive':       '0 2px 8px rgba(44, 74, 96, 0.12), 0 1px 2px rgba(44, 74, 96, 0.06)',
        'interactive-hover': '0 4px 16px rgba(44, 74, 96, 0.15), 0 2px 6px rgba(44, 74, 96, 0.08)',
        'metal-1': '0 1px 2px rgba(44, 74, 96, 0.06), 0 1px 1px rgba(44, 74, 96, 0.04)',
        'metal-2': '0 2px 4px rgba(44, 74, 96, 0.06), 0 1px 2px rgba(44, 74, 96, 0.04)',
        'metal-3': '0 4px 8px rgba(44, 74, 96, 0.08), 0 2px 4px rgba(44, 74, 96, 0.04)',
        'metal-4': '0 8px 16px rgba(44, 74, 96, 0.10), 0 4px 6px rgba(44, 74, 96, 0.04)',
        'metal-5': '0 12px 24px rgba(44, 74, 96, 0.12), 0 6px 8px rgba(44, 74, 96, 0.06)',
        // Legacy glow names
        'glow-sm': '0 0 8px rgba(44, 74, 96, 0.15)',
        'glow-md': '0 0 16px rgba(44, 74, 96, 0.20)',
        'glow-lg': '0 0 24px rgba(44, 74, 96, 0.25)',
        'glow-red': '0 0 16px rgba(122, 26, 46, 0.20)',
        'glow-porsche': '0 0 16px rgba(44, 74, 96, 0.20), 0 0 32px rgba(44, 74, 96, 0.10)',
        'glow-porsche-lg': '0 0 16px rgba(44, 74, 96, 0.20), 0 0 32px rgba(44, 74, 96, 0.10), 0 0 48px rgba(44, 74, 96, 0.05)',
        'glow-crimson': '0 0 16px rgba(122, 26, 46, 0.20), 0 0 32px rgba(122, 26, 46, 0.08)',
        'glass-active': '0 8px 20px rgba(44, 74, 96, 0.12), 0 4px 8px rgba(44, 74, 96, 0.06)',
      },

      // ─── Transitions ──────────────────────────────────────────
      transitionTimingFunction: {
        'chrome': 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        'apple':  'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'medical':'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // ─── Spacing ──────────────────────────────────────────────
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '104': '26rem',
        '112': '28rem',
        '128': '32rem'
      },

      // ─── Keyframes ────────────────────────────────────────────
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer-chrome': {
          '0%': { 'background-position': '-200% 0' },
          '100%': { 'background-position': '200% 0' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '60%': { opacity: '1' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'gradient-x': {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'shimmer': {
          '0%': { 'background-position': '-200% center' },
          '100%': { 'background-position': '200% center' },
        },
      },

      // ─── Animations ───────────────────────────────────────────
      animation: {
        'pulse-glow':      'pulse-glow 2s ease-in-out infinite',
        'fade-up':         'fade-up 0.3s ease-out forwards',
        'shimmer-chrome':  'shimmer-chrome 1.8s ease-in-out infinite',
        'count-up':        'count-up 0.5s ease-out forwards',
        'slide-in-left':   'slide-in-left 0.2s ease-out forwards',
        'gradient-x':      'gradient-x 15s ease infinite',
        'float':           'float 6s ease-in-out infinite',
        'shimmer':         'shimmer 2s linear infinite',
      }
    },
  },
  plugins: [],
};
