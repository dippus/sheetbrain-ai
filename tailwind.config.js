/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          950: '#060911',
          900: '#0B1120',
          850: '#111827',
          800: '#1E293B',
          700: '#334155',
          border: '#1E293B',
        },
        brand: {
          emerald: '#10B981',
          emeraldHover: '#059669',
          amber: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
        }
      },
    },
  },
  plugins: [],
};
