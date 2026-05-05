/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 20px 60px rgba(15, 23, 42, 0.18)',
      },
      colors: {
        ink: {
          950: '#07111f',
          900: '#0f172a',
        },
        gold: {
          400: '#f7b731',
          500: '#f59e0b',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
        },
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
