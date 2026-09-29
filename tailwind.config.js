/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  purge: ['./public/index.html', './src/**/*.{vue,js,jsx,ts,tsx}'],
  prefix: 'tw-',
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--as-bg)',
        background: 'var(--as-background)',
        foreground: 'var(--as-foreground)',
        card: {
          DEFAULT: 'var(--as-card)',
          foreground: 'var(--as-card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--as-popover)',
          foreground: 'var(--as-popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--as-primary)',
          foreground: 'var(--as-primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--as-secondary)',
          foreground: 'var(--as-secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--as-muted)',
          foreground: 'var(--as-muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--as-accent)',
          foreground: 'var(--as-accent-foreground)',
        },
        destructive: 'var(--as-destructive)',
        border: 'var(--as-border)',
        input: 'var(--as-input)',
        ring: 'var(--as-ring)',
        'chart-1': 'var(--as-chart-1)',
        'chart-2': 'var(--as-chart-2)',
        'chart-3': 'var(--as-chart-3)',
        'chart-4': 'var(--as-chart-4)',
        'chart-5': 'var(--as-chart-5)',
        sidebar: {
          DEFAULT: 'var(--as-sidebar)',
          foreground: 'var(--as-sidebar-foreground)',
          primary: {
            DEFAULT: 'var(--as-sidebar-primary)',
            foreground: 'var(--as-sidebar-primary-foreground)',
          },
          accent: {
            DEFAULT: 'var(--as-sidebar-accent)',
            foreground: 'var(--as-sidebar-accent-foreground)',
          },
          border: 'var(--as-sidebar-border)',
          ring: 'var(--as-sidebar-ring)',
        },
        'text-secondary': 'var(--as-text-secondary)',
        'text-tertiary': 'var(--as-text-tertiary)',
        'text-data': 'var(--as-text-data)',
        'surface-muted': 'var(--as-surface-muted)',
        'row-hover': 'var(--as-row-hover)',
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'sans-serif'],
        heading: ['"Geist Variable"', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'monospace'],
      },
      spacing: {
        'menu-item': 'calc(var(--as-radius) * 0.625)',
      },
      borderRadius: {
        sm: 'calc(var(--as-radius) * 0.6)',
        md: 'calc(var(--as-radius) * 0.8)',
        lg: 'var(--as-radius)',
        xl: 'calc(var(--as-radius) * 1.4)',
        '2xl': 'calc(var(--as-radius) * 1.8)',
        '3xl': 'calc(var(--as-radius) * 2.2)',
        '4xl': 'calc(var(--as-radius) * 2.6)',
      },
      boxShadow: {
        panel: 'var(--as-panel-shadow)',
        tab: 'var(--as-tab-shadow)',
      },
    },
  },
  plugins: [],
};
