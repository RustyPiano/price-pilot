/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--canvas)',
        foreground: 'var(--text-primary)',
        muted: 'var(--text-secondary)',
        brand: {
          DEFAULT: 'var(--brand)',
          strong: 'var(--brand-strong)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          100: 'var(--surface-muted)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      boxShadow: {
        'theme-base': 'var(--shadow-base)',
        'theme-sm': 'var(--shadow-sm)',
        'theme-lg': 'var(--shadow-lg)',
      },
      borderWidth: {
        theme: '1px',
      },
      borderColor: {
        theme: 'var(--border)',
        DEFAULT: 'var(--border)',
      },
      borderRadius: {
        theme: 'var(--radius-md)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
