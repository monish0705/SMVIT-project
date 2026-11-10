/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          bg: '#F6F8FA',
          surface: '#FFFFFF',
          border: '#DDE4EC',
          navy: '#172B3A',
          navyHover: '#1F384B',
          teal: '#167C80',
          tealDark: '#116265',
          blue: '#3979B7',
          critical: '#DC4C4C',
          warning: '#D99A32',
          normal: '#39866A',
          ink: '#263746',
          muted: '#5A6B7C',
        },
        brand: {
          50: '#eef8f8',
          100: '#d4efef',
          200: '#a9dfe0',
          300: '#72c7ca',
          400: '#3aa8ad',
          500: '#167C80',
          600: '#167C80',
          700: '#116265',
          800: '#0e4e51',
          900: '#0c3f42',
        }
      }
    },
  },
  plugins: [],
}
