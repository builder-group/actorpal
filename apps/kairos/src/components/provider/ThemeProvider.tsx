import { StatusBar } from 'expo-status-bar';
import { VariableContextProvider } from 'nativewind';
import React from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import { themeTokens, toCssVariables, TThemeMode, TThemeTokens } from '@/environment';

const ThemeCx = React.createContext<TThemeCx | null>(null);

interface TThemeCx {
	theme: TThemeMode;
	tokens: TThemeTokens;
	toggleTheme: () => void;
}

export const ThemeProvider: React.FC<TThemeProviderProps> = (props) => {
	const { children } = props;
	const systemTheme = useColorScheme();
	const [theme, setTheme] = React.useState<TThemeMode>(resolveSystemTheme(systemTheme));
	const [hasManualOverride, setHasManualOverride] = React.useState(false);

	const { tokens, cssVariables } = React.useMemo(() => {
		const tokens = themeTokens[theme];
		return { tokens, cssVariables: toCssVariables(tokens) };
	}, [theme]);

	// MARK: - Actions

	const toggleTheme = React.useCallback(() => {
		setHasManualOverride(true);
		setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
	}, []);

	// MARK: - Effects

	React.useEffect(() => {
		if (hasManualOverride) {
			return;
		}

		setTheme(resolveSystemTheme(systemTheme));
	}, [systemTheme, hasManualOverride]);

	// MARK: - UI

	return (
		<ThemeCx.Provider
			value={React.useMemo(
				() => ({
					theme,
					tokens,
					toggleTheme
				}),
				[theme, tokens, toggleTheme]
			)}
		>
			<VariableContextProvider value={cssVariables}>
				<StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
				{children}
			</VariableContextProvider>
		</ThemeCx.Provider>
	);
};

interface TThemeProviderProps {
	children: React.ReactNode;
}

export function useTheme(): TThemeCx {
	const cx = React.useContext(ThemeCx);
	if (cx == null) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return cx;
}

function resolveSystemTheme(systemTheme: ColorSchemeName): TThemeMode {
	return systemTheme === 'dark' ? 'dark' : 'light';
}
