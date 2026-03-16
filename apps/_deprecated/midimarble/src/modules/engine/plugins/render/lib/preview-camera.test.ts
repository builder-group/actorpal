import { describe, expect, it, vi } from 'vitest';
import {
	computePreviewCameraPose,
	enterPreview,
	exitPreview,
	getPreviewSideSign,
	getPreviewSmoothingAlpha
} from './preview-camera';

describe('preview camera helpers', () => {
	it('saves and restores the camera snapshot when preview toggles', () => {
		const snapshot = {
			position: { x: 1, y: 2, z: 3 },
			target: { x: 4, y: 5, z: 6 },
			fov: 28
		};
		const getCameraSnapshot = vi.fn(() => snapshot);
		const applyCameraSnapshot = vi.fn();
		const setControlsEnabled = vi.fn();
		const initialState = {
			savedCameraSnapshot: null,
			lastFollowDirection: { x: 0, y: 0, z: 1 },
			targetEntityId: 12
		};

		const entered = enterPreview(
			{
				getCameraSnapshot,
				setControlsEnabled
			},
			initialState
		);
		const exited = exitPreview(
			{
				applyCameraSnapshot,
				setControlsEnabled
			},
			entered
		);

		expect(getCameraSnapshot).toHaveBeenCalledOnce();
		expect(setControlsEnabled).toHaveBeenNthCalledWith(1, false);
		expect(setControlsEnabled).toHaveBeenNthCalledWith(2, true);
		expect(entered.savedCameraSnapshot).toEqual(snapshot);
		expect(entered.lastFollowDirection).toBeNull();
		expect(applyCameraSnapshot).toHaveBeenCalledWith(snapshot);
		expect(exited.savedCameraSnapshot).toBeNull();
		expect(exited.lastFollowDirection).toBeNull();
		expect(exited.targetEntityId).toBe(12);
	});

	it('reuses the last non-zero direction when the marble slows down', () => {
		const pose = computePreviewCameraPose(
			{ x: 0, y: 1, z: 2 },
			{ x: 0, y: 0, z: 0 },
			{ x: 0, y: 0, z: -1 },
			{
				distance: 7,
				height: 2.2,
				lookAhead: 2.4
			},
			1
		);

		expect(pose.forward).toEqual({ x: 0, y: 0, z: -1 });
		expect(pose.position).toEqual({ x: 6.16, y: 3.2, z: 3.8200000000000003 });
		expect(pose.target).toEqual({ x: 0, y: 1.264, z: -0.3999999999999999 });
	});

	it('inherits the preview side from the saved editor camera snapshot', () => {
		expect(
			getPreviewSideSign({
				position: { x: -12, y: 6, z: 4 },
				target: { x: 0, y: 0, z: 0 },
				fov: 25
			})
		).toBe(-1);

		const pose = computePreviewCameraPose(
			{ x: 0, y: 1, z: 2 },
			{ x: 0, y: 0, z: -1 },
			null,
			{
				distance: 7,
				height: 2.2,
				lookAhead: 2.4
			},
			-1
		);

		expect(pose.position.x).toBeCloseTo(-6.16, 5);
	});

	it('keeps smoothing frame-rate aware', () => {
		expect(getPreviewSmoothingAlpha(0.14, 1 / 60)).toBeCloseTo(0.14, 5);
		expect(getPreviewSmoothingAlpha(0.14, 1 / 30)).toBeGreaterThan(0.14);
	});
});
