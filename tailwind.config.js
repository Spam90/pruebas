/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./assets/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      colors: {
        gold: { 400: '#C9A050', 500: '#B8923F', 600: '#A67C2E' },
        brandDark: { 800: '#0A0A0E', 900: '#060608' },
      }
    }
  },
  plugins: []
}