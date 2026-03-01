export const themeTokens = {
	light: {
		base0: '#FFFFFF',
		base50: '#FAFAFA',
		base100: '#F4F4F5',
		base200: '#E4E4E7',
		base300: '#D4D4D8',
		base400: '#A1A1AA',
		base500: '#71717A',
		base600: '#52525B',
		base700: '#3F3F46',
		base800: '#27272A',
		base900: '#18181B',
		base950: '#09090B',
		primary: '#2563EB'
	},
	dark: {
		base0: '#09090B',
		base50: '#18181B',
		base100: '#27272A',
		base200: '#3F3F46',
		base300: '#52525B',
		base400: '#71717A',
		base500: '#A1A1AA',
		base600: '#D4D4D8',
		base700: '#E4E4E7',
		base800: '#F4F4F5',
		base900: '#FAFAFA',
		base950: '#FFFFFF',
		primary: '#60A5FA'
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
		'--primary': tokens.primary
	};
}

export type TCssVariables = Record<`--${string}`, string>;
