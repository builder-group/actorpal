import { Entity, With } from 'ecsify';
import { Trash2 } from 'lucide-react';
import React from 'react';
import { useQueryComponents, useResource } from '@/modules/engine';
import type { TMidiLookup, TMidiSong } from '@/modules/engine/plugins/midi';
import { sceneConfig } from '@/modules/engine/plugins/scene/config';
import { useEditorCx } from '../EditorCx';
import { deriveInspectorPathState, type TInspectorTarget } from '../lib/inspector-target';
import { canDeleteStraightTrack } from '../lib/scene-ui';
import {
	deriveSceneSelectionInspectorTarget,
	deriveSelectedNoteInspectorTarget
} from '../lib/selection-inspector-target';

export const SelectionInspector: React.FC = () => {
	const runtime = useEditorCx().runtime;
	const app = runtime.app;
	const midiSong = useResource(app, 'midiSong');
	const midiLookup = useResource(app, 'midiLookup');
	const selectedTrackId = useResource(app, 'selectedTrackId');
	const selectedNoteId = useResource(app, 'selectedNoteId');
	const selectedNoteIds = useResource(app, 'selectedNoteIds');
	const sceneSelection = useResource(app, 'sceneSelection');
	const simulationSync = useResource(app, 'simulationSync');
	const deleteEntityId =
		sceneSelection.entityId != null &&
		app.hasComponent(sceneSelection.entityId, app.c.StraightTrackMixin)
			? sceneSelection.entityId
			: null;
	const canDelete = React.useMemo(
		() => deleteEntityId != null && canDeleteStraightTrack(simulationSync.mode),
		[deleteEntityId, simulationSync.mode]
	);
	const handleDelete = React.useCallback(() => {
		if (canDelete && deleteEntityId != null) {
			runtime.deleteStraightTrack(deleteEntityId);
		}
	}, [canDelete, deleteEntityId, runtime]);

	return (
		<section>
			<div className="mb-4 flex items-center justify-between gap-3">
				<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">Inspector</h3>
				{deleteEntityId != null ? (
					<button
						type="button"
						className="border-base-200 text-base-500 hover:bg-base-100 focus-visible:ring-base-300 disabled:border-base-200 disabled:text-base-400 inline-flex h-8 w-8 items-center justify-center rounded-md border transition focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
						disabled={!canDelete}
						aria-label="Delete straight track"
						title="Delete straight track"
						onClick={handleDelete}
					>
						<Trash2 className="h-4 w-4" />
					</button>
				) : null}
			</div>

			<div>
				{selectedNoteId != null ? (
					<SelectedNoteInspectorPanel
						midiSong={midiSong}
						midiLookup={midiLookup}
						selectedTrackId={selectedTrackId}
						selectedNoteId={selectedNoteId}
						selectedNoteCount={selectedNoteIds.size}
						onCreateOrSelectNotePlatform={(noteId) =>
							void runtime.createOrSelectNotePlatform(noteId)
						}
					/>
				) : sceneSelection.entityId != null ? (
					<SceneSelectionInspectorPanel
						midiSong={midiSong}
						midiLookup={midiLookup}
						sceneSelectionEntityId={sceneSelection.entityId}
					/>
				) : (
					<EmptyState message="Select a note, straight track, or marble to inspect it." />
				)}
			</div>
		</section>
	);
};

