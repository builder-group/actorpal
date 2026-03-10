import { Entity, type TApp, type TAppContext, type TDefaultPlugin, type TPlugin } from 'ecsify';

export function createCorePlugin(): TCorePlugin {
	return {
		name: 'Core',
		deps: ['Default'],
		components: {
			Rotation: { x: [], y: [], z: [] },
			RotationSpeed: { x: [], y: [], z: [] }
		},
		resources: {
			elapsedSeconds: 0
		},
		setup(app: TApp<TAppContext<[TDefaultPlugin, TCorePlugin]>>) {
			app.addSystem(rotationSystem, { set: 'Update' });
		}
	};
}

export type TCorePlugin = TPlugin<
	{
		name: 'Core';
		components: {
			Rotation: TCRotation;
			RotationSpeed: TCRotationSpeed;
		};
		resources: {
			elapsedSeconds: number;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin]
>;

type TCRotation = { x: number[]; y: number[]; z: number[] };
type TCRotationSpeed = { x: number[]; y: number[]; z: number[] };

// MARK: - Systems

function rotationSystem(app: TApp<TAppContext<[TDefaultPlugin, TCorePlugin]>>, dt = 0) {
	app.r.elapsedSeconds += dt;

	for (const [eid, rotation, speed] of app.queryComponents([
		Entity,
		app.c.Rotation,
		app.c.RotationSpeed
	] as const)) {
		app.updateComponent(eid, app.c.Rotation, {
			x: rotation.x + speed.x * dt,
			y: rotation.y + speed.y * dt,
			z: rotation.z + speed.z * dt
		});
	}
}
