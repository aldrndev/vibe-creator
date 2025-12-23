import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/react';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  darkMode: 'class',
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: '#fafafa',
            foreground: '#18181b',
            primary: {
              50: '#f0f9ff',
              100: '#e0f2fe',
              200: '#bae6fd',
              300: '#7dd3fc',
              400: '#38bdf8',
              500: '#0ea5e9',
              600: '#0284c7',
              700: '#0369a1',
              800: '#075985',
              900: '#0c4a6e',
              DEFAULT: '#0ea5e9',
              foreground: '#ffffff',
            },
            secondary: {
              50: '#fdf4ff',
              100: '#fae8ff',
              200: '#f5d0fe',
              300: '#f0abfc',
              400: '#e879f9',
              500: '#d946ef',
              600: '#c026d3',
              700: '#a21caf',
              800: '#86198f',
              900: '#701a75',
              DEFAULT: '#d946ef',
              foreground: '#ffffff',
            },
          },
        },
        dark: {
          colors: {
            background: '#09090b',
            foreground: '#fafafa',
            primary: {
              50: '#0c4a6e',
              100: '#075985',
              200: '#0369a1',
              300: '#0284c7',
              400: '#0ea5e9',
              500: '#38bdf8',
              600: '#7dd3fc',
              700: '#bae6fd',
              800: '#e0f2fe',
              900: '#f0f9ff',
              DEFAULT: '#38bdf8',
              foreground: '#09090b',
            },
            secondary: {
              50: '#701a75',
              100: '#86198f',
              200: '#a21caf',
              300: '#c026d3',
              400: '#d946ef',
              500: '#e879f9',
              600: '#f0abfc',
              700: '#f5d0fe',
              800: '#fae8ff',
              900: '#fdf4ff',
              DEFAULT: '#e879f9',
              foreground: '#09090b',
            },
          },
        },
      },
    }),
  ],
};

export default config;
