import type { TAudioSettings } from '@/modules/engine/plugins/audio/types';
import type { TMidiSong } from '@/modules/engine/plugins/midi/types';
import type { TTrajectoryConfig } from '@/modules/engine/plugins/trajectory/types';
import type { TVec3 } from '@/modules/engine/types';

export interface TProjectRecord {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	midiFileName: string | null;
	midiSong: TMidiSong | null;
	selectedTrackId: number | null;
	playheadTick: number;
	audioSettings: TAudioSettings;
	trajectoryConfig: TTrajectoryConfig;
	marble: TMarbleSnapshot;
	notePlatforms: TNotePlatformSnapshot[];
	straightTracks: TStraightTrackSnapshot[];
}

export interface TMarbleSnapshot {
	position: TVec3;
	rotation: TVec3;
	bounce: number;
}

export interface TNotePlatformSnapshot {
	noteId: number;
	offsetY: number;
	offsetZ: number;
	rotationX: number;
	length: number;
	width: number;
	thickness: number;
	bounce: number;
	color: string;
}

export interface TStraightTrackSnapshot {
	position: TVec3;
	rotation: TVec3;
	scale: TVec3;
	length: number;
	height: number;
	width: number;
	channelWidth: number;
	channelDepth: number;
	color: string;
}

export type TProjectListItem = Pick<TProjectRecord, 'id' | 'name' | 'updatedAt'>;
