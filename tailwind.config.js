/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        piquete: {
          DEFAULT: '#031F4B',
          blue: '#031F4B',
          'blue-light': '#0A3B82',
          'blue-bright': '#1D5BD8',
          'blue-dark': '#021431',
          'blue-deep': '#010B1C',
          yellow: '#FFC700',
          'yellow-light': '#FFE373',
          'yellow-hover': '#E6B300',
          'yellow-glow': '#FFD700',
          gray: '#8A8D91',
          'gray-light': '#F3F4F6',
          'gray-dark': '#4B5563',
          accent: '#10B981',
          'accent-cyan': '#06B6D4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(3, 31, 75, 0.05), 0 2px 6px -1px rgba(3, 31, 75, 0.03)',
        'card-hover': '0 12px 32px -4px rgba(3, 31, 75, 0.12), 0 4px 12px -2px rgba(3, 31, 75, 0.06)',
        'glass': '0 8px 32px 0 rgba(3, 31, 75, 0.08)',
        'glow-yellow': '0 0 25px -4px rgba(255, 199, 0, 0.45)',
        'glow-blue': '0 0 25px -4px rgba(3, 31, 75, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}

