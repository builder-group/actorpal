import { StatusBar } from 'expo-status-bar';
import { VariableContextProvider } from 'nativewind';
import React from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import { themeTokens, toCssVariables, TThemeMode, TThemeTokens } from '@/environment';

const ThemeCx = React.createContext<TThemeCx | null>(null);

interface TThemeCx {
	theme: TThemeMode;
	themePreference: TThemePreference;
	tokens: TThemeTokens;
	setThemePreference: (pref: TThemePreference) => void;
}

export type TThemePreference = 'light' | 'dark' | 'system';

export const ThemeProvider: React.FC<TThemeProviderProps> = (props) => {
	const { children } = props;
	const systemTheme = useColorScheme();
	const [themePreference, setPreference] = React.useState<TThemePreference>('system');

	const theme = React.useMemo<TThemeMode>(
		() => (themePreference === 'system' ? resolveSystemTheme(systemTheme) : themePreference),
		[themePreference, systemTheme]
	);

	const { tokens, cssVariables } = React.useMemo(() => {
		const tokens = themeTokens[theme];
		return { tokens, cssVariables: toCssVariables(tokens) };
	}, [theme]);

	// MARK: - Actions

	const setThemePreference = React.useCallback((pref: TThemePreference) => {
		setPreference(pref);
		// Sync to React Native's Appearance API so useColorScheme() and all
		// native views (UIKit, SwiftUI) receive the correct color scheme.
		Appearance.setColorScheme((pref === 'system' ? null : pref) as ColorSchemeName);
	}, []);

	// MARK: - UI

	return (
		<ThemeCx.Provider
			value={React.useMemo(
				() => ({ theme, themePreference, tokens, setThemePreference }),
				[theme, themePreference, tokens, setThemePreference]
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
