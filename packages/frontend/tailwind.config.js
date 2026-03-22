/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5', // Indigo
        success: '#10B981', // Emerald
        warning: '#F59E0B', // Amber
        danger: '#EF4444',  // Red
      }
    },
  },
  plugins: [],
}
