import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TEngineSystemSet, TVec3 } from '../../types';
import type { TCorePlugin } from '../core/types';
import type { TMidiPlugin } from '../midi';
import type { TPhysicsPlugin } from '../physics/types';
import type { TRenderPlugin } from '../render/types';
import type { TTrajectoryPlugin } from '../trajectory/types';

// MARK: - Plugin

export type TScenePlugin = TPlugin<
	{
		name: 'Scene';
		components: {
			MarbleTag: TCMarbleTag[];
			MarblePhysicsMixin: TCMarblePhysicsMixin[];
			AuthoredTransformMixin: TCAuthoredTransformMixin[];
			StraightTrackMixin: TCStraightTrackMixin[];
			LinearElementMixin: TCLinearElementMixin[];
			NoteBindingMixin: TCNoteBindingMixin[];
			NotePlatformMixin: TCNotePlatformMixin[];
		};
		resources: {
			sceneSelection: TSceneSelection;
			sceneEditState: TSceneEditState;
			sceneManipulationState: TSceneManipulationState;
			sceneManipulationConfig: TSceneManipulationConfig;
			sceneManipulationHandles: TSceneManipulationHandles;
		};
		appExtensions: {
			disposeScene(): void;
			createStraightTrack(): number | null;
			deleteStraightTrack(entityId: number): boolean;
			createOrSelectNotePlatform(noteId: number): number | null;
			updateNotePlatform(entityId: number, patch: Partial<TCNotePlatformMixin>): boolean;
			updateMarblePhysics(entityId: number, patch: Partial<TCMarblePhysicsMixin>): boolean;
			setSceneEditPending(pending: boolean): void;
		};
		systemSets: TEngineSystemSet;
	},
	[TDefaultPlugin, TCorePlugin, TMidiPlugin, TPhysicsPlugin, TRenderPlugin, TTrajectoryPlugin]
>;

export type TSceneApp = TApp<
	TAppContext<
		[
			TDefaultPlugin,
			TCorePlugin,
			TMidiPlugin,
			TPhysicsPlugin,
			TRenderPlugin,
			TTrajectoryPlugin,
			TScenePlugin
		]
	>
>;

export interface TCAuthoredTransformMixin {
	position: TVec3;
	rotation: TVec3;
	scale: TVec3;
}

export interface TCMarbleTag {}

export interface TCMarblePhysicsMixin {
	bounce: number;
}

export interface TCStraightTrackMixin {
	height: number;
	width: number;
	channelWidth: number;
	channelDepth: number;
	color: string;
}

export interface TCLinearElementMixin {
	length: number;
	minLength: number;
	maxLength: number;
	handleOffset: number;
}

export interface TCNoteBindingMixin {
	noteId: number;
}

export interface TCNotePlatformMixin {
	offsetY: number;
	offsetZ: number;
	rotationX: number;
	length: number;
	width: number;
	thickness: number;
	bounce: number;
	color: string;
}

export interface TSceneSelection {
	entityId: number | null;
}

export interface TSceneEditState {
	pending: boolean;
}

export interface TSceneManipulationState {
	mode: 'idle' | 'move' | 'resizeStart' | 'resizeEnd';
	entityId: number | null;
	isDragging: boolean;
	didEdit: boolean;
	pointerDownClient: { x: number; y: number } | null;
	dragPlaneX: number | null;
	dragOffset: TVec3 | null;
}

export interface TSceneManipulationConfig {
	handleRadius: number;
	handleColor: string;
	dragStartPixels: number;
}

export interface TSceneManipulationHandles {
	start: THREE.Mesh;
	end: THREE.Mesh;
}