const SelectedNoteInspectorPanel: React.FC<{
	midiSong: TMidiSong | null;
	midiLookup: TMidiLookup;
	selectedTrackId: number | null;
	selectedNoteId: number;
	selectedNoteCount: number;
	onCreateOrSelectNotePlatform: (noteId: number) => void;
}> = ({
	midiSong,
	midiLookup,
	selectedTrackId,
	selectedNoteId,
	selectedNoteCount,
	onCreateOrSelectNotePlatform
}) => {
	const app = useEditorCx().runtime.app;
	const fixedTimeStepSeconds = useResource(app, 'fixedTimeStepSeconds');
	const trajectoryProjection = useResource(app, 'trajectoryProjection');
	const notePlatforms = useQueryComponents(app, {
		components: [Entity, app.c.NoteBindingMixin] as const,
		queryOrFilter: With(app.c.NotePlatformMixin),
		watchComponents: [app.c.NoteBindingMixin, app.c.NotePlatformMixin]
	});

	const target = React.useMemo(() => {
		return deriveSelectedNoteInspectorTarget({
			midiSong,
			midiLookup,
			selectedTrackId,
			selectedNoteId,
			fixedTimeStepSeconds,
			trajectoryProjection,
			notePlatformByNoteId: new Map(notePlatforms.map(([eid, binding]) => [binding.noteId, eid]))
		});
	}, [
		fixedTimeStepSeconds,
		midiLookup,
		midiSong,
		notePlatforms,
		selectedNoteId,
		selectedTrackId,
		trajectoryProjection
	]);

	if (target.kind === 'empty') {
		return <EmptyState message={target.message} />;
	}

	return (
		<NoteInspector
			target={target}
			selectedNoteCount={selectedNoteCount}
			onCreateOrSelectNotePlatform={onCreateOrSelectNotePlatform}
		/>
	);
};

const SceneSelectionInspectorPanel: React.FC<{
	midiSong: TMidiSong | null;
	midiLookup: TMidiLookup;
	sceneSelectionEntityId: number;
}> = ({ midiSong, midiLookup, sceneSelectionEntityId }) => {
	const runtime = useEditorCx().runtime;
	const app = runtime.app;
	const fixedTimeStepSeconds = useResource(app, 'fixedTimeStepSeconds');
	const trajectoryProjection = useResource(app, 'trajectoryProjection');
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
		components: [Entity, app.c.PositionMixin, app.c.MarblePhysicsMixin] as const,
		queryOrFilter: With(app.c.MarbleTag),
		watchComponents: [app.c.MarbleTag, app.c.PositionMixin, app.c.MarblePhysicsMixin]
	});
	const notePlatforms = useQueryComponents(app, {
		components: [Entity, app.c.NoteBindingMixin, app.c.NotePlatformMixin] as const,
		queryOrFilter: With(app.c.NotePlatformMixin),
		watchComponents: [app.c.NoteBindingMixin, app.c.NotePlatformMixin]
	});

	const target = React.useMemo<TInspectorTarget>(() => {
		return deriveSceneSelectionInspectorTarget({
			midiSong,
			midiLookup,
			sceneSelectionEntityId,
			fixedTimeStepSeconds,
			trajectoryProjection,
			tracks,
			marbles,
			notePlatforms
		});
	}, [
		fixedTimeStepSeconds,
		marbles,
		midiLookup,
		midiSong,
		notePlatforms,
		sceneSelectionEntityId,
		tracks,
		trajectoryProjection
	]);

	if (target.kind === 'empty') {
		return <EmptyState message={target.message} />;
	}
	if (target.kind === 'note-platform') {
		return (
			<NotePlatformInspector
				target={target}
				onLiftChange={(value) =>
					runtime.updateNotePlatform(target.entityId, {
						offsetY: clamp(
							value,
							sceneConfig.notePlatform.limits.offsetY.min,
							sceneConfig.notePlatform.limits.offsetY.max
						)
					})
				}
				onPushChange={(value) =>
					runtime.updateNotePlatform(target.entityId, {
						offsetZ: clamp(
							value,
							sceneConfig.notePlatform.limits.offsetZ.min,
							sceneConfig.notePlatform.limits.offsetZ.max
						)
					})
				}
				onRotationChange={(value) =>
					runtime.updateNotePlatform(target.entityId, {
						rotationX: clamp(
							value,
							sceneConfig.notePlatform.limits.rotationX.min,
							sceneConfig.notePlatform.limits.rotationX.max
						)
					})
				}
				onBounceChange={(value) =>
					runtime.updateNotePlatform(target.entityId, {
						bounce: clamp(
							value,
							sceneConfig.notePlatform.limits.bounce.min,
							sceneConfig.notePlatform.limits.bounce.max
						)
					})
				}
				onCommit={() => runtime.commitSceneEdit()}
			/>
		);
	}
	if (target.kind === 'straight-track') {
		return <StraightTrackInspector target={target} />;
	}
	if (target.kind === 'marble') {
		return (
			<MarbleInspector
				target={target}
				onBounceChange={(value) =>
					runtime.updateMarblePhysics(target.entityId, {
						bounce: clamp(
							value,
							sceneConfig.marble.physics.limits.bounce.min,
							sceneConfig.marble.physics.limits.bounce.max
						)
					})
				}
				onCommit={() => runtime.commitSceneEdit()}
			/>
		);
	}

	return <EmptyState message="Select a note, straight track, or marble to inspect it." />;
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
	<div className="border-base-200 bg-base-0 rounded-lg border px-3 py-3">
		<p className="text-base-500 text-sm leading-5">{message}</p>
	</div>
);

