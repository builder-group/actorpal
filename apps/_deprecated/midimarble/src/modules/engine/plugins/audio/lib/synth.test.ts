import { afterEach, describe, expect, it, vi } from 'vitest';
import { playTrackNotes, previewSelectedTrackNote, stopAllVoices } from './synth';

const toneState = vi.hoisted(() => ({
	players: [] as Array<{
		voiceName: string;
		options: unknown;
		connect: ReturnType<typeof vi.fn>;
		triggerAttackRelease: ReturnType<typeof vi.fn>;
		releaseAll: ReturnType<typeof vi.fn>;
		dispose: ReturnType<typeof vi.fn>;
	}>,
	rawContext: null as unknown
}));

vi.mock('./tone-runtime', () => {
	class FakePolySynth {
		public readonly voiceName: string;
		public readonly options: unknown;
		public connect = vi.fn(() => this);
		public triggerAttackRelease = vi.fn();
		public releaseAll = vi.fn();
		public dispose = vi.fn();

		constructor(voice?: { name?: string }, options?: unknown) {
			this.voiceName = voice?.name ?? 'unknown';
			this.options = options;
			toneState.players.push(this);
		}
	}

	class FakeSynth {}
	class FakeFMSynth {}
	class FakeAMSynth {}
	class FakeMonoSynth {}

	return {
		PolySynth: FakePolySynth,
		Synth: FakeSynth,
		FMSynth: FakeFMSynth,
		AMSynth: FakeAMSynth,
		MonoSynth: FakeMonoSynth,
		getContext: vi.fn(() => ({ rawContext: toneState.rawContext })),
		setContext: vi.fn((context: { rawContext?: unknown }) => {
			toneState.rawContext = 'rawContext' in context ? context.rawContext : context;
		})
	};
});

describe('audio synth helpers', () => {
	afterEach(() => {
		toneState.players.length = 0;
		toneState.rawContext = null;
		vi.useRealTimers();
	});

	it('preserves note offsets within a processed tick range', () => {
		vi.useFakeTimers();

		const state = createAudioState();

		playTrackNotes(
			state,
			{ bpm: 120, ticksPerBeat: 480 },
			[
				{ id: 1, tick: 8, durationTicks: 120, noteNumber: 60, velocity: 100, channel: 0 },
				{ id: 2, tick: 12, durationTicks: 120, noteNumber: 62, velocity: 90, channel: 0 }
			],
			8,
			'lead'
		);

		const player = toneState.players[0];
		expect(player?.voiceName).toBe('FakeMonoSynth');
		expect(player?.triggerAttackRelease.mock.calls[0]?.[2]).toBe(10);
		expect(player?.triggerAttackRelease.mock.calls[1]?.[2]).toBeCloseTo(10 + 4 / 960, 6);

		stopAllVoices(state);
	});

	it('previews a selected note for its full duration instead of a fixed cap', () => {
		const state = createAudioState();

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
			},
			'bell'
		);

		const player = toneState.players[0];
		expect(player?.voiceName).toBe('FakeFMSynth');
		expect(player?.triggerAttackRelease.mock.calls[0]?.[1]).toBeCloseTo(6.25, 6);

		stopAllVoices(state);
	});

	it('releases and disposes instantiated players when voices are stopped', () => {
		const state = createAudioState();

		playTrackNotes(
			state,
			{ bpm: 120, ticksPerBeat: 480 },
			[{ id: 1, tick: 0, durationTicks: 120, noteNumber: 60, velocity: 100, channel: 0 }],
			0,
			'classic'
		);

		const player = toneState.players[0];
		stopAllVoices(state);

		expect(player?.releaseAll).toHaveBeenCalledOnce();
		expect(player?.dispose).toHaveBeenCalledOnce();
		expect(state.activeVoices.size).toBe(0);
		expect(state.instrumentPlayers).toEqual({});
	});
});

function createAudioState() {
	const context = {
		currentTime: 10,
		state: 'running'
	} as AudioContext;
	const masterGain = new FakeGainNode() as unknown as GainNode;

	toneState.rawContext = context;

	return {
		context,
		masterGain,
		isEnabled: true,
		lastProcessedTick: 0,
		lastMode: 'paused' as const,
		activeVoices: new Map(),
		instrumentPlayers: {}
	};
}

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
