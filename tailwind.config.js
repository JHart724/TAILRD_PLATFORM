/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.55)',
          border: 'rgba(255, 255, 255, 0.20)',
          'border-active': 'rgba(66, 182, 208, 0.45)'
        }
      },
      backdropBlur: {
        'glass': '12px',
        'glass-strong': '18px'
      },
      boxShadow: {
        'glass': '0 8px 24px rgba(15, 23, 42, 0.12)',
        'glass-hover': '0 12px 32px rgba(15, 23, 42, 0.16)',
        'glass-active': '0 16px 40px rgba(15, 23, 42, 0.20)'
      }
    },
  },
  plugins: [],
};