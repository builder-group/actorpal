export const replicateConfig = {
	apiToken: process.env['REPLICATE_API_TOKEN'],
	models: {
		// https://replicate.com/fofr/expression-editor
		'expression-editor': {
			id: 'fofr/expression-editor:bf913bc90e1c44ba288ba3942a538693b72e8cc7df576f3beebe56adc0a92b86' as const,
			inputParams: {
				rotate_pitch: { min: -20, max: 20, default: 0 },
				rotate_yaw: { min: -20, max: 20, default: 0 },
				rotate_roll: { min: -20, max: 20, default: 0 },
				blink: { min: -20, max: 5, default: 0 },
				eyebrow: { min: -10, max: 15, default: 0 },
				wink: { min: 0, max: 25, default: 0 },
				pupil_x: { min: -15, max: 15, default: 0 },
				pupil_y: { min: -15, max: 15, default: 0 },
				aaa: { min: -30, max: 120, default: 0 },
				eee: { min: -20, max: 15, default: 0 },
				woo: { min: -20, max: 15, default: 0 },
				smile: { min: -0.3, max: 1.3, default: 0 },
				src_ratio: { min: 0, max: 1, default: 1 },
				sample_ratio: { min: -0.2, max: 1.2, default: 1 },
				crop_factor: { min: 1.5, max: 2.5, default: 1.7 },
				output_format: { default: 'webp' },
				output_quality: { min: 0, max: 100, default: 95 }
			}
		}
	}
} as const;

export type TExpressionEditorInput = {
	image: string | Buffer;
	rotate_pitch?: number;
	rotate_yaw?: number;
	rotate_roll?: number;
	blink?: number;
	eyebrow?: number;
	wink?: number;
	pupil_x?: number;
	pupil_y?: number;
	aaa?: number;
	eee?: number;
	woo?: number;
	smile?: number;
	src_ratio?: number;
	sample_ratio?: number;
	crop_factor?: number;
	output_format?: string;
	output_quality?: number;
};
