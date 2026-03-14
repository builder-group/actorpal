import { describe, expect, it } from 'vitest';
import {
	canCreateStraightTrack,
	canDeleteStraightTrack,
	getInspectorDeleteEntityId
} from './scene-ui';

describe('scene UI helpers', () => {
	it('allows creating a straight track only when preview is off and simulation is idle', () => {
		expect(canCreateStraightTrack(false, 'idle')).toBe(true);
		expect(canCreateStraightTrack(true, 'idle')).toBe(false);
		expect(canCreateStraightTrack(false, 'dirty')).toBe(false);
		expect(canCreateStraightTrack(false, 'rebuilding')).toBe(false);
	});

	it('allows deleting a straight track only when simulation is idle', () => {
		expect(canDeleteStraightTrack('idle')).toBe(true);
		expect(canDeleteStraightTrack('dirty')).toBe(false);
		expect(canDeleteStraightTrack('rebuilding')).toBe(false);
	});

	it('returns a delete entity id only for straight-track inspector targets', () => {
		expect(
			getInspectorDeleteEntityId({
				kind: 'straight-track',
				title: 'Straight Track',
				entityId: 14,
				position: { x: 0, y: 0, z: 0 },
				rotation: { x: 0, y: 0, z: 0 },
				length: 14,
				width: 1.5,
				channelWidth: 1.3,
				channelDepth: 0.2,
				color: '#2a5e92'
			})
		).toBe(14);
		expect(
			getInspectorDeleteEntityId({
				kind: 'marble',
				title: 'Marble',
				entityId: 3,
				position: { x: 0, y: 0, z: 0 },
				velocity: null,
				bounce: 0.4
			})
		).toBeNull();
	});
});
