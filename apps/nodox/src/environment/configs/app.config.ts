const email = 'support@builder.group';

export const appConfig = {
	name: 'NoDox',
	website: 'https://builder.group',
	help: {
		discord: 'https://discord.com/invite/w4xE3bSjhQ',
		email,
		githubIssues: 'https://github.com/builder-group/community/issues',
		mailto: (subject: string) =>
			`mailto:${email}?subject=${encodeURIComponent(`[NoDox] ${subject}`)}`
	},
	distribution: {
		website: 'https://builder.group',
		github: 'https://github.com/builder-group/community'
	}
} as const;
