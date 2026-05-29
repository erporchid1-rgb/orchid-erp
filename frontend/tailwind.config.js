/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2fb',
          100: '#d8e2f5',
          200: '#b2c8ed',
          300: '#7fa0d8',
          400: '#4d78c0',
          500: '#2d58a8',
          600: '#214392',
          700: '#1a3675',
          800: '#152c62',
          900: '#0f2050',
          950: '#091535',
        },
        brand: {
          DEFAULT: '#1a3675',
          light: '#214392',
          accent: '#c8971f',
        },
        gold: {
          DEFAULT: '#c8971f',
          light: '#e4b84e',
          dark: '#9e7418',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}
