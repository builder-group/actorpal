import { createApp, createDefaultPlugin } from 'ecsify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENGINE_SYSTEM_SETS } from '../../types';
import { createMidiPlugin } from '../midi';
import { createTransportPlugin } from '../transport';
import { createAudioPlugin } from './audio-plugin';

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

vi.mock('./lib/tone-runtime', () => {
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

const SONG = {
	name: 'Demo',
	bpm: 120,
	ticksPerBeat: 480,
	totalTicks: 960,
	tracks: [
		{
			id: 0,
			name: 'Lead',
			notes: [
				{ id: 1, tick: 0, durationTicks: 120, noteNumber: 60, velocity: 100, channel: 0 },
				{ id: 2, tick: 8, durationTicks: 120, noteNumber: 62, velocity: 90, channel: 0 }
			]
		}
	]
} as const;

describe('audio plugin', () => {
	afterEach(() => {
		toneState.players.length = 0;
		toneState.rawContext = null;
		Reflect.deleteProperty(globalThis, 'AudioContext');
		vi.useRealTimers();
	});

	it('creates and resumes the audio context once across concurrent calls', async () => {
		const deferred = createDeferred<void>();
		const resume = vi.fn(() => deferred.promise);
		let createCount = 0;

		class FakeAudioContext {
			public readonly destination = {};
			public readonly currentTime = 0;
			public readonly state = 'running';

			constructor() {
				createCount += 1;
			}

			public createGain = vi.fn(() => new FakeGainNode());
			public resume = resume;
			public close = vi.fn(async () => undefined);
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createAudioHarness();

		const first = app.resumeAudio();
		const second = app.resumeAudio();
		deferred.resolve();
		await Promise.all([first, second]);

		expect(app.r.audioState.context).not.toBeNull();
		expect(createCount).toBe(1);
		expect(resume).toHaveBeenCalledOnce();
	});

	it('keeps only the latest preview request after async audio init', async () => {
		const deferred = createDeferred<void>();

		class FakeAudioContext {
			public readonly destination = {};
			public readonly currentTime = 0;
			public readonly state = 'running';
			public createGain = vi.fn(() => new FakeGainNode());
			public resume = vi.fn(() => deferred.promise);
			public close = vi.fn(async () => undefined);
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createAudioHarness();
		app.updateResource('midiSong', SONG as never);
		app.updateResource('selectedTrackId', 0);

		const first = app.previewNotesAtTick(0);
		const second = app.previewNotesAtTick(8);
		deferred.resolve();
		await Promise.all([first, second]);

		expect(app.r.audioState.lastProcessedTick).toBe(8);
		expect([...app.r.audioState.activeVoices.keys()]).toEqual([2]);
		expect(app.r.audioPlaybackFeedback.activeNoteIds).toEqual(new Set([2]));
		expect(app.r.audioPlaybackFeedback.activeNoteNumbers).toEqual(new Set([62]));
	});

	it('uses the bell preset by default and track overrides for preview', async () => {
		Object.defineProperty(globalThis, 'AudioContext', {
			value: createFakeAudioContextClass(),
			configurable: true,
			writable: true
		});

		const app = createAudioHarness();
		app.updateResource('midiSong', SONG as never);
		app.updateResource('selectedTrackId', 0);

		await app.previewMidiNote(65);
		expect(toneState.players.at(-1)?.voiceName).toBe('FakeFMSynth');

		app.setTrackInstrument(0, 'lead');
		await app.previewMidiNote(65);
		expect(toneState.players.at(-1)?.voiceName).toBe('FakeMonoSynth');
	});

	it('stops ringing voices when the track instrument changes', async () => {
		Object.defineProperty(globalThis, 'AudioContext', {
			value: createFakeAudioContextClass(),
			configurable: true,
			writable: true
		});

		const app = createAudioHarness();
		app.updateResource('midiSong', SONG as never);
		app.updateResource('selectedTrackId', 0);

		await app.previewMidiNote(65);
		const player = toneState.players.at(-1);

		app.setTrackInstrument(0, 'lead');

		expect(player?.dispose).toHaveBeenCalledOnce();
		expect(app.r.audioState.activeVoices.size).toBe(0);
		expect(app.r.audioPlaybackFeedback.activeNoteNumbers).toEqual(new Set());
		expect(app.r.audioSettings.trackInstrumentIds).toEqual({ 0: 'lead' });
	});

	it('uses the selected preset during playback after transport advances', async () => {
		Object.defineProperty(globalThis, 'AudioContext', {
			value: createFakeAudioContextClass(),
			configurable: true,
			writable: true
		});

		const app = createAudioHarness();
		app.updateResource('midiSong', SONG as never);
		app.updateResource('selectedTrackId', 0);
		app.setTrackInstrument(0, 'lead');

		await app.resumeAudio();
		app.update(0);
		app.updateResource('transport', { mode: 'running', playheadTick: 8 } as never);
		app.update(0);

		const player = toneState.players.at(-1);
		expect(player?.voiceName).toBe('FakeMonoSynth');
		expect(player?.triggerAttackRelease).toHaveBeenCalled();
	});

	it('previews a selected note by id with its own playback feedback', async () => {
		Object.defineProperty(globalThis, 'AudioContext', {
			value: createFakeAudioContextClass(),
			configurable: true,
			writable: true
		});

		const app = createAudioHarness();
		app.updateResource('midiSong', SONG as never);
		app.updateResource('selectedTrackId', 0);

		await app.previewNote(2);

		expect(app.r.audioState.lastProcessedTick).toBe(8);
		expect([...app.r.audioState.activeVoices.keys()]).toEqual([2]);
		expect(app.r.audioPlaybackFeedback.activeNoteIds).toEqual(new Set([2]));
		expect(app.r.audioPlaybackFeedback.activeNoteNumbers).toEqual(new Set([62]));
	});

	it('expires playback feedback after the tap window', async () => {
		vi.useFakeTimers();

		Object.defineProperty(globalThis, 'AudioContext', {
			value: createFakeAudioContextClass(),
			configurable: true,
			writable: true
		});

		const app = createAudioHarness();
		app.updateResource('midiSong', SONG as never);
		app.updateResource('selectedTrackId', 0);

		await app.previewNotesAtTick(0);
		expect(app.r.audioPlaybackFeedback.activeNoteIds).toEqual(new Set([1]));

		vi.setSystemTime(Date.now() + 121);
		app.update(0);

		expect(app.r.audioPlaybackFeedback.activeNoteIds).toEqual(new Set());
		expect(app.r.audioPlaybackFeedback.activeNoteNumbers).toEqual(new Set());
	});

	it('resets audio state on dispose so the graph can be rebuilt later', async () => {
		let createCount = 0;

		class FakeAudioContext {
			public readonly destination = {};
			public readonly currentTime = 0;
			public readonly state = 'running';

			constructor() {
				createCount += 1;
			}

			public createGain = vi.fn(() => new FakeGainNode());
			public resume = vi.fn(async () => undefined);
			public close = vi.fn(async () => undefined);
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createAudioHarness();

		await app.resumeAudio();
		const firstContext = app.r.audioState.context;
		app.disposeAudio();

		expect(app.r.audioState).toMatchObject({
			context: null,
			masterGain: null,
			isEnabled: false,
			lastProcessedTick: 0,
			lastMode: 'paused'
		});

		await app.resumeAudio();

		expect(app.r.audioState.context).not.toBeNull();
		expect(app.r.audioState.context).not.toBe(firstContext);
		expect(createCount).toBe(2);
	});

	it('ignores an in-flight resume after dispose', async () => {
		const deferred = createDeferred<void>();

		class FakeAudioContext {
			public readonly destination = {};
			public readonly currentTime = 0;
			public readonly state = 'running';
			public createGain = vi.fn(() => new FakeGainNode());
			public resume = vi.fn(() => deferred.promise);
			public close = vi.fn(async () => undefined);
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createAudioHarness();

		const pendingResume = app.resumeAudio();
		app.disposeAudio();
		deferred.resolve();
		await pendingResume;

		expect(app.r.audioState).toMatchObject({
			context: null,
			masterGain: null,
			isEnabled: false,
			lastProcessedTick: 0,
			lastMode: 'paused'
		});
	});
});

function createAudioHarness() {
	return createApp({
		plugins: [
			createDefaultPlugin(),
			createMidiPlugin(),
			createTransportPlugin(),
			createAudioPlugin()
		] as const,
		systemSets: [...ENGINE_SYSTEM_SETS]
	});
}

function createFakeAudioContextClass() {
	return class FakeAudioContext {
		public readonly destination = {};
		public readonly currentTime = 0;
		public readonly state = 'running';
		public createGain = vi.fn(() => new FakeGainNode());
		public resume = vi.fn(async () => undefined);
		public close = vi.fn(async () => undefined);
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

function createDeferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((nextResolve, nextReject) => {
		resolve = nextResolve;
		reject = nextReject;
	});

	return { promise, resolve, reject };
}
