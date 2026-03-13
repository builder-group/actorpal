import type { TPhysicsApp } from '../types';

export function updateSimulationTransport(
	app: TPhysicsApp,
	patch: Partial<TPhysicsApp['r']['simulationTransport']>
): void {
	app.updateResource('simulationTransport', {
		...app.r.simulationTransport,
		...patch
	});
}
