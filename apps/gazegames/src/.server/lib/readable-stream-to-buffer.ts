import { Err, Ok, type TResult } from 'tuple-result';

export async function readableStreamToBuffer(
	stream: ReadableStream<Uint8Array>
): Promise<TResult<Buffer, string>> {
	const chunks: Uint8Array[] = [];
	const reader = stream.getReader();

	while (true) {
		let readResult: ReadableStreamReadResult<Uint8Array>;
		try {
			readResult = await reader.read();
		} catch (error) {
			return Err(
				`Failed to read stream: ${error instanceof Error ? error.message : String(error)}`
			);
		}

		const { done, value } = readResult;
		if (done) break;
		if (value != null) {
			chunks.push(value);
		}
	}

	const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
	return Ok(buffer);
}
