import { createState } from 'feature-state';
import React from 'react';
import { withVersionedAsyncStorage, type TVersionedMigrationConfig } from '@/lib';

// MARK: - Class

export class SettingsCx {
	public readonly $settings = withVersionedAsyncStorage(
		createState<TSettings>({
			version: '0.0.2',
			appearance: {
				theme: 'system'
			},
			timer: {
				keepScreenAwake: false
			}
		}),
		'kairos:settings',
		settingsMigrationConfig
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
			appearance: { ...current.appearance, ...updates.appearance },
			timer: { ...current.timer, ...updates.timer }
		}));
	}

	public reset(): void {
		this.$settings.set({
			version: '0.0.2',
			appearance: { theme: 'system' },
			timer: { keepScreenAwake: false }
		});
	}
}

const settingsMigrationConfig: TVersionedMigrationConfig<TSettings> = {
	latestVersion: '0.0.2',
	fallbackVersion: '0.0.1',
	migrations: {
		'0.0.1': {
			to: '0.0.2',
			migrate: (value) => {
				const v = value as { appearance?: { theme?: TThemePreference }; [key: string]: unknown };
				return {
					version: '0.0.2',
					appearance: { theme: v.appearance?.theme ?? 'system' },
					timer: { keepScreenAwake: false }
				};
			}
		}
	}
};

export interface TSettings {
	version: '0.0.2';
	appearance: {
		theme: TThemePreference;
	};
	timer: {
		keepScreenAwake: boolean;
	};
}

interface TSettingsUpdates {
	appearance?: Partial<TSettings['appearance']>;
	timer?: Partial<TSettings['timer']>;
}

export type TThemePreference = 'light' | 'dark' | 'system';

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
