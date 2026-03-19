import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mono: {
          50: '#f8f8f8',
          100: '#f0f0f0',
          200: '#d7d7d7',
          300: '#afafaf',
          500: '#616161',
          700: '#2f2f2f',
          900: '#101010',
          950: '#060606',
        },
      },
      boxShadow: {
        panel: '0 0 0 1px rgb(0 0 0 / 0.08), 0 24px 58px -36px rgb(0 0 0 / 0.25)',
        panelDark: '0 0 0 1px rgb(255 255 255 / 0.08), 0 24px 58px -36px rgb(255 255 255 / 0.12)',
      },
      borderRadius: {
        xl2: '1.125rem',
      },
    },
  },
  plugins: [],
};

export default config;
