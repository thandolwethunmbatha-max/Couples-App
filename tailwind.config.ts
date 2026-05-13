import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rosewood: '#6f2333',
        blush: '#fff1f5',
        champagne: '#fff8ea',
        plum: '#3e1f47',
        lavender: '#f5efff'
      },
      boxShadow: {
        glow: '0 24px 80px rgba(244, 63, 94, 0.18)'
      },
      backgroundImage: {
        'romantic-radial': 'radial-gradient(circle at top left, rgba(251, 113, 133, 0.26), transparent 34%), radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.18), transparent 36%)'
      }
    }
  },
  plugins: [forms]
};

export default config;
