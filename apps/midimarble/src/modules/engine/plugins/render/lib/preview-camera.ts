import type { TVec3 } from '../../../types';
import type { TPreviewConfig, TPreviewState } from '../types';
import type { TCameraSnapshot } from './Viewport';

export const PREVIEW_FORWARD_FALLBACK: TVec3 = {
	x: 0,
	y: 0,
	z: 1
};

export interface TPreviewCameraPose {
	position: TVec3;
	target: TVec3;
	forward: TVec3;
}

export function getPreviewSideSign(snapshot: TCameraSnapshot | null): number {
	if (snapshot == null) {
		return 1;
	}

	const sideOffsetX = snapshot.position.x - snapshot.target.x;
	if (Math.abs(sideOffsetX) < 1e-4) {
		return 1;
	}

	return sideOffsetX < 0 ? -1 : 1;
}

export function enterPreview(
	viewport: {
		getCameraSnapshot(): TCameraSnapshot;
		setControlsEnabled(enabled: boolean): void;
	},
	state: TPreviewState
): TPreviewState {
	viewport.setControlsEnabled(false);
	return {
		...state,
		savedCameraSnapshot: state.savedCameraSnapshot ?? viewport.getCameraSnapshot(),
		lastFollowDirection: null
	};
}

export function exitPreview(
	viewport: {
		applyCameraSnapshot(snapshot: TCameraSnapshot): void;
		setControlsEnabled(enabled: boolean): void;
	},
	state: TPreviewState
): TPreviewState {
	if (state.savedCameraSnapshot != null) {
		viewport.applyCameraSnapshot(state.savedCameraSnapshot);
	}
	viewport.setControlsEnabled(true);
	return {
		...state,
		savedCameraSnapshot: null,
		lastFollowDirection: null
	};
}

export function computePreviewCameraPose(
	marblePosition: TVec3,
	velocity: TVec3 | null,
	lastFollowDirection: TVec3 | null,
	config: Pick<TPreviewConfig, 'distance' | 'height' | 'lookAhead'>,
	sideSign: number = 1
): TPreviewCameraPose {
	const forward = normalizeOrFallback(
		flattenTravelDirection(velocity),
		flattenTravelDirection(lastFollowDirection ?? PREVIEW_FORWARD_FALLBACK) ??
			PREVIEW_FORWARD_FALLBACK
	);
	const normalizedSideSign = sideSign < 0 ? -1 : 1;
	const sideDistance = config.distance * 0.88;
	const trailingDistance = config.distance * 0.26;

	return {
		position: {
			x: marblePosition.x + sideDistance * normalizedSideSign,
			y: marblePosition.y + config.height,
			z: marblePosition.z - forward.z * trailingDistance - forward.x * config.distance * 0.1
		},
		target: {
			x: marblePosition.x,
			y: marblePosition.y + config.height * 0.12,
			z: marblePosition.z + forward.z * config.lookAhead + forward.x * config.lookAhead * 0.25
		},
		forward
	};
}

export function getPreviewSmoothingAlpha(smoothing: number, delta: number): number {
	if (delta <= 0) {
		return smoothing;
	}

	const clampedSmoothing = clamp(smoothing, 0, 1);
	return clamp(1 - Math.pow(1 - clampedSmoothing, delta * 60), 0, 1);
}

export function lerpVec3(from: TVec3, to: TVec3, alpha: number): TVec3 {
	return {
		x: from.x + (to.x - from.x) * alpha,
		y: from.y + (to.y - from.y) * alpha,
		z: from.z + (to.z - from.z) * alpha
	};
}

export function areVec3Close(
	left: TVec3 | null,
	right: TVec3 | null,
	epsilon: number = 1e-4
): boolean {
	if (left == null || right == null) {
		return left === right;
	}

	return (
		Math.abs(left.x - right.x) <= epsilon &&
		Math.abs(left.y - right.y) <= epsilon &&
		Math.abs(left.z - right.z) <= epsilon
	);
}

function normalizeOrFallback(vector: TVec3 | null, fallback: TVec3): TVec3 {
	if (vector == null) {
		return fallback;
	}

	const length = Math.hypot(vector.x, vector.y, vector.z);
	if (length < 1e-4) {
		return fallback;
	}

	return {
		x: vector.x / length,
		y: vector.y / length,
		z: vector.z / length
	};
}

function flattenTravelDirection(vector: TVec3 | null): TVec3 | null {
	if (vector == null) {
		return null;
	}

	return {
		x: vector.x,
		y: 0,
		z: vector.z
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
