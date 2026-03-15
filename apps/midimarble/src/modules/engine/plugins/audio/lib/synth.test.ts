import { afterEach, describe, expect, it, vi } from 'vitest';
import { playTrackNotes, previewSelectedTrackNote, stopAllVoices } from './synth';

describe('audio synth helpers', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('preserves note offsets within a processed tick range', () => {
		vi.useFakeTimers();

		const oscillators: FakeOscillatorNode[] = [];
		const context = new FakeAudioContext(oscillators);
		const state = {
			context: context as unknown as AudioContext,
			masterGain: context.createGain() as unknown as GainNode,
			isEnabled: true,
			lastProcessedTick: 0,
			lastMode: 'paused' as const,
			activeVoices: new Map()
		};

		playTrackNotes(
			state,
			{ bpm: 120, ticksPerBeat: 480 },
			[
				{ id: 1, tick: 8, durationTicks: 120, noteNumber: 60, velocity: 100, channel: 0 },
				{ id: 2, tick: 12, durationTicks: 120, noteNumber: 62, velocity: 90, channel: 0 }
			],
			8
		);

		expect(oscillators).toHaveLength(2);
		expect(oscillators[0]?.start).toHaveBeenCalledWith(10);
		expect(oscillators[1]?.start).toHaveBeenCalledWith(10 + 4 / 960);

		stopAllVoices(state);
	});

	it('previews a selected note for its full duration instead of a fixed cap', () => {
		const oscillators: FakeOscillatorNode[] = [];
		const context = new FakeAudioContext(oscillators);
		const state = {
			context: context as unknown as AudioContext,
			masterGain: context.createGain() as unknown as GainNode,
			isEnabled: true,
			lastProcessedTick: 0,
			lastMode: 'paused' as const,
			activeVoices: new Map()
		};

		previewSelectedTrackNote(
			state,
			{ bpm: 120, ticksPerBeat: 480 },
			{
				id: 1,
				tick: 0,
				durationTicks: 6000,
				noteNumber: 60,
				velocity: 100,
				channel: 0
			}
		);

		expect(oscillators).toHaveLength(1);
		expect(oscillators[0]?.stop.mock.calls[0]?.[0]).toBeCloseTo(16.33, 6);

		stopAllVoices(state);
	});
});

class FakeGainNode {
	public readonly gain = {
		value: 0,
		setValueAtTime: vi.fn(),
		cancelScheduledValues: vi.fn(),
		linearRampToValueAtTime: vi.fn()
	};

	public connect = vi.fn();
	public disconnect = vi.fn();
}

class FakeOscillatorNode {
	public type = 'triangle';
	public readonly frequency = { value: 0 };
	public connect = vi.fn();
	public disconnect = vi.fn();
	public start = vi.fn();
	public stop = vi.fn();
}

class FakeAudioContext {
	public readonly destination = {};
	public readonly currentTime = 10;
	public readonly state = 'running';

	constructor(private readonly _oscillators: FakeOscillatorNode[]) {}

	public createGain(): FakeGainNode {
		return new FakeGainNode();
	}

	public createOscillator(): FakeOscillatorNode {
		const oscillator = new FakeOscillatorNode();
		this._oscillators.push(oscillator);
		return oscillator;
	}
}
