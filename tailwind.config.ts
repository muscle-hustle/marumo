import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f1f5ff',
          100: '#dfe8ff',
          200: '#b9ccff',
          300: '#8aaaa5',
          400: '#5f81f2',
          500: '#3c63e0',
          600: '#2748b3',
          700: '#1b3689',
          800: '#13265f',
          900: '#0c183a',
        },
        'surface-dark': '#0b1120',
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
        display: ['"Figtree"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

