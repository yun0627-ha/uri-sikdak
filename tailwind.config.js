/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sage: { DEFAULT: '#58765B', dark: '#465F49', soft: '#E8EFE6', faint: '#F2F6F0', check: '#9DB79A' },
        canvas: '#F7F8F5', line: '#E5E8E3', ink: '#2E352F', muted: '#7C847B', faintink: '#A9B0A7',
      },
      fontFamily: { sans: ['"Noto Sans KR"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
