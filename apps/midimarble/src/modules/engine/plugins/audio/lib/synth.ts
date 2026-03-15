import { getTicksPerSecond, type TMidiNote, type TMidiSong } from '../../midi';
import { audioConfig } from '../config';
import type { TActiveVoice, TAudioInstrumentId, TAudioState } from '../types';
import { createInstrumentPlayer } from './instruments';
import { getNoteDurationSeconds, getPlaybackDelaySeconds, midiNoteToFrequency } from './playback';
import { getContext, setContext } from './tone-runtime';

export async function ensureAudioGraph(
	state: TAudioState,
	masterVolume: number
): Promise<TAudioState> {
	if (
		state.isEnabled &&
		state.context != null &&
		state.masterGain != null &&
		state.context.state !== 'closed'
	) {
		syncToneContext(state.context);
		syncMasterVolume(state, masterVolume);
		return state;
	}

	const AudioCtor = getAudioContextCtor();
	if (AudioCtor == null) {
		return state;
	}

	const reusableContext =
		state.context != null && state.context.state !== 'closed' ? state.context : null;
	const context = reusableContext ?? new AudioCtor();
	const masterGain =
		reusableContext != null && state.masterGain != null ? state.masterGain : context.createGain();
	syncToneContext(context);
	masterGain.gain.value = clampVolume(masterVolume);
	if (reusableContext == null || state.masterGain == null) {
		masterGain.connect(context.destination);
	}

	await context.resume();

	return {
		...state,
		context,
		masterGain,
		isEnabled: true,
		instrumentPlayers: reusableContext != null ? state.instrumentPlayers : {}
	};
}

export function syncMasterVolume(state: TAudioState, masterVolume: number): void {
	state.masterGain?.gain.setValueAtTime(clampVolume(masterVolume), state.context?.currentTime ?? 0);
}

export function previewTrackNotesAtTick(
	state: TAudioState,
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	notes: TMidiNote[],
	instrumentId: TAudioInstrumentId | null
): void {
	previewTrackNotes(state, song, notes, audioConfig.playback.previewMaxNoteSeconds, instrumentId);
}

export function previewSelectedTrackNote(
	state: TAudioState,
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	note: TMidiNote,
	instrumentId: TAudioInstrumentId | null
): void {
	previewTrackNotes(state, song, [note], Number.POSITIVE_INFINITY, instrumentId);
}

export function previewMidiKeyNote(
	state: TAudioState,
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	noteNumber: number,
	options: {
		velocity: number;
	},
	instrumentId: TAudioInstrumentId | null
): void {
	const previewDurationTicks = Math.max(
		1,
		Math.round(getTicksPerSecond(song) * audioConfig.playback.previewMaxNoteSeconds)
	);
	previewTrackNotes(
		state,
		song,
		[
			{
				id: -1000 - noteNumber,
				tick: 0,
				durationTicks: previewDurationTicks,
				noteNumber,
				velocity: options.velocity,
				channel: 0
			}
		],
		audioConfig.playback.previewMaxNoteSeconds,
		instrumentId
	);
}

function previewTrackNotes(
	state: TAudioState,
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	notes: TMidiNote[],
	maxDurationSeconds: number,
	instrumentId: TAudioInstrumentId | null
): void {
	for (const note of notes) {
		playTrackNote(state, song, note, {
			delaySeconds: 0,
			maxDurationSeconds,
			instrumentId
		});
	}
}

export function playTrackNotes(
	state: TAudioState,
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	notes: TMidiNote[],
	startTick: number,
	instrumentId: TAudioInstrumentId | null
): void {
	for (const note of notes) {
		playTrackNote(state, song, note, {
			delaySeconds: getPlaybackDelaySeconds(song, note.tick, startTick),
			maxDurationSeconds: audioConfig.playback.maxNoteSeconds,
			instrumentId
		});
	}
}

export function stopAllVoices(state: TAudioState): void {
	for (const voices of state.activeVoices.values()) {
		for (const voice of voices) {
			if (voice.cleanupId != null) {
				globalThis.clearTimeout(voice.cleanupId);
			}
		}
	}

	state.activeVoices.clear();
	const now = state.context?.currentTime ?? 0;
	for (const instrument of Object.values(state.instrumentPlayers)) {
		instrument?.releaseAll(now);
		instrument?.dispose();
	}
	state.instrumentPlayers = {};
}

export function disposeAudioGraph(state: TAudioState): void {
	stopAllVoices(state);
	state.masterGain?.disconnect();
	if (state.context != null) {
		void state.context.close();
	}
}

function playTrackNote(
	state: TAudioState,
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	note: TMidiNote,
	options: {
		delaySeconds: number;
		maxDurationSeconds: number;
		instrumentId: TAudioInstrumentId | null;
	}
): void {
	const context = state.context;
	if (context == null || state.masterGain == null || options.instrumentId == null) {
		return;
	}

	const instrument = ensureInstrumentPlayer(state, options.instrumentId);
	if (instrument == null) {
		return;
	}

	const startAt = context.currentTime + Math.max(0, options.delaySeconds);
	const sustainSeconds = getNoteDurationSeconds(song, note, options.maxDurationSeconds);
	instrument.triggerAttackRelease(
		midiNoteToFrequency(note.noteNumber),
		sustainSeconds,
		startAt,
		clampVelocity(note.velocity)
	);

	const voice: TActiveVoice = {
		instrumentId: options.instrumentId,
		noteNumber: note.noteNumber,
		cleanupId: null
	};

	const voices = state.activeVoices.get(note.id) ?? [];
	voices.push(voice);
	state.activeVoices.set(note.id, voices);

	voice.cleanupId = globalThis.setTimeout(
		() => {
			const active = state.activeVoices.get(note.id);
			if (active == null) {
				return;
			}

			const next = active.filter((entry) => entry !== voice);
			if (next.length === 0) {
				state.activeVoices.delete(note.id);
				return;
			}

			state.activeVoices.set(note.id, next);
		},
		Math.ceil(
			(options.delaySeconds + sustainSeconds + audioConfig.playback.voiceCleanupPaddingSeconds) *
				1000
		)
	);
}

function clampVolume(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function clampVelocity(value: number): number {
	return Math.max(0.05, Math.min(1, value / 127));
}

function getAudioContextCtor(): (new () => AudioContext) | null {
	const scope = globalThis as typeof globalThis & {
		AudioContext?: new () => AudioContext;
		webkitAudioContext?: new () => AudioContext;
	};

	return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

function syncToneContext(context: AudioContext): void {
	if (getContext().rawContext !== context) {
		setContext(context);
	}
}

function ensureInstrumentPlayer(state: TAudioState, instrumentId: TAudioInstrumentId) {
	const existing = state.instrumentPlayers[instrumentId];
	if (existing != null) {
		return existing;
	}

	if (state.masterGain == null) {
		return null;
	}

	const created = createInstrumentPlayer(instrumentId);
	created.connect(state.masterGain);
	state.instrumentPlayers[instrumentId] = created;
	return created;
}
