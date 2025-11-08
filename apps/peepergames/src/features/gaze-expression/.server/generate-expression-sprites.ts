import { FileOutput } from 'replicate';
import { Err, Ok, type TResult } from 'tuple-result';
import { replicate, replicateConfig, TExpressionEditorInput } from '@/.server/environment';

export async function generateExpressionSprites(
	config: TGenerateExpressionSpritesConfig
): Promise<TResult<TExpressionSprite[], string>> {
	const { image, mapSize } = config;
	const centerX = (mapSize - 1) / 2;
	const centerY = (mapSize - 1) / 2;

	// Generate sprites for all positions in the sprite map (mapSize x mapSize)
	// Each sprite represents a gaze direction: sprite at position (x,y) looks toward center
	const promises: Promise<TResult<TExpressionSprite, string>>[] = [];
	for (let y = 0; y < mapSize; y++) {
		for (let x = 0; x < mapSize; x++) {
			// Direction from current position to center
			// Example: x0y0 (top-left) → center: dx=+2, dy=+2 (right and down)
			const dx = centerX - x;
			const dy = centerY - y;

			const maxDistance = Math.max(centerX, centerY);
			const normalizedDx = dx / maxDistance;
			const normalizedDy = dy / maxDistance;

			// Yaw (horizontal): positive = look right, negative = look left
			const rotate_yaw = normalizedDx * yawRange.max;

			// Pitch (vertical): positive = look up, negative = look down
			const rotate_pitch = normalizedDy * pitchRange.max;

			// Pupils follow gaze direction
			const pupil_x =
				normalizedDx * ((pupilXRange.max - pupilXRange.min) / 2) +
				(pupilXRange.max + pupilXRange.min) / 2;
			const pupil_y = -normalizedDy * ((pupilYRange.max - pupilYRange.min) / 2);

			const promise: Promise<TResult<TExpressionSprite, string>> = replicate
				.run(modelConfig.id, {
					input: {
						image,
						rotate_yaw,
						rotate_pitch,
						pupil_x,
						pupil_y
					} satisfies TExpressionEditorInput
				})
				.then((output): TResult<TExpressionSprite, string> => {
					if (!Array.isArray(output) || output.length === 0) {
						return Err(`No output for position [x${x}y${y}]`);
					}

					const firstOutput = output[0];
					if (firstOutput instanceof ReadableStream) {
						return Ok({
							x,
							y,
							image: firstOutput as FileOutput
						});
					}

					return Err(`Invalid output type for position [x${x}y${y}]`);
				})
				.catch((error): TResult<TExpressionSprite, string> => {
					return Err(
						`Failed at [x${x}y${y}]: ${error instanceof Error ? error.message : String(error)}`
					);
				});

			promises.push(promise);
		}
	}

	const results = await Promise.all(promises);

	// Categorize results into items and errors
	const items: TExpressionSprite[] = [];
	const errors: string[] = [];
	for (const result of results) {
		if (result.isOk()) {
			items.push(result.value);
		} else {
			errors.push(result.error);
		}
	}

	if (errors.length > 0) {
		return Err(errors.join('; '));
	}

	return Ok(items);
}

export interface TExpressionSprite {
	x: number;
	y: number;
	image: FileOutput;
}

export interface TGenerateExpressionSpritesConfig {
	image: string | Buffer;
	mapSize: number;
}

const modelConfig = replicateConfig.models['expression-editor'];
const yawRange = {
	min: modelConfig.inputParams.rotate_yaw.min,
	max: modelConfig.inputParams.rotate_yaw.max
};
const pitchRange = {
	min: modelConfig.inputParams.rotate_pitch.min,
	max: modelConfig.inputParams.rotate_pitch.max
};
const pupilXRange = {
	min: modelConfig.inputParams.pupil_x.min,
	max: modelConfig.inputParams.pupil_x.max
};
const pupilYRange = {
	min: modelConfig.inputParams.pupil_y.min,
	max: modelConfig.inputParams.pupil_y.max
};
