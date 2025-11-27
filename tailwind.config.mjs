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
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: '#facc15', // Lemon Yellow
          50: '#fefce8',
          100: '#fef9c3',
          400: '#facc15',
          500: '#eab308',
        },
        secondary: {
          DEFAULT: '#a855f7', // Purple
          50: '#faf5ff',
          100: '#f3e8ff',
          400: '#c084fc',
          500: '#a855f7',
        },
        accent: {
          DEFAULT: '#ec4899', // Pink
          500: '#ec4899',
        },
        surface: {
          DEFAULT: '#ffffff',
          50: '#ffffff',
          100: '#f3f4f6', // Light gray for contrast
          200: '#e5e7eb',
        },
        dark: '#18181b', // Zinc 900 for borders/text
      },
      boxShadow: {
        'neo': '4px 4px 0 0 #18181b',
        'neo-sm': '2px 2px 0 0 #18181b',
        'neo-lg': '6px 6px 0 0 #18181b',
        'neo-xl': '8px 8px 0 0 #18181b',
      },
      borderWidth: {
        '3': '3px',
      },
      animation: {
        'bounce-slight': 'bounceSlight 0.3s infinite alternate',
      },
      keyframes: {
        bounceSlight: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-2px)' },
        },
      },
    },
  },
  plugins: [],
};
