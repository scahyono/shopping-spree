/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        fontFamily: {
            sans: ['Outfit', 'sans-serif'], // Planning to use Outfit
        },
        colors: {
            // "Retail Therapy" Palette
            brand: {
                50: '#fff1f2',
                100: '#ffe4e6',
                200: '#fecdd3',
                300: '#fda4af',
                400: '#fb7185',
                500: '#f43f5e', // Primary Red/Pink
                600: '#e11d48',
                700: '#be123c',
                800: '#9f1239',
                900: '#881337',
            }
        },
        animation: {
            'pop': 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        },
        keyframes: {
            pop: {
                '0%': { transform: 'scale(0.95)' },
                '40%': { transform: 'scale(1.02)' },
                '100%': { transform: 'scale(1)' },
            }
        }
    },
  },
  plugins: [],
}
