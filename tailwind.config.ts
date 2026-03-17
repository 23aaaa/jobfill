import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  important: true,
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        ts: {
          primary: {
            DEFAULT: 'var(--ts-primary)',
            hover: 'var(--ts-primary-hover)',
            active: 'var(--ts-primary-active)',
            shadow: 'var(--ts-primary-shadow)',
            'shadow-hover': 'var(--ts-primary-shadow-hover)',
            ring: 'var(--ts-primary-ring)',
            highlight: 'var(--ts-primary-highlight)',
          },
          bg: {
            DEFAULT: 'var(--ts-bg)',
            section: 'var(--ts-bg-section)',
            elevated: 'var(--ts-bg-elevated)',
            'elevated-hover': 'var(--ts-bg-elevated-hover)',
            button: 'var(--ts-bg-button)',
          },
          text: {
            DEFAULT: 'var(--ts-text)',
            'on-primary': 'var(--ts-text-on-primary)',
            secondary: 'var(--ts-text-secondary)',
            hint: 'var(--ts-text-hint)',
            muted: 'var(--ts-text-muted)',
          },
          border: {
            DEFAULT: 'var(--ts-border)',
            sidebar: 'var(--ts-border-sidebar)',
            input: 'var(--ts-border-input)',
            button: 'var(--ts-border-button)',
          },
          success: 'var(--ts-success)',
          warning: 'var(--ts-warning)',
          error: 'var(--ts-error)',
          scrollbar: 'var(--ts-scrollbar)',
        },
      },
      boxShadow: {
        'ts-sidebar': '-2px 0 12px var(--ts-sidebar-shadow)',
        'ts-toggle': '0 2px 8px var(--ts-primary-shadow)',
        'ts-toggle-hover': '0 4px 14px var(--ts-primary-shadow-hover)',
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'slide-out-right': 'slide-out-right 0.25s ease-in',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
