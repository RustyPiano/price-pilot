/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-main)",
        foreground: "var(--fg-primary)",
        primary: {
          DEFAULT: 'var(--col-primary)',
          50: 'var(--col-primary)', // Simplification for now
          100: 'var(--col-primary)',
          400: 'var(--col-primary)',
          500: 'var(--col-primary)',
        },
        secondary: {
          DEFAULT: 'var(--col-secondary)',
          50: 'var(--col-secondary)',
          100: 'var(--col-secondary)',
          400: 'var(--col-secondary)',
          500: 'var(--col-secondary)',
        },
        accent: {
          DEFAULT: 'var(--col-accent)',
          500: 'var(--col-accent)',
        },
        surface: {
          DEFAULT: 'var(--bg-surface)',
          50: 'var(--bg-surface)',
          100: 'var(--bg-surface)',
          200: 'var(--bg-surface)',
        },
        dark: '#18181b',
      },
      boxShadow: {
        'theme-base': 'var(--shadow-base)',
        'theme-sm': 'var(--shadow-sm)',
        'theme-lg': 'var(--shadow-lg)',
      },
      borderWidth: {
        'theme': 'var(--border-width)',
      },
      borderColor: {
        'theme': 'var(--border-color)',
        DEFAULT: 'var(--border-color)',
      },
      borderRadius: {
        'theme': 'var(--border-radius)',
      },
      animation: {
        'bounce-slight': 'bounceSlight 0.3s infinite alternate',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        bounceSlight: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-2px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
