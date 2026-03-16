import type { TSimulationSync } from '@/modules/engine/plugins/physics';
import type { TInspectorTarget } from './inspector-target';

export function canCreateStraightTrack(
	previewEnabled: boolean,
	simulationSyncMode: TSimulationSync['mode']
): boolean {
	return !previewEnabled && simulationSyncMode === 'idle';
}

export function canDeleteStraightTrack(simulationSyncMode: TSimulationSync['mode']): boolean {
	return simulationSyncMode === 'idle';
}

export function getInspectorDeleteEntityId(target: TInspectorTarget): number | null {
	return target.kind === 'straight-track' ? target.entityId : null;
}
