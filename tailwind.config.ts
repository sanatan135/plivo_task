import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0B',
        soft: '#121214',
        card: '#0F1012',
        edge: '#1C1D20',
        accent: '#6E56CF'
      },
      borderRadius: { xl: '14px', '2xl': '20px' }
    }
  },
  plugins: []
} satisfies Config;
