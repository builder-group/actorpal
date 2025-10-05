import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{js,jsx,ts,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				serif: ['Erode', 'serif'],
				handwriting: ['Caveat', 'cursive']
			}
		}
	},
	plugins: []
} satisfies Config;
