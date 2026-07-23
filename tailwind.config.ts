import type { Config } from 'tailwindcss';

/**
 * Paleta derivada dos mockups do "Apoie Aqui":
 * marca rosa/magenta, verde de progresso, tons quentes de fundo.
 */
const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF1F6',
          100: '#FFE4EE',
          200: '#FECDDD',
          300: '#FDA4C0',
          400: '#FB6FA0',
          500: '#F43F82', // rosa principal (CTA)
          600: '#E11D6B',
          700: '#BE125A',
          800: '#9D1450',
          900: '#831547',
        },
        accentPurple: '#8B5CF6', // gradiente do logo
        progress: {
          DEFAULT: '#16A34A', // verde da barra de meta
          light: '#DCFCE7',
        },
        ink: {
          DEFAULT: '#2A211F',
          muted: '#6B5E58',
          soft: '#8C7A74',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          warm: '#FAF6F4',
          line: '#EFE3DF',
        },
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(40,20,15,.05), 0 10px 24px -16px rgba(40,20,15,.22)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
