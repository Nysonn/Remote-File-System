module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'oklch(0.546 0.245 262.881)',
          50: 'oklch(0.546 0.245 262.881 / 0.1)',
          100: 'oklch(0.546 0.245 262.881 / 0.2)',
          200: 'oklch(0.546 0.245 262.881 / 0.3)',
          300: 'oklch(0.546 0.245 262.881 / 0.4)',
          400: 'oklch(0.546 0.245 262.881 / 0.5)',
          500: 'oklch(0.546 0.245 262.881 / 0.6)',
          600: 'oklch(0.546 0.245 262.881 / 0.7)',
          700: 'oklch(0.546 0.245 262.881 / 0.8)',
          800: 'oklch(0.546 0.245 262.881 / 0.9)',
          900: 'oklch(0.546 0.245 262.881)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 