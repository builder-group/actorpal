import Constants from 'expo-constants';

export const appConfig = {
	name: 'Kairos',
	bundleId: 'com.buildergroup.kairos',
	version: Constants.expoConfig?.version ?? '1.0',

	links: {
		website: 'https://builder.group/apps/kairos',
		appStore: null as string | null, // TODO: Add after release
		privacyPolicy: 'https://builder.group/apps/kairos/legal/privacy',
		github: 'https://github.com/builder-group/lab'
	},

	support: {
		email: 'support@builder.group',
		mailto: (subject: string): string =>
			`mailto:support@builder.group?subject=${encodeURIComponent(`[Kairos] ${subject}`)}`
	}
} as const;
