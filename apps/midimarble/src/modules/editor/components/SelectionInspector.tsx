import { Entity, With } from 'ecsify';
import React from 'react';
import { useQueryComponents, useResource } from '@/modules/engine';
import { findTrackById } from '@/modules/engine/plugins/midi';
import { useEditorCx } from '../EditorCx';
import {
	buildEmptyInspectorTarget,
	buildNoteInspectorTarget,
	type TInspectorTarget
} from '../lib/inspector-target';

export const SelectionInspector: React.FC = () => {
	const app = useEditorCx().runtime.app;
	const midiSong = useResource(app, 'midiSong');
	const selectedTrackId = useResource(app, 'selectedTrackId');
	const selectedNoteId = useResource(app, 'selectedNoteId');
	const sceneSelection = useResource(app, 'sceneSelection');
	const liveStep = useResource(app, 'liveStep');
	const bufferedStep = useResource(app, 'bufferedStep');
	const fixedTimeStepSeconds = useResource(app, 'fixedTimeStepSeconds');

	const tracks = useQueryComponents(app, {
		components: [
			Entity,
			app.c.AuthoredTransformMixin,
			app.c.LinearElementMixin,
			app.c.StraightTrackMixin
		] as const,
		queryOrFilter: With(app.c.StraightTrackMixin),
		watchComponents: [
			app.c.AuthoredTransformMixin,
			app.c.LinearElementMixin,
			app.c.StraightTrackMixin
		]
	});
	const marbles = useQueryComponents(app, {
		components: [Entity, app.c.PositionMixin] as const,
		queryOrFilter: With(app.c.MarbleTag),
		watchComponents: [app.c.MarbleTag, app.c.PositionMixin]
	});

	const selectedTrack = React.useMemo(
		() => findTrackById(midiSong, selectedTrackId),
		[midiSong, selectedTrackId]
	);
	const selectedNote = React.useMemo(
		() => selectedTrack?.notes.find((note) => note.id === selectedNoteId) ?? null,
		[selectedNoteId, selectedTrack]
	);

	const target = React.useMemo<TInspectorTarget>(() => {
		if (midiSong != null && selectedTrack != null && selectedNote != null) {
			const markerPosition = app.r.trajectoryState.noteIdToMarker.get(selectedNote.id)?.position;
			return buildNoteInspectorTarget(
				midiSong,
				selectedTrack.name,
				selectedNote,
				liveStep,
				bufferedStep,
				fixedTimeStepSeconds,
				markerPosition == null
					? null
					: {
							x: markerPosition.x,
							y: markerPosition.y,
							z: markerPosition.z
						}
			);
		}

		if (sceneSelection.entityId != null) {
			const selectedTrackEntity = tracks.find(([eid]) => eid === sceneSelection.entityId);
			if (selectedTrackEntity != null) {
				const [eid, transform, linear, track] = selectedTrackEntity;
				return {
					kind: 'straight-track',
					title: 'Straight Track',
					entityId: eid,
					position: transform.position,
					rotation: transform.rotation,
					length: linear.length,
					width: track.width,
					channelWidth: track.channelWidth,
					channelDepth: track.channelDepth,
					color: track.color
				};
			}

			const selectedMarble = marbles.find(([eid]) => eid === sceneSelection.entityId);
			if (selectedMarble != null) {
				const [eid, position] = selectedMarble;
				const velocity = app.r.rigidBodies.get(eid)?.linvel();
				return {
					kind: 'marble',
					title: 'Marble',
					entityId: eid,
					position,
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
	}, [
		app,
		bufferedStep,
		fixedTimeStepSeconds,
		liveStep,
		marbles,
		midiSong,
		sceneSelection.entityId,
		selectedNote,
		selectedTrack,
		tracks
	]);

	return (
		<section>
			<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">Inspector</h3>

			<div className="mt-3">
				{target.kind === 'empty' ? <EmptyState message={target.message} /> : null}
				{target.kind === 'note' ? <NoteInspector target={target} /> : null}
				{target.kind === 'straight-track' ? <StraightTrackInspector target={target} /> : null}
				{target.kind === 'marble' ? <MarbleInspector target={target} /> : null}
			</div>
		</section>
	);
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
	<div className="border-base-200 bg-base-0 rounded-lg border px-3 py-3">
		<p className="text-base-500 text-sm leading-5">{message}</p>
	</div>
);

const NoteInspector: React.FC<{
	target: Extract<TInspectorTarget, { kind: 'note' }>;
}> = ({ target }) => (
	<div className="border-base-200 bg-base-0 rounded-lg border px-3 py-3">
		<InspectorTitle title={target.title} subtitle={`${target.noteName} · ${target.trackName}`} />
		<InspectorField label="Tick" value={Math.round(target.tick)} mono />
		<InspectorField label="Step" value={target.step} mono />
		<InspectorField label="Duration" value={`${target.durationTicks} ticks`} mono />
		<InspectorField label="Velocity" value={target.velocity} mono />
		<InspectorField label="Channel" value={target.channel} mono />
		<InspectorField label="Path" value={capitalize(target.pathState)} />
		{target.position != null ? <Vec3Field label="Position" value={target.position} /> : null}
	</div>
);

const StraightTrackInspector: React.FC<{
	target: Extract<TInspectorTarget, { kind: 'straight-track' }>;
}> = ({ target }) => (
	<div className="border-base-200 bg-base-0 rounded-lg border px-3 py-3">
		<InspectorTitle title={target.title} subtitle={`Entity ${target.entityId}`} />
		<Vec3Field label="Position" value={target.position} />
		<Vec3Field label="Rotation" value={target.rotation} />
		<InspectorField label="Length" value={target.length.toFixed(2)} mono />
		<InspectorField label="Width" value={target.width.toFixed(2)} mono />
		<InspectorField label="Channel Width" value={target.channelWidth.toFixed(2)} mono />
		<InspectorField label="Channel Depth" value={target.channelDepth.toFixed(2)} mono />
		<InspectorColorField label="Color" value={target.color} />
	</div>
);

const MarbleInspector: React.FC<{
	target: Extract<TInspectorTarget, { kind: 'marble' }>;
}> = ({ target }) => (
	<div className="border-base-200 bg-base-0 rounded-lg border px-3 py-3">
		<InspectorTitle title={target.title} subtitle={`Entity ${target.entityId}`} />
		<Vec3Field label="Position" value={target.position} />
		{target.velocity != null ? <Vec3Field label="Velocity" value={target.velocity} /> : null}
	</div>
);

const InspectorTitle: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
	<div className="mb-3">
		<p className="text-base-900 text-sm font-medium">{title}</p>
		<p className="text-base-500 mt-1 text-xs tracking-wide uppercase">{subtitle}</p>
	</div>
);

const InspectorField: React.FC<{
	label: string;
	value: string | number;
	mono?: boolean;
}> = ({ label, value, mono = false }) => (
	<div className="mt-2 flex items-baseline justify-between gap-4">
		<span className="text-base-500 text-xs tracking-wide uppercase">{label}</span>
		<span className={mono ? 'text-base-800 font-mono text-sm' : 'text-base-800 text-sm'}>
			{value}
		</span>
	</div>
);

const InspectorColorField: React.FC<{
	label: string;
	value: string;
}> = ({ label, value }) => (
	<div className="mt-2 flex items-center justify-between gap-4">
		<span className="text-base-500 text-xs tracking-wide uppercase">{label}</span>
		<span className="flex items-center gap-2">
			<span
				className="border-base-200 h-3.5 w-3.5 rounded-full border"
				style={{ backgroundColor: value }}
			/>
			<span className="text-base-800 font-mono text-sm">{value}</span>
		</span>
	</div>
);

const Vec3Field: React.FC<{
	label: string;
	value: { x: number; y: number; z: number };
}> = ({ label, value }) => (
	<InspectorField
		label={label}
		value={`${value.x.toFixed(2)}, ${value.y.toFixed(2)}, ${value.z.toFixed(2)}`}
		mono
	/>
);

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}
