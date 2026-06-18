/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./resources/**/*.vue",
    "./vendor/filament/**/*.blade.php",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef8e7',
          100: '#fdefc4',
          200: '#fbe08d',
          300: '#f8d04f',
          400: '#f5c222',
          500: '#f0c040',
          600: '#d4a030',
          700: '#b08020',
          800: '#8c6018',
          900: '#704810',
        },
        dark: {
          50: '#f0f0f5',
          100: '#d0d0dd',
          200: '#a0a0bb',
          300: '#707099',
          400: '#404066',
          500: '#2a2a4a',
          600: '#1a1a2e',
          700: '#12121f',
          800: '#0a0a0f',
          900: '#06060a',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(240, 192, 64, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(240, 192, 64, 0.6)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
