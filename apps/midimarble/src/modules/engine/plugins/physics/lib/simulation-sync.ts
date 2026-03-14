import type { TPhysicsApp } from '../types';
import { updateTransport } from '../../transport';
import { getTransportTargetStep } from './transport-step';
import { createEditedWorldBase, ensureSimulationBaseInitialized } from './world';

export function markSimulationDirty(app: TPhysicsApp): void {
	ensureSimulationBaseInitialized(app);

	const currentSync = app.r.simulationSync;
	const resumeWhenReady =
		currentSync.mode === 'idle'
			? app.r.transport.mode === 'running'
			: currentSync.resumeWhenReady;

	if (currentSync.mode === 'rebuilding') {
		currentSync.world.free();
	}

	app.r.preloadWorld?.free();
	app.updateResource('preloadWorld', null);
	app.updateResource('preloadStep', getTransportTargetStep(app));
	app.updateResource('simulationSync', {
		mode: 'dirty',
		resumeWhenReady,
		requested: false
	});
	updateTransport(app, { mode: 'paused' });
	app.updateResource('bufferedStep', 0);
}

export function requestSimulationSync(app: TPhysicsApp): void {
	if (app.r.simulationSync.mode !== 'dirty') {
		return;
	}

	app.updateResource('simulationSync', {
		...app.r.simulationSync,
		requested: true
	});
}

export function startSimulationSync(app: TPhysicsApp): void {
	const simulationSync = app.r.simulationSync;
	if (simulationSync.mode !== 'dirty' || !simulationSync.requested) {
		return;
	}

	const rebuiltWorld = createEditedWorldBase(app);
	if (rebuiltWorld == null) {
		return;
	}

	app.updateResource('simulationSync', {
		mode: 'rebuilding',
		targetStep: getTransportTargetStep(app),
		currentStep: 0,
		resumeWhenReady: simulationSync.resumeWhenReady,
		world: rebuiltWorld,
		checkpointStore: new Map([[0, rebuiltWorld.takeSnapshot()]])
	});
}
