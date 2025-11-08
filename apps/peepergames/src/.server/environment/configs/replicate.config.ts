export const replicateConfig = {
	apiToken: process.env.REPLICATE_API_TOKEN,
	models: {
		// https://replicate.com/fofr/expression-editor
		'expression-editor': {
			id: 'fofr/expression-editor:bf913bc90e1c44ba288ba3942a538693b72e8cc7df576f3beebe56adc0a92b86' as const
		}
	}
};
