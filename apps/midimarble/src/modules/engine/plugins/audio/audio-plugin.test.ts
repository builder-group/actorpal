import { createApp, createDefaultPlugin } from 'ecsify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENGINE_SYSTEM_SETS } from '../../types';
import { createMidiPlugin } from '../midi';
import { createTransportPlugin } from '../transport';
import { createAudioPlugin } from './audio-plugin';

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
		Reflect.deleteProperty(globalThis, 'AudioContext');
		vi.useRealTimers();
	});

	it('creates and resumes the audio context once across concurrent calls', async () => {
		const deferred = createDeferred<void>();
		const resume = vi.fn(() => deferred.promise);
		let createCount = 0;

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
			public readonly currentTime = 0;

			constructor() {
				createCount += 1;
			}

			public createGain = vi.fn(() => new FakeGainNode());
			public createOscillator = vi.fn(() => new FakeOscillatorNode());
			public resume = resume;
			public close = vi.fn(async () => undefined);
			public readonly state = 'running';
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createApp({
			plugins: [
				createDefaultPlugin(),
				createMidiPlugin(),
				createTransportPlugin(),
				createAudioPlugin()
			] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

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
			public readonly currentTime = 0;
			public readonly state = 'running';
			public createGain = vi.fn(() => new FakeGainNode());
			public createOscillator = vi.fn(() => new FakeOscillatorNode());
			public resume = vi.fn(() => deferred.promise);
			public close = vi.fn(async () => undefined);
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createApp({
			plugins: [
				createDefaultPlugin(),
				createMidiPlugin(),
				createTransportPlugin(),
				createAudioPlugin()
			] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

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
		app.disposeAudio();
	});

	it('previews a selected note by id with its own playback feedback', async () => {
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
			public readonly currentTime = 0;
			public readonly state = 'running';
			public createGain = vi.fn(() => new FakeGainNode());
			public createOscillator = vi.fn(() => new FakeOscillatorNode());
			public resume = vi.fn(async () => undefined);
			public close = vi.fn(async () => undefined);
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createApp({
			plugins: [
				createDefaultPlugin(),
				createMidiPlugin(),
				createTransportPlugin(),
				createAudioPlugin()
			] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

		app.updateResource('midiSong', SONG as never);
		app.updateResource('selectedTrackId', 0);

		await app.previewNote(2);

		expect(app.r.audioState.lastProcessedTick).toBe(8);
		expect([...app.r.audioState.activeVoices.keys()]).toEqual([2]);
		expect(app.r.audioPlaybackFeedback.activeNoteIds).toEqual(new Set([2]));
		expect(app.r.audioPlaybackFeedback.activeNoteNumbers).toEqual(new Set([62]));
	});

	it('previews a piano key by note number with key-only playback feedback', async () => {
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
			public readonly currentTime = 0;
			public readonly state = 'running';
			public createGain = vi.fn(() => new FakeGainNode());
			public createOscillator = vi.fn(() => new FakeOscillatorNode());
			public resume = vi.fn(async () => undefined);
			public close = vi.fn(async () => undefined);
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createApp({
			plugins: [
				createDefaultPlugin(),
				createMidiPlugin(),
				createTransportPlugin(),
				createAudioPlugin()
			] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

		app.updateResource('midiSong', SONG as never);
		app.updateResource('selectedTrackId', 0);

		await app.previewMidiNote(65);

		expect(app.r.audioPlaybackFeedback.activeNoteIds).toEqual(new Set());
		expect(app.r.audioPlaybackFeedback.activeNoteNumbers).toEqual(new Set([65]));
		expect(app.r.audioState.activeVoices.size).toBe(1);
	});

	it('expires playback feedback after the tap window', async () => {
		vi.useFakeTimers();

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
			public readonly currentTime = 0;
			public readonly state = 'running';
			public createGain = vi.fn(() => new FakeGainNode());
			public createOscillator = vi.fn(() => new FakeOscillatorNode());
			public resume = vi.fn(async () => undefined);
			public close = vi.fn(async () => undefined);
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createApp({
			plugins: [
				createDefaultPlugin(),
				createMidiPlugin(),
				createTransportPlugin(),
				createAudioPlugin()
			] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

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
			public readonly currentTime = 0;
			public readonly state = 'running';

			constructor() {
				createCount += 1;
			}

			public createGain = vi.fn(() => new FakeGainNode());
			public createOscillator = vi.fn(() => new FakeOscillatorNode());
			public resume = vi.fn(async () => undefined);
			public close = vi.fn(async () => undefined);
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createApp({
			plugins: [
				createDefaultPlugin(),
				createMidiPlugin(),
				createTransportPlugin(),
				createAudioPlugin()
			] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

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
			public readonly currentTime = 0;
			public readonly state = 'running';
			public createGain = vi.fn(() => new FakeGainNode());
			public createOscillator = vi.fn(() => new FakeOscillatorNode());
			public resume = vi.fn(() => deferred.promise);
			public close = vi.fn(async () => undefined);
		}

		Object.defineProperty(globalThis, 'AudioContext', {
			value: FakeAudioContext,
			configurable: true,
			writable: true
		});

		const app = createApp({
			plugins: [
				createDefaultPlugin(),
				createMidiPlugin(),
				createTransportPlugin(),
				createAudioPlugin()
			] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

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

function createDeferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((nextResolve, nextReject) => {
		resolve = nextResolve;
		reject = nextReject;
	});

	return { promise, resolve, reject };
}
