import { Added, Changed, Entity, Or } from 'ecsify';
import * as THREE from 'three';
import { createStraightTrackColliders, createStraightTrackGeometry } from './bundles';
import { getLinearElement, getLinearElementHandlePositions } from './lib/linear-element';
import { updateHandleAppearance } from './lib/manipulation-handles';
import { clearSceneEntitySelection } from './lib/scene-selection';
import { sameVec3 } from './lib/vec3';
import type { TSceneApp } from './types';

export function syncAuthoredTransformsToLiveSystem(app: TSceneApp) {
	for (const [eid, authoredTransform, position, rotation, scale] of app.queryComponents(
		[
			Entity,
			app.c.AuthoredTransformMixin,
			app.c.PositionMixin,
			app.c.RotationMixin,
			app.c.ScaleMixin
		] as const,
		Or(Added(app.c.AuthoredTransformMixin), Changed(app.c.AuthoredTransformMixin))
	)) {
		if (!sameVec3(position, authoredTransform.position)) {
			app.updateComponent(eid, app.c.PositionMixin, { ...authoredTransform.position });
		}
		if (!sameVec3(rotation, authoredTransform.rotation)) {
			app.updateComponent(eid, app.c.RotationMixin, { ...authoredTransform.rotation });
		}
		if (!sameVec3(scale, authoredTransform.scale)) {
			app.updateComponent(eid, app.c.ScaleMixin, { ...authoredTransform.scale });
		}
	}
}

export function syncStraightTrackRuntimeMixinsSystem(app: TSceneApp) {
	for (const [eid, mesh, linear, track] of app.queryComponents(
		[Entity, app.c.MeshMixin, app.c.LinearElementMixin, app.c.StraightTrackMixin] as const,
		Or(
			Added(app.c.StraightTrackMixin),
			Changed(app.c.StraightTrackMixin),
			Added(app.c.LinearElementMixin),
			Changed(app.c.LinearElementMixin)
		)
	)) {
		if (mesh.type === 'three' && mesh.object instanceof THREE.Mesh) {
			mesh.object.geometry.dispose();
			mesh.object.geometry = createStraightTrackGeometry({ ...track, length: linear.length });

			const material = mesh.object.material;
			if (Array.isArray(material)) {
				for (const entry of material) {
					if ('color' in entry) {
						entry.color.set(track.color);
					}
				}
			} else if (material instanceof THREE.MeshStandardMaterial) {
				material.color.set(track.color);
			}
		}

		app.updateComponent(eid, app.c.ColliderMixin, {
			descriptors: createStraightTrackColliders({ ...track, length: linear.length })
		});
	}
}

export function syncSceneManipulationHandlesSystem(app: TSceneApp) {
	const selection = app.r.sceneSelection;
	const handles = app.r.sceneManipulationHandles;

	if (selection.entityId == null) {
		handles.start.visible = false;
		handles.end.visible = false;
		return;
	}

	const linearElement = getLinearElement(app, selection.entityId);
	if (linearElement == null) {
		handles.start.visible = false;
		handles.end.visible = false;
		return;
	}

	const handlePositions = getLinearElementHandlePositions(
		linearElement.transform.position,
		linearElement.transform.rotation.x,
		linearElement.linear.length,
		linearElement.linear.handleOffset
	);

	handles.start.position.copy(handlePositions.start);
	handles.end.position.copy(handlePositions.end);
	handles.start.visible = true;
	handles.end.visible = true;
}

export function syncSceneManipulationHandleAppearanceSystem(app: TSceneApp) {
	if (!app.wasResourceChanged('sceneManipulationConfig')) {
		return;
	}

	updateHandleAppearance(
		app.r.sceneManipulationHandles.start,
		app.r.sceneManipulationConfig.handleRadius,
		app.r.sceneManipulationConfig.handleColor
	);
	updateHandleAppearance(
		app.r.sceneManipulationHandles.end,
		app.r.sceneManipulationConfig.handleRadius,
		app.r.sceneManipulationConfig.handleColor
	);
}

export function syncExclusiveSelectionSystem(app: TSceneApp) {
	if (app.r.selectedNoteId == null || app.r.sceneSelection.entityId == null) {
		return;
	}

	clearSceneEntitySelection(app);
}
