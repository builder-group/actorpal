import { describe, expect, it, vi } from 'vitest';
import { applyTrajectoryMarkerSelection } from './marker-interaction';

describe('applyTrajectoryMarkerSelection', () => {
	it('pauses, seeks, and selects the clicked note', () => {
		const pause = vi.fn();
		const seekToTick = vi.fn();
		const selectNote = vi.fn();
		const previewNote = vi.fn();
		const update = vi.fn();
		const updateResource = vi.fn();

		applyTrajectoryMarkerSelection(
			{
				r: {
					simulationSync: { mode: 'idle' }
				},
				pause,
				seekToTick,
				selectNote,
				previewNote,
				update,
				updateResource
			} as never,
			4,
			960
		);

		expect(updateResource).not.toHaveBeenCalled();
		expect(pause).toHaveBeenCalledOnce();
		expect(seekToTick).toHaveBeenCalledWith(960);
		expect(selectNote).toHaveBeenCalledWith(4);
		expect(update).toHaveBeenCalledWith(0);
		expect(previewNote).toHaveBeenCalledWith(4);
	});

	it('clears resumeWhenReady before selecting while sync is active', () => {
		const pause = vi.fn();
		const seekToTick = vi.fn();
		const selectNote = vi.fn();
		const previewNote = vi.fn();
		const update = vi.fn();
		const updateResource = vi.fn();
		const world = {} as never;
		const checkpointStore = new Map();

		applyTrajectoryMarkerSelection(
			{
				r: {
					simulationSync: {
						mode: 'rebuilding',
						targetStep: 10,
						currentStep: 4,
						resumeWhenReady: true,
						world,
						checkpointStore
					}
				},
				pause,
				seekToTick,
				selectNote,
				previewNote,
				update,
				updateResource
			} as never,
			7,
			480
		);

		expect(updateResource).toHaveBeenCalledWith('simulationSync', {
			mode: 'rebuilding',
			targetStep: 10,
			currentStep: 4,
			resumeWhenReady: false,
			world,
			checkpointStore
		});
		expect(pause).toHaveBeenCalledOnce();
		expect(seekToTick).toHaveBeenCalledWith(480);
		expect(selectNote).toHaveBeenCalledWith(7);
		expect(update).toHaveBeenCalledWith(0);
		expect(previewNote).toHaveBeenCalledWith(7);
	});
});
