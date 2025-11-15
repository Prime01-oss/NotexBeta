const defaultTheme = require('tailwindcss/defaultTheme'); // 1. Add this line

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 2. Add this whole 'fontFamily' section
      fontFamily: {
        sans: ['"Inter"', ...defaultTheme.fontFamily.sans],
        serif: ['"Georgia"', ...defaultTheme.fontFamily.serif],
        mono: ['"Fira Code"', ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}