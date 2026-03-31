/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
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
          elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Lato"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(53,89,235,0.06)',
        'glow': '0 0 40px rgba(53,89,235,0.08)',
        'glow-lg': '0 0 60px rgba(53,89,235,0.12)',
        'card': '0 1px 3px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
}