const NoteInspector: React.FC<{
	target: Extract<TInspectorTarget, { kind: 'note' }>;
	selectedNoteCount: number;
	onCreateOrSelectNotePlatform: (noteId: number) => void;
}> = ({ target, selectedNoteCount, onCreateOrSelectNotePlatform }) => (
	<div className="border-base-200 bg-base-0 rounded-lg border px-3 py-3">
		<InspectorTitle title={target.title} subtitle={`${target.noteName} · ${target.trackName}`} />
		{selectedNoteCount > 1 ? (
			<InspectorField label="Selection" value={`${selectedNoteCount} selected`} />
		) : null}
		<InspectorField label="Tick" value={Math.round(target.tick)} mono />
		<InspectorField label="Step" value={target.step} mono />
		<InspectorField label="Duration" value={`${target.durationTicks} ticks`} mono />
		<InspectorField label="Velocity" value={target.velocity} mono />
		<InspectorField label="Channel" value={target.channel} mono />
		<PathStateField step={target.step} position={target.position} />
		{target.position != null ? <Vec3Field label="Position" value={target.position} /> : null}
		{selectedNoteCount === 1 ? (
			<div className="mt-4">
				<button
					type="button"
					className="bg-base-900 text-base-0 disabled:bg-base-200 disabled:text-base-500 w-full rounded-md px-3 py-2 text-sm font-medium"
					disabled={target.notePlatformEntityId == null && target.position == null}
					onClick={() => onCreateOrSelectNotePlatform(target.noteId)}
				>
					{target.notePlatformEntityId == null ? 'Create Note Platform' : 'Select Note Platform'}
				</button>
				{target.notePlatformEntityId == null && target.position == null ? (
					<p className="text-base-500 mt-2 text-xs">
						This note must be within the solved trajectory horizon before a note platform can be
						created.
					</p>
				) : null}
			</div>
		) : null}
	</div>
);

