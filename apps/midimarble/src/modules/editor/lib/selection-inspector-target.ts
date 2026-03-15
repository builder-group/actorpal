import type { TVec3 } from '@/modules/engine';
import {
	findNoteById,
	findTrackById,
	tickToStep,
	type TMidiSong
} from '@/modules/engine/plugins/midi';
import {
	buildEmptyInspectorTarget,
	buildNoteInspectorTarget,
	buildNotePlatformInspectorTarget,
	buildStraightTrackInspectorTarget,
	type TInspectorTarget
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
	},
	TVec3
];

type TRigidBodyLike = {
	linvel(): { x: number; y: number; z: number };
};

export interface TSelectionInspectorTargetInput {
	midiSong: TMidiSong | null;
	selectedTrackId: number | null;
	selectedNoteId: number | null;
	sceneSelectionEntityId: number | null;
	liveStep: number;
	bufferedStep: number;
	fixedTimeStepSeconds: number;
	trajectoryProjection: {
		noteAnchorsById: Map<
			number,
			{
				tick: number;
				step: number;
				position: TVec3;
				phase: 'past' | 'future';
			}
		>;
	};
	tracks: TStraightTrackEntry[];
	marbles: TMarbleEntry[];
	notePlatforms: TNotePlatformEntry[];
	rigidBodies: Map<number, TRigidBodyLike>;
}

export function deriveSelectionInspectorTarget(
	input: TSelectionInspectorTargetInput
): TInspectorTarget {
	const {
		midiSong,
		selectedTrackId,
		selectedNoteId,
		sceneSelectionEntityId,
		liveStep,
		bufferedStep,
		fixedTimeStepSeconds,
		trajectoryProjection,
		tracks,
		marbles,
		notePlatforms,
		rigidBodies
	} = input;

	const selectedTrack = findTrackById(midiSong, selectedTrackId);
	const selectedNote = selectedTrack?.notes.find((note) => note.id === selectedNoteId) ?? null;
	const notePlatformByNoteId = new Map(
		notePlatforms.map(([eid, binding]) => [binding.noteId, eid])
	);

	if (midiSong != null && selectedTrack != null && selectedNote != null) {
		const anchor = trajectoryProjection.noteAnchorsById.get(selectedNote.id) ?? null;
		return buildNoteInspectorTarget(
			midiSong,
			selectedTrack.name,
			selectedNote,
			liveStep,
			bufferedStep,
			fixedTimeStepSeconds,
			anchor?.position ?? null,
			notePlatformByNoteId.get(selectedNote.id) ?? null
		);
	}

	if (sceneSelectionEntityId != null) {
		const selectedNotePlatform = notePlatforms.find(([eid]) => eid === sceneSelectionEntityId);
		if (selectedNotePlatform != null) {
			const [eid, binding, platform] = selectedNotePlatform;
			const noteMatch = findNoteById(midiSong, binding.noteId);
			if (noteMatch != null && midiSong != null) {
				const anchor = trajectoryProjection.noteAnchorsById.get(binding.noteId);
				const step =
					anchor?.step ?? tickToStep(noteMatch.note.tick, midiSong, fixedTimeStepSeconds);
				return buildNotePlatformInspectorTarget(
					noteMatch.track.name,
					noteMatch.note,
					eid,
					step,
					anchor?.phase ?? 'unresolved',
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
			const velocity = rigidBodies.get(eid)?.linvel();
			return {
				kind: 'marble',
				title: 'Marble',
				entityId: eid,
				position,
				bounce: marblePhysics.bounce,
				velocity:
					velocity == null
						? null
						: {
								x: velocity.x,
								y: velocity.y,
								z: velocity.z
							}
			};
		}
	}

	return buildEmptyInspectorTarget();
}
