export const themeTokens = {
	light: {
		base0: '#FFFFFF',
		base50: '#F2F2F7',
		base100: '#EFEFF4',
		base200: '#E5E5EA',
		base300: '#D1D1D6',
		base400: '#C7C7CC',
		base500: '#8E8E93',
		base600: '#636366',
		base700: '#48484A',
		base800: '#3A3A3C',
		base900: '#1C1C1E',
		base950: '#000000',
		primary: '#4A92FF',
		warning: '#FF9F0A',
		danger: '#FF3B30'
	},
	dark: {
		base0: '#000000',
		base50: '#1C1C1E',
		base100: '#2C2C2E',
		base200: '#3A3A3C',
		base300: '#48484A',
		base400: '#636366',
		base500: '#8E8E93',
		base600: '#AEAEB2',
		base700: '#C7C7CC',
		base800: '#D1D1D6',
		base900: '#E5E5EA',
		base950: '#F2F2F7',
		primary: '#226FF6',
		warning: '#FF9F0A',
		danger: '#FF453A'
	}
} as const;

export type TThemeMode = keyof typeof themeTokens;
export type TThemeTokens = (typeof themeTokens)[TThemeMode];

export function toCssVariables(tokens: TThemeTokens): TCssVariables {
	return {
		'--base-0': tokens.base0,
		'--base-50': tokens.base50,
		'--base-100': tokens.base100,
		'--base-200': tokens.base200,
		'--base-300': tokens.base300,
		'--base-400': tokens.base400,
		'--base-500': tokens.base500,
		'--base-600': tokens.base600,
		'--base-700': tokens.base700,
		'--base-800': tokens.base800,
		'--base-900': tokens.base900,
		'--base-950': tokens.base950,
		'--primary': tokens.primary,
		'--warning': tokens.warning,
		'--danger': tokens.danger
	};
}

export type TCssVariables = Record<`--${string}`, string>;