const NotePlatformInspector: React.FC<{
	target: Extract<TInspectorTarget, { kind: 'note-platform' }>;
	onLiftChange: (value: number) => void;
	onPushChange: (value: number) => void;
	onRotationChange: (value: number) => void;
	onBounceChange: (value: number) => void;
	onCommit: () => void;
}> = ({ target, onLiftChange, onPushChange, onRotationChange, onBounceChange, onCommit }) => (
	<div className="border-base-200 bg-base-0 rounded-lg border px-3 py-3">
		<InspectorTitle title={target.title} subtitle={`Entity ${target.entityId}`} />
		<InspectorField label="Note" value={target.noteName} />
		<InspectorField label="Tick" value={Math.round(target.tick)} mono />
		<InspectorField label="Step" value={target.step} mono />
		<PathStateField step={target.step} position={target.position} />
		{target.position != null ? <Vec3Field label="Position" value={target.position} /> : null}
		<SliderField
			label="Lift"
			value={target.offsetY}
			min={sceneConfig.notePlatform.limits.offsetY.min}
			max={sceneConfig.notePlatform.limits.offsetY.max}
			step={0.01}
			onChange={onLiftChange}
			onCommit={onCommit}
		/>
		<SliderField
			label="Push"
			value={target.offsetZ}
			min={sceneConfig.notePlatform.limits.offsetZ.min}
			max={sceneConfig.notePlatform.limits.offsetZ.max}
			step={0.01}
			onChange={onPushChange}
			onCommit={onCommit}
		/>
		<SliderField
			label="Tilt"
			value={target.rotationX}
			min={sceneConfig.notePlatform.limits.rotationX.min}
			max={sceneConfig.notePlatform.limits.rotationX.max}
			step={0.01}
			onChange={onRotationChange}
			onCommit={onCommit}
		/>
		<SliderField
			label="Bounce"
			value={target.bounce}
			min={sceneConfig.notePlatform.limits.bounce.min}
			max={sceneConfig.notePlatform.limits.bounce.max}
			step={0.01}
			onChange={onBounceChange}
			onCommit={onCommit}
		/>
		<InspectorField label="Width" value={target.width.toFixed(2)} mono />
		<InspectorField label="Depth" value={target.length.toFixed(2)} mono />
		<InspectorField label="Thickness" value={target.thickness.toFixed(2)} mono />
		<InspectorColorField label="Color" value={target.color} />
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
	onBounceChange: (value: number) => void;
	onCommit: () => void;
}> = ({ target, onBounceChange, onCommit }) => (
	<div className="border-base-200 bg-base-0 rounded-lg border px-3 py-3">
		<InspectorTitle title={target.title} subtitle={`Entity ${target.entityId}`} />
		<Vec3Field label="Position" value={target.position} />
		<MarbleVelocityField entityId={target.entityId} />
		<SliderField
			label="Bounce"
			value={target.bounce}
			min={sceneConfig.marble.physics.limits.bounce.min}
			max={sceneConfig.marble.physics.limits.bounce.max}
			step={0.01}
			onChange={onBounceChange}
			onCommit={onCommit}
		/>
	</div>
);

const InspectorTitle: React.FC<{
	title: string;
	subtitle: string;
}> = ({ title, subtitle }) => (
	<div className="mb-3">
		<div className="min-w-0">
			<p className="text-base-900 text-sm font-medium">{title}</p>
			<p className="text-base-500 mt-1 text-xs tracking-wide uppercase">{subtitle}</p>
		</div>
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

const MarbleVelocityField: React.FC<{
	entityId: number;
}> = ({ entityId }) => {
	const app = useEditorCx().runtime.app;
	useResource(app, 'liveStep');

	const velocity = app.r.rigidBodies.get(entityId)?.linvel();
	if (velocity == null) {
		return null;
	}

	return <Vec3Field label="Velocity" value={{ x: velocity.x, y: velocity.y, z: velocity.z }} />;
};

const PathStateField: React.FC<{
	step: number;
	position: { x: number; y: number; z: number } | null;
}> = ({ step, position }) => {
	const app = useEditorCx().runtime.app;
	const liveStep = useResource(app, 'liveStep');
	const bufferedStep = useResource(app, 'bufferedStep');
	const pathState = React.useMemo(
		() => deriveInspectorPathState(step, position, liveStep, bufferedStep),
		[bufferedStep, liveStep, position, step]
	);

	return <InspectorField label="Path" value={capitalize(pathState)} />;
};

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

const SliderField: React.FC<{
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (value: number) => void;
	onCommit?: () => void;
}> = ({ label, value, min, max, step, onChange, onCommit }) => (
	<label className="mt-3 block">
		<div className="flex items-baseline justify-between gap-4">
			<span className="text-base-500 text-xs tracking-wide uppercase">{label}</span>
			<span className="text-base-800 font-mono text-sm">{value.toFixed(2)}</span>
		</div>
		<input
			type="range"
			min={min}
			max={max}
			step={step}
			value={value}
			className="mt-1 block w-full"
			onChange={(event) => onChange(Number(event.target.value))}
			onPointerUp={onCommit}
			onPointerCancel={onCommit}
			onBlur={onCommit}
			onKeyUp={onCommit}
		/>
	</label>
);

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
