/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
        },
        accent: {
          pink: 'rgb(var(--color-accent-pink) / <alpha-value>)',
          gray: 'rgb(var(--color-accent-gray) / <alpha-value>)',
          purple: 'rgb(var(--color-accent-purple) / <alpha-value>)',
          'purple-light': 'rgb(var(--color-accent-purple-light) / <alpha-value>)',
          'purple-dark': 'rgb(var(--color-accent-purple-dark) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          card: 'rgb(var(--color-surface-card) / <alpha-value>)',
          hover: 'rgb(var(--color-surface-hover) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Lato', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
