import type { Config } from 'tailwindcss';

/**
 * Colours are CSS-variable-backed (see app/theme-tokens.css). A class like
 * `bg-surface` or `text-content-muted` resolves per-theme automatically, so most
 * `dark:` colour variants are unnecessary — the token already flipped.
 */
const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },

    extend: {
      transitionProperty: {
        none: 'none',
      },
      colors: {
        /* Semantic — theme-aware, prefer these.
           `rgb(var(--x-rgb) / <alpha-value>)` so `bg-primary` and
           `ring-primary/30` both work; the channel var flips per theme. */
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          contrast: 'var(--primary-color-text)',
          dark: 'var(--ls-blue-dark)',
          light: 'var(--primary-light)',
          hover: 'var(--ls-blue-hover)',
        },
        brand: {
          navy: 'rgb(var(--ls-navy-rgb) / <alpha-value>)',
          'navy-dark': 'var(--ls-navy-dark)',
          blue: 'rgb(var(--primary-rgb) / <alpha-value>)',
          mist: 'var(--ls-mist)',
          sky: 'rgb(var(--ls-sky-rgb) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'var(--app-bg)',
          card: 'var(--app-surface)',
          alt: 'var(--app-surface-alt)',
          overlay: 'var(--app-overlay)',
          border: 'var(--app-border)',
          hover: 'var(--app-hover)',
        },
        content: {
          DEFAULT: 'var(--app-text)',
          muted: 'var(--app-text-muted)',
        },

        /* Legacy aliases — still resolve, now theme-aware */
        'primary-color': 'var(--primary-color)',
        'primary-dark': 'var(--primary-dark)',
        'primary-light': 'var(--primary-light)',
        'secondary-color': 'var(--secondary-color)',
        'secondary-border-color': '#111827',
        'dark-950': 'var(--dark-950)',
        'dark-900': 'var(--dark-900)',
        'dark-600': 'var(--dark-600)',
      },
      width: {
        'custom-button': '110px',
        'app-bar-search-width': '408px',
      },
      height: {
        'custom-button': '45px',
      },
      fontSize: {
        'heading-1': '20px',
        'heading-2': '36px',
        'card-h1': '16px',
        'card-h2': '',
        'btn-h': '',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
