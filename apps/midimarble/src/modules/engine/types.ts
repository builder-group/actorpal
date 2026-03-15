export interface TVec3 {
	x: number;
	y: number;
	z: number;
}

export type TEngineSystemSet = 'First' | 'PreUpdate' | 'Update' | 'PostUpdate' | 'Last' | 'Flush';

export const ENGINE_SYSTEM_SETS = [
	'First',
	'PreUpdate',
	'Update',
	'PostUpdate',
	'Last',
	'Flush'
] as const satisfies readonly TEngineSystemSet[];
