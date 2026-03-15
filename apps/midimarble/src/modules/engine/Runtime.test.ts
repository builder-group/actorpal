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
		expect(runtime._app.setSceneEditPending).toHaveBeenCalledWith(false);
		expect(runtime._flushImmediateUpdate).toHaveBeenCalledOnce();
	});

	it('clears pending scene edits after clearing the current MIDI song', () => {
		const runtime = createRuntimeHarness();

		Runtime.prototype.clearMidiSong.call(runtime);

		expect(runtime._app.clearMidiSong).toHaveBeenCalledOnce();
		expect(runtime._app.resetTransport).toHaveBeenCalledOnce();
		expect(runtime._app.setSceneEditPending).toHaveBeenCalledWith(false);
		expect(runtime._flushImmediateUpdate).toHaveBeenCalledOnce();
	});

	it('does not create a straight track while simulation sync is active', () => {
		const runtime = createRuntimeHarness({
			_app: {
				setSimulationResumeWhenReady: vi.fn(() => true),
				r: {
					simulationSync: {
						mode: 'dirty',
						requested: false,
						resumeWhenReady: true
					}
				}
			}
		});

		const entityId = Runtime.prototype.createStraightTrack.call(runtime);

		expect(entityId).toBeNull();
		expect(runtime._app.createStraightTrack).not.toHaveBeenCalled();
		expect(runtime._app.setSimulationResumeWhenReady).toHaveBeenCalledWith(false);
		expect(runtime._flushImmediateUpdate).not.toHaveBeenCalled();
	});

	it('does not delete a straight track while simulation sync is active', () => {
		const runtime = createRuntimeHarness({
			_app: {
				setSimulationResumeWhenReady: vi.fn(() => true),
				r: {
					simulationSync: {
						mode: 'dirty',
						requested: false,
						resumeWhenReady: true
					}
				}
			}
		});

		Runtime.prototype.deleteStraightTrack.call(runtime, 41);

		expect(runtime._app.deleteStraightTrack).not.toHaveBeenCalled();
		expect(runtime._app.setSimulationResumeWhenReady).toHaveBeenCalledWith(false);
		expect(runtime._flushImmediateUpdate).not.toHaveBeenCalled();
	});
});

function createRuntimeHarness(
	overrides: {
		_app?: Record<string, unknown>;
		_flushImmediateUpdate?: ReturnType<typeof vi.fn>;
	} = {}
): any {
	const harness: any = {
		_app: {
			loadMidiFile: vi.fn().mockResolvedValue(undefined),
			clearMidiSong: vi.fn(),
			resetTransport: vi.fn(),
			createStraightTrack: vi.fn(() => 41),
			deleteStraightTrack: vi.fn(() => true),
			setSceneEditPending: vi.fn(),
			setSimulationResumeWhenReady: vi.fn(() => false),
			r: {
				simulationSync: {
					mode: 'idle'
				}
			},
			...overrides._app
		},
		_flushImmediateUpdate: overrides._flushImmediateUpdate ?? vi.fn()
	};

	harness._runImmediateCommand = (command: () => unknown) => {
		const result = command();
		harness._flushImmediateUpdate();
		return result;
	};
	harness._runSimulationCommand = (fallback: unknown, command: () => unknown) => {
		if (harness._app.setSimulationResumeWhenReady(false)) {
			return fallback;
		}
		return harness._runImmediateCommand(command);
	};

	return harness;
}
