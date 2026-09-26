/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f3fb',
          100: '#e8e6f7',
          200: '#d4d0f0',
          300: '#b4abe4',
          400: '#8f80d5',
          500: '#6d5cc4',
          600: '#523fb0',
          700: '#3c2e88',
          800: '#2e246e',
          900: '#221e5b', // Exact Techcadd logo primary
          950: '#130f3a',
        },
        indigo: {
          50: '#f4f3fb',
          100: '#e8e6f7',
          200: '#d4d0f0',
          300: '#b4abe4',
          400: '#8f80d5',
          500: '#6d5cc4',
          600: '#3c2e88', // Techcadd vibrant royal
          700: '#2e246e', // Techcadd deep hover
          800: '#251c5e',
          900: '#221e5b', // Exact Techcadd logo navy
          950: '#130f3a',
        },
      },
    },
  },
  plugins: [],
}
