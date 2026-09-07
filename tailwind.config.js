/** @type {import('tailwindcss').Config} */
module.exports = {
	mode: 'jit',
	purge: ['./public/index.html', './src/**/*.{vue,js,jsx,ts,tsx}'],
	darkMode: 'class',
	theme: {
		extend: {
		colors: {
			canvas: 'var(--bg)',
			background: 'var(--background)',
			foreground: 'var(--foreground)',
			card: {
				DEFAULT: 'var(--card)',
				foreground: 'var(--card-foreground)',
			},
			popover: {
				DEFAULT: 'var(--popover)',
				foreground: 'var(--popover-foreground)',
			},
			primary: {
				DEFAULT: 'var(--primary)',
				foreground: 'var(--primary-foreground)',
			},
			secondary: {
				DEFAULT: 'var(--secondary)',
				foreground: 'var(--secondary-foreground)',
			},
			muted: {
				DEFAULT: 'var(--muted)',
				foreground: 'var(--muted-foreground)',
			},
			accent: {
				DEFAULT: 'var(--accent)',
				foreground: 'var(--accent-foreground)',
			},
			destructive: 'var(--destructive)',
			border: 'var(--border)',
			input: 'var(--input)',
			ring: 'var(--ring)',
			'chart-1': 'var(--chart-1)',
			'chart-2': 'var(--chart-2)',
			'chart-3': 'var(--chart-3)',
			'chart-4': 'var(--chart-4)',
			'chart-5': 'var(--chart-5)',
			sidebar: {
				DEFAULT: 'var(--sidebar)',
				foreground: 'var(--sidebar-foreground)',
				primary: {
					DEFAULT: 'var(--sidebar-primary)',
					foreground: 'var(--sidebar-primary-foreground)',
				},
				accent: {
					DEFAULT: 'var(--sidebar-accent)',
					foreground: 'var(--sidebar-accent-foreground)',
				},
				border: 'var(--sidebar-border)',
				ring: 'var(--sidebar-ring)',
			},
			'text-secondary': 'var(--text-secondary)',
			'text-tertiary': 'var(--text-tertiary)',
			'text-data': 'var(--text-data)',
			'surface-muted': 'var(--surface-muted)',
			'row-hover': 'var(--row-hover)',
		},
		fontFamily: {
			sans: ['"Geist Variable"', 'sans-serif'],
			heading: ['"Geist Variable"', 'sans-serif'],
			mono: ['"Geist Mono Variable"', 'ui-monospace', 'monospace'],
		},
		spacing: {
			'menu-item': 'calc(var(--radius) * 0.625)',
		},
		borderRadius: {
			sm: 'calc(var(--radius) * 0.6)',
			md: 'calc(var(--radius) * 0.8)',
			lg: 'var(--radius)',
			xl: 'calc(var(--radius) * 1.4)',
			'2xl': 'calc(var(--radius) * 1.8)',
			'3xl': 'calc(var(--radius) * 2.2)',
			'4xl': 'calc(var(--radius) * 2.6)',
		},
		boxShadow: {
			panel: 'var(--panel-shadow)',
			tab: 'var(--tab-shadow)',
		},
	},
	},
	plugins: [],
};
