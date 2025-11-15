// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   darkMode: 'class', 
//   content: [
//     "./index.html",
//     "./src/**/*.{js,ts,jsx,tsx}",
//   ],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// }
const defaultTheme = require('tailwindcss/defaultTheme'); // 1. Add this line

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 2. Add this whole 'fontFamily' section
      fontFamily: {
        // Base fonts
        sans: ['"Inter"', ...defaultTheme.fontFamily.sans], // Matches 'sans'
        serif: ['"Times New Roman"', ...defaultTheme.fontFamily.serif], // Matches 'serif'
        monospace: ['"Fira Code"', ...defaultTheme.fontFamily.mono], // Matches 'monospace'
        
        // Add keys for all other values from SettingsPanel
        'comic-sans-ms': ['"Comic Sans MS"', ...defaultTheme.fontFamily.sans],
        'arial': ['"Arial"', ...defaultTheme.fontFamily.sans],
        'georgia': ['"Georgia"', ...defaultTheme.fontFamily.serif],
        'courier-new': ['"Courier New"', ...defaultTheme.fontFamily.mono],
        'times-new-roman': ['"Times New Roman"', ...defaultTheme.fontFamily.serif],
        'verdana': ['"Verdana"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}