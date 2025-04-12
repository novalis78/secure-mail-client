/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'base-dark': '#020617',  // Even darker
        'secondary-dark': '#0F172A',
        'accent-green': '#10b981', // Adjusted green
        'hover-dark': 'rgba(15, 23, 42, 0.6)',
        border: {
          dark: '#1e293b'
        }
      },
      width: {
        'mail-list': '320px'
      },
      padding: {
        'mail-item': '16px'
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 }
        }
      },
      animation: {
        'cursor-blink': 'blink 1s ease-in-out infinite'
      }
    },
  },
  plugins: [],
}