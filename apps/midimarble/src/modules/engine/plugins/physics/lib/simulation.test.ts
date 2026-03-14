import { describe, expect, it, vi } from 'vitest';
import { replaceLiveWorld } from './simulation';

describe('replaceLiveWorld', () => {
	it('drops stale rigid-body handles that do not exist in the restored world', () => {
		const liveBody = { handle: 10 };
		const staleBody = { handle: 99 };
		const liveCollider = { handle: 20 };
		const staleCollider = { handle: 88 };
		const restoredBody = { handle: 10, kind: 'restored' };
		const restoredCollider = { handle: 20, kind: 'restored' };
		const oldWorld = { free: vi.fn() };
		const newWorld = {
			getRigidBody: vi.fn((handle: number) => (handle === 10 ? restoredBody : null)),
			getCollider: vi.fn((handle: number) => (handle === 20 ? restoredCollider : null))
		};
		const updateResource = vi.fn();
		const app = {
			r: {
				world: oldWorld,
				rigidBodies: new Map([
					[1, liveBody],
					[2, staleBody]
				]),
				colliders: new Map([
					[1, [liveCollider]],
					[2, [staleCollider]]
				])
			},
			updateResource
		} as unknown as Parameters<typeof replaceLiveWorld>[0];

		replaceLiveWorld(app, newWorld as unknown as Parameters<typeof replaceLiveWorld>[1]);

		const rigidBodies = updateResource.mock.calls.find((call) => call[0] === 'rigidBodies')?.[1];
		const colliders = updateResource.mock.calls.find((call) => call[0] === 'colliders')?.[1];

		expect(rigidBodies.get(1)).toBe(restoredBody);
		expect(rigidBodies.has(2)).toBe(false);
		expect(colliders.get(1)).toEqual([restoredCollider]);
		expect(colliders.has(2)).toBe(false);
		expect(updateResource).toHaveBeenCalledWith('world', newWorld);
		expect(oldWorld.free).toHaveBeenCalledOnce();
	});

	it('installs rebuilt fixed-body handles atomically during world swap', () => {
		const liveBody = { handle: 10 };
		const liveCollider = { handle: 20 };
		const rebuiltFixedBody = { handle: 71, kind: 'fixed' } as unknown as Parameters<
			typeof replaceLiveWorld
		>[0]['r']['rigidBodies'] extends Map<number, infer TBody> ? TBody : never;
		const rebuiltFixedCollider = { handle: 72, kind: 'fixed' } as unknown as Parameters<
			typeof replaceLiveWorld
		>[0]['r']['colliders'] extends Map<number, infer TColliderArray>
			? TColliderArray extends Array<infer TCollider>
				? TCollider
				: never
			: never;
		const restoredBody = { handle: 10, kind: 'restored-dynamic' };
		const restoredCollider = { handle: 20, kind: 'restored-dynamic' };
		const oldWorld = { free: vi.fn() };
		const newWorld = {
			getRigidBody: vi.fn((handle: number) => (handle === 10 ? restoredBody : null)),
			getCollider: vi.fn((handle: number) => (handle === 20 ? restoredCollider : null))
		};
		const updateResource = vi.fn();
		const app = {
			r: {
				world: oldWorld,
				rigidBodies: new Map<number, { handle: number }>([
					[1, liveBody],
					[7, { handle: 70 }]
				]),
				colliders: new Map<number, { handle: number }[]>([
					[1, [liveCollider]],
					[7, [{ handle: 73 }]]
				])
			},
			updateResource
		} as unknown as Parameters<typeof replaceLiveWorld>[0];

		replaceLiveWorld(
			app,
			newWorld as unknown as Parameters<typeof replaceLiveWorld>[1],
			{
				rigidBodies: new Map([[7, rebuiltFixedBody]]),
				colliders: new Map([[7, [rebuiltFixedCollider]]])
			}
		);

		const rigidBodies = updateResource.mock.calls.find(
			(call) => call[0] === 'rigidBodies'
		)?.[1];
		const colliders = updateResource.mock.calls.find(
			(call) => call[0] === 'colliders'
		)?.[1];

		expect(rigidBodies.get(1)).toBe(restoredBody);
		expect(rigidBodies.get(7)).toBe(rebuiltFixedBody);
		expect(colliders.get(1)).toEqual([restoredCollider]);
		expect(colliders.get(7)).toEqual([rebuiltFixedCollider]);
		expect(app.updateResource).toHaveBeenCalledWith('world', newWorld);
		expect(oldWorld.free).toHaveBeenCalledOnce();
	});
});
