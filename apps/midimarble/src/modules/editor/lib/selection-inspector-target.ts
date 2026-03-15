import type { TVec3 } from '@/modules/engine';
import {
	findNoteById,
	findTrackById,
	tickToStep,
	type TMidiLookup,
	type TMidiSong
} from '@/modules/engine/plugins/midi';
import {
	buildEmptyInspectorTarget,
	buildNoteInspectorTarget,
	buildNotePlatformInspectorTarget,
	buildStraightTrackInspectorTarget,
	type TEmptyInspectorTarget,
	type TInspectorTarget,
	type TNoteInspectorTarget
} from './inspector-target';

type TStraightTrackEntry = readonly [
	number,
	{ position: TVec3; rotation: TVec3 },
	{ length: number },
	{ width: number; channelWidth: number; channelDepth: number; color: string }
];

type TMarbleEntry = readonly [number, TVec3, { bounce: number }];

type TNotePlatformEntry = readonly [
	number,
	{ noteId: number },
	{
		offsetY: number;
		offsetZ: number;
		rotationX: number;
		length: number;
		width: number;
		thickness: number;
		bounce: number;
		color: string;
	}
];

interface TTrajectoryProjectionLike {
	noteAnchorsById: Map<
		number,
		{
			tick: number;
			step: number;
			position: TVec3;
		}
	>;
}

export interface TSelectedNoteInspectorTargetInput {
	midiSong: TMidiSong | null;
	midiLookup: TMidiLookup;
	selectedTrackId: number | null;
	selectedNoteId: number | null;
	fixedTimeStepSeconds: number;
	trajectoryProjection: TTrajectoryProjectionLike;
	notePlatformByNoteId: Map<number, number>;
}

export interface TSceneSelectionInspectorTargetInput {
	midiSong: TMidiSong | null;
	midiLookup: TMidiLookup;
	sceneSelectionEntityId: number | null;
	fixedTimeStepSeconds: number;
	trajectoryProjection: TTrajectoryProjectionLike;
	tracks: TStraightTrackEntry[];
	marbles: TMarbleEntry[];
	notePlatforms: TNotePlatformEntry[];
}

export function deriveSelectedNoteInspectorTarget(
	input: TSelectedNoteInspectorTargetInput
): TNoteInspectorTarget | TEmptyInspectorTarget {
	const { midiSong, midiLookup, selectedTrackId, selectedNoteId, fixedTimeStepSeconds } = input;
	const selectedTrack = findTrackById(midiSong, selectedTrackId, midiLookup);
	const selectedNoteMatch = findNoteById(midiSong, selectedNoteId, midiLookup);

	if (
		midiSong == null ||
		selectedTrack == null ||
		selectedNoteMatch == null ||
		selectedNoteMatch.track.id !== selectedTrack.id
	) {
		return buildEmptyInspectorTarget();
	}

	const anchor = input.trajectoryProjection.noteAnchorsById.get(selectedNoteMatch.note.id) ?? null;
	return buildNoteInspectorTarget(
		midiSong,
		selectedTrack.name,
		selectedNoteMatch.note,
		fixedTimeStepSeconds,
		anchor?.position ?? null,
		input.notePlatformByNoteId.get(selectedNoteMatch.note.id) ?? null
	);
}

export function deriveSceneSelectionInspectorTarget(
	input: TSceneSelectionInspectorTargetInput
): TInspectorTarget {
	const {
		midiSong,
		midiLookup,
		sceneSelectionEntityId,
		fixedTimeStepSeconds,
		trajectoryProjection,
		tracks,
		marbles,
		notePlatforms
	} = input;

	if (sceneSelectionEntityId == null) {
		return buildEmptyInspectorTarget();
	}

	const selectedNotePlatform = notePlatforms.find(([eid]) => eid === sceneSelectionEntityId);
	if (selectedNotePlatform != null) {
		const [eid, binding, platform] = selectedNotePlatform;
		const noteMatch = findNoteById(midiSong, binding.noteId, midiLookup);
		if (noteMatch != null && midiSong != null) {
			const anchor = trajectoryProjection.noteAnchorsById.get(binding.noteId);
			const step =
				anchor?.step ?? tickToStep(noteMatch.note.tick, midiSong, fixedTimeStepSeconds);
			return buildNotePlatformInspectorTarget(
				noteMatch.track.name,
				noteMatch.note,
				eid,
				step,
				anchor?.position ?? null,
				platform
			);
		}
	}

	const selectedTrackEntity = tracks.find(([eid]) => eid === sceneSelectionEntityId);
	if (selectedTrackEntity != null) {
		const [eid, transform, linear, track] = selectedTrackEntity;
		return buildStraightTrackInspectorTarget(eid, {
			position: transform.position,
			rotation: transform.rotation,
			length: linear.length,
			width: track.width,
			channelWidth: track.channelWidth,
			channelDepth: track.channelDepth,
			color: track.color
		});
	}

	const selectedMarble = marbles.find(([eid]) => eid === sceneSelectionEntityId);
	if (selectedMarble != null) {
		const [eid, position, marblePhysics] = selectedMarble;
		return {
			kind: 'marble',
			title: 'Marble',
			entityId: eid,
			position,
			bounce: marblePhysics.bounce
		};
	}

	return buildEmptyInspectorTarget();
}
