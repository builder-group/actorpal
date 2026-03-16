import sharp from 'sharp';
import { Err, Ok, type TResult } from 'tuple-result';

export async function getImageDimensions(
	buffer: Buffer
): Promise<TResult<{ width: number; height: number }, string>> {
	try {
		const metadata = await sharp(buffer).metadata();
		if (metadata.width == null || metadata.height == null) {
			return Err('Failed to get image dimensions: width or height is null');
		}

		return Ok({
			width: metadata.width,
			height: metadata.height
		});
	} catch (error) {
		return Err(
			`Failed to get image dimensions: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}
