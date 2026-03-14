import { describe, expect, it } from 'vitest';
import { clampPlayheadStep } from './playhead-step';

describe('clampPlayheadStep', () => {
	it('clamps to the buffered step horizon', () => {
		expect(clampPlayheadStep(9, 4)).toBe(4);
	});

	it('clamps negative steps to zero', () => {
		expect(clampPlayheadStep(-2, 4)).toBe(0);
	});

	it('rounds fractional steps before clamping', () => {
		expect(clampPlayheadStep(2.6, 8)).toBe(3);
	});
});
