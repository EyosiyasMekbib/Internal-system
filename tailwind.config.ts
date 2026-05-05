import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/components/**/*.vue',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/app.vue',
  ],
  theme: {
    extend: {
      colors: {
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface)',
        surface2: 'var(--color-surface-2)',
        border:   'var(--color-border)',
        text:     'var(--color-text)',
        muted:    'var(--color-text-muted)',
        red:      'var(--color-red)',
        'red-light': 'var(--color-red-light)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        ui:      ['var(--font-ui)'],
        mono:    ['var(--font-mono)'],
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '2px',
        lg: '2px',
      },
    },
  },
} satisfies Config