/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3559EB',
          dark: '#0120EB',
          light: '#6B8AFF',
        },
        accent: {
          pink: '#FE70BD',
          gray: '#CCCCCC',
          purple: '#9B5DE5',
          'purple-light': '#B07FEE',
          'purple-dark': '#7B2FD4',
        },
        surface: {
          DEFAULT: '#0B1437',
          card: '#111C44',
          hover: '#1A2555',
        },
      },
      fontFamily: {
        sans: ['Lato', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
