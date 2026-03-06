import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F97316',
          light: '#FB923C',
          dark: '#EA580C',
          glow: 'rgba(249, 115, 22, 0.12)',
        },
        surface: {
          0: '#050506',
          1: '#0A0A0C',
          2: '#111114',
          3: '#19191D',
          4: '#222226',
        },
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'h1': ['28px', { lineHeight: '1.2', fontWeight: '800' }],
        'h2': ['22px', { lineHeight: '1.3', fontWeight: '700' }],
        'h3': ['18px', { lineHeight: '1.4', fontWeight: '700' }],
        'h4': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        'card': '16px',
        'btn': '12px',
        'input': '12px',
        'badge': '8px',
      },
      minHeight: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}

export default config
