import { describe, expect, it, vi } from 'vitest';
import { Runtime } from './Runtime';

describe('Runtime scene edit lifecycle', () => {
	it('clears pending scene edits after loading a new MIDI file', async () => {
		const runtime = createRuntimeHarness();

		await Runtime.prototype.loadMidiFile.call(
			runtime,
			new File([new Uint8Array([0x4d, 0x54, 0x68, 0x64])], 'demo.mid', { type: 'audio/midi' })
		);

		expect(runtime._app.loadMidiFile).toHaveBeenCalledOnce();
		expect(runtime._app.resetTransport).toHaveBeenCalledOnce();
		expect(runtime._setSceneEditPending).toHaveBeenCalledWith(false);
		expect(runtime._flushImmediateUpdate).toHaveBeenCalledOnce();
	});

	it('clears pending scene edits after clearing the current MIDI song', () => {
		const runtime = createRuntimeHarness();

		Runtime.prototype.clearMidiSong.call(runtime);

		expect(runtime._app.clearMidiSong).toHaveBeenCalledOnce();
		expect(runtime._app.resetTransport).toHaveBeenCalledOnce();
		expect(runtime._setSceneEditPending).toHaveBeenCalledWith(false);
		expect(runtime._flushImmediateUpdate).toHaveBeenCalledOnce();
	});
});

function createRuntimeHarness(): any {
	return {
		_app: {
			loadMidiFile: vi.fn().mockResolvedValue(undefined),
			clearMidiSong: vi.fn(),
			resetTransport: vi.fn()
		},
		_setSceneEditPending: vi.fn(),
		_flushImmediateUpdate: vi.fn()
	};
}
