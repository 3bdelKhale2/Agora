/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        guc: {
          maroon: '#800000', // updated to requested primary
          gold: '#FFD700',
          black: '#111111',
          white: '#ffffff',
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(255, 215, 0, 0.25)',
        soft: '0 10px 30px rgba(0,0,0,0.35)',
      },
      keyframes: {
        gradientX: { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-6px)' } },
        fadeInUp: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        'gradient-x': 'gradientX 12s ease infinite',
        float: 'float 6s ease-in-out infinite',
        'in-up': 'fadeInUp .5s ease forwards',
      },
      backgroundImage: {
        'app-gradient': 'linear-gradient(135deg, #0a0a0a, #1e1e1e)',
        'header-gradient': 'linear-gradient(90deg, rgba(128,0,0,.8), rgba(255,215,0,.35))',
      },
    },
  },
  plugins: [],
}

