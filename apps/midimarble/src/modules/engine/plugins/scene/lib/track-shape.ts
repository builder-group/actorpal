import * as THREE from 'three';
import type { TPhysicsColliderDescriptor } from '../../physics';
import { sceneConfig } from '../config';

export type TTrackRailMode = 'both' | 'wall-only-negative';

export interface TTrackShapeConfig {
	height: number;
	width: number;
	channelWidth: number;
	channelDepth: number;
	length: number;
}

interface TTrackColliderOptions {
	friction?: number;
	restitution?: number;
}

export function getTrackWallWidth(width: number, channelWidth: number): number {
	return Math.max(0, (width - channelWidth) / 2);
}

export function getScaledTrackChannelDepth(height: number): number {
	const trackChannelDepthRatio =
		sceneConfig.track.defaultChannelDepth / sceneConfig.track.defaultHeight;
	return Math.min(height * trackChannelDepthRatio, height / 2 - 1e-4);
}

export function getScaledTrackChannelWidth(width: number): number {
	const trackChannelWidthRatio =
		sceneConfig.track.defaultChannelWidth / sceneConfig.track.defaultWidth;
	return Math.max(1e-4, width * trackChannelWidthRatio);
}

export function createTrackProfile(
	track: Omit<TTrackShapeConfig, 'length'>,
	railMode: TTrackRailMode
): THREE.Shape {
	const wallWidth = getTrackWallWidth(track.width, track.channelWidth);
	const profile = new THREE.Shape();

	if (railMode === 'wall-only-negative') {
		profile.moveTo(0, -track.height / 2);
		profile.lineTo(0, track.height / 2);
		profile.lineTo(wallWidth, track.height / 2);
		profile.lineTo(wallWidth, track.height / 2 - track.channelDepth);
		profile.lineTo(track.width, track.height / 2 - track.channelDepth);
		profile.lineTo(track.width, -track.height / 2 + track.channelDepth);
		profile.lineTo(wallWidth, -track.height / 2 + track.channelDepth);
		profile.lineTo(wallWidth, -track.height / 2);
		profile.lineTo(0, -track.height / 2);
		return profile;
	}

	profile.moveTo(0, 0);
	profile.lineTo(0, -track.height / 2);
	profile.lineTo(wallWidth, -track.height / 2);
	profile.lineTo(wallWidth, -track.height / 2 + track.channelDepth);
	profile.lineTo(wallWidth + track.channelWidth, -track.height / 2 + track.channelDepth);
	profile.lineTo(wallWidth + track.channelWidth, -track.height / 2);
	profile.lineTo(track.width, -track.height / 2);
	profile.lineTo(track.width, track.height / 2);
	profile.lineTo(wallWidth + track.channelWidth, track.height / 2);
	profile.lineTo(wallWidth + track.channelWidth, track.height / 2 - track.channelDepth);
	profile.lineTo(wallWidth, track.height / 2 - track.channelDepth);
	profile.lineTo(wallWidth, track.height / 2);
	profile.lineTo(0, track.height / 2);
	profile.lineTo(0, 0);

	return profile;
}

export function createTrackGeometry(
	track: TTrackShapeConfig,
	railMode: TTrackRailMode
): THREE.ExtrudeGeometry {
	const profile = createTrackProfile(track, railMode);
	const geometry = new THREE.ExtrudeGeometry(profile, {
		steps: 1,
		depth: track.length,
		bevelEnabled: true,
		bevelThickness: 0,
		bevelSize: 0
	});

	geometry.translate(-track.width / 2, 0, -track.length / 2);
	geometry.computeVertexNormals();
	return geometry;
}

export function createTrackColliders(
	track: TTrackShapeConfig,
	railMode: TTrackRailMode,
	options: TTrackColliderOptions = {}
): TPhysicsColliderDescriptor[] {
	const wallWidth = getTrackWallWidth(track.width, track.channelWidth);
	const descriptors: TPhysicsColliderDescriptor[] = [
		{
			shape: 'cuboid',
			halfExtents: {
				x:
					railMode === 'wall-only-negative'
						? track.width / 2 - wallWidth / 2
						: track.width / 2 - wallWidth,
				y: (track.height - track.channelDepth * 2) / 2,
				z: track.length / 2
			},
			translation: {
				x: railMode === 'wall-only-negative' ? wallWidth / 2 : 0,
				y: 0,
				z: 0
			},
			...options
		},
		{
			shape: 'cuboid',
			halfExtents: { x: wallWidth / 2, y: track.height / 2, z: track.length / 2 },
			translation: { x: -(track.width / 2) + wallWidth / 2, y: 0, z: 0 },
			...options
		}
	];

	if (railMode === 'both') {
		descriptors.push({
			shape: 'cuboid',
			halfExtents: { x: wallWidth / 2, y: track.height / 2, z: track.length / 2 },
			translation: { x: track.width / 2 - wallWidth / 2, y: 0, z: 0 },
			...options
		});
	}

	return descriptors;
}
