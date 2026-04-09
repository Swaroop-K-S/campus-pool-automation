/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1', // Indigo primary
          600: '#4f46e5', // Indigo hover
          900: '#312e81',
        },
        accent: {
          500: '#14b8a6', // Teal success/action
          600: '#0d9488',
        },
        panic: {
          500: '#f43f5e', // Rose danger/alert
          600: '#e11d48',
        },
        warn: {
          500: '#f59e0b', // Amber warning/pending
          600: '#d97706',
        },
        slate: {
          50: '#f8fafc', // Background Light
          800: '#1e293b', // Primary Text
          900: '#0f172a', // Background Dark
        }
      }
    },
  },
  plugins: [],
}
