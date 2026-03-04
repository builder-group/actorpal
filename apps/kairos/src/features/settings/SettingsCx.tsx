import { createState } from 'feature-state';
import React from 'react';
import { withAsyncStorage } from '@/lib';

// MARK: - Class

export class SettingsCx {
	public readonly $settings = withAsyncStorage(
		createState<TSettings>({
			appearance: {
				theme: 'system'
			}
		}),
		'kairos:settings'
	);

	public async mount(): Promise<void> {
		await this.$settings.persist();
	}

	public unmount(): void {
		// nothing to clean up
	}

	public update(updates: TSettingsUpdates): void {
		this.$settings.set((current) => ({
			...current,
			...updates,
			appearance: { ...current.appearance, ...updates.appearance }
		}));
	}
}

export interface TSettings {
	appearance: {
		theme: TThemePreference;
	};
}

interface TSettingsUpdates {
	appearance?: Partial<TSettings['appearance']>;
}

export type TThemePreference = 'light' | 'dark' | 'system';

export type TSettingsCx = SettingsCx;

// MARK: - React Context

const SettingsCxContext = React.createContext<SettingsCx | null>(null);

export const SettingsCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [cx] = React.useState(() => new SettingsCx());

	React.useEffect(() => {
		cx.mount();
		return () => cx.unmount();
	}, [cx]);

	return <SettingsCxContext.Provider value={cx}>{children}</SettingsCxContext.Provider>;
};

export function useSettingsCx(): SettingsCx {
	const cx = React.useContext(SettingsCxContext);
	if (cx == null) {
		throw new Error('useSettingsCx must be used within a SettingsCxProvider');
	}
	return cx;
}
