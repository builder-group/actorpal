export function sameVec3(
	a: { x: number; y: number; z: number },
	b: { x: number; y: number; z: number }
): boolean {
	return Math.abs(a.x - b.x) < 1e-5 && Math.abs(a.y - b.y) < 1e-5 && Math.abs(a.z - b.z) < 1e-5;
}
