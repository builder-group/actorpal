import type { TMidiNote, TMidiSong } from '../../midi';
import type { TActiveVoice, TAudioState } from '../types';
import {
	getNoteDurationSeconds,
	getPlaybackDelaySeconds,
	midiNoteToFrequency,
	PLAYBACK_MAX_NOTE_SECONDS,
	PREVIEW_MAX_NOTE_SECONDS
} from './playback';

const ATTACK_SECONDS = 0.01;
const RELEASE_SECONDS = 0.08;
const MIN_AUDIBLE_GAIN = 0.0001;

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
	masterGain.gain.value = clampVolume(masterVolume);
	if (reusableContext == null || state.masterGain == null) {
		masterGain.connect(context.destination);
	}

	await context.resume();

	return {
		...state,
		context,
		masterGain,
		isEnabled: true
	};
}

export function syncMasterVolume(state: TAudioState, masterVolume: number): void {
	state.masterGain?.gain.setValueAtTime(clampVolume(masterVolume), state.context?.currentTime ?? 0);
}

export function previewTrackNotesAtTick(
	state: TAudioState,
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	notes: TMidiNote[]
): void {
	for (const note of notes) {
		playTrackNote(state, song, note, {
			delaySeconds: 0,
			maxDurationSeconds: PREVIEW_MAX_NOTE_SECONDS
		});
	}
}

export function playTrackNotes(
	state: TAudioState,
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	notes: TMidiNote[],
	startTick: number
): void {
	for (const note of notes) {
		playTrackNote(state, song, note, {
			delaySeconds: getPlaybackDelaySeconds(song, note.tick, startTick),
			maxDurationSeconds: PLAYBACK_MAX_NOTE_SECONDS
		});
	}
}

export function stopAllVoices(state: TAudioState): void {
	for (const voices of state.activeVoices.values()) {
		for (const voice of voices) {
			if (voice.cleanupId != null) {
				globalThis.clearTimeout(voice.cleanupId);
			}
			stopVoice(voice, state.context?.currentTime ?? 0);
		}
	}

	state.activeVoices.clear();
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
	}
): void {
	const context = state.context;
	const masterGain = state.masterGain;
	if (context == null || masterGain == null) {
		return;
	}

	const oscillator = context.createOscillator();
	oscillator.type = note.channel === 9 ? 'square' : 'triangle';
	oscillator.frequency.value = midiNoteToFrequency(note.noteNumber);

	const gain = context.createGain();
	oscillator.connect(gain);
	gain.connect(masterGain);

	const startAt = context.currentTime + Math.max(0, options.delaySeconds);
	const sustainSeconds = getNoteDurationSeconds(song, note, options.maxDurationSeconds);
	const peakGain = Math.max(0.04, (note.velocity / 127) * 0.24);
	const sustainEnd = startAt + Math.max(ATTACK_SECONDS, sustainSeconds);
	const stopAt = sustainEnd + RELEASE_SECONDS;

	gain.gain.cancelScheduledValues(startAt);
	gain.gain.setValueAtTime(0, startAt);
	gain.gain.linearRampToValueAtTime(peakGain, startAt + ATTACK_SECONDS);
	gain.gain.setValueAtTime(peakGain, sustainEnd);
	gain.gain.linearRampToValueAtTime(MIN_AUDIBLE_GAIN, stopAt);

	oscillator.start(startAt);
	oscillator.stop(stopAt);

	const voice: TActiveVoice = {
		oscillator,
		gain,
		cleanupId: null
	};

	const voices = state.activeVoices.get(note.id) ?? [];
	voices.push(voice);
	state.activeVoices.set(note.id, voices);

	voice.cleanupId = globalThis.setTimeout(
		() => {
			stopVoice(voice, state.context?.currentTime ?? 0);
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
		Math.ceil((stopAt - context.currentTime) * 1000) + 40
	);
}

function stopVoice(voice: TActiveVoice, now: number): void {
	try {
		voice.gain.gain.cancelScheduledValues(now);
		voice.gain.gain.setValueAtTime(0, now);
		voice.oscillator.stop(now);
	} catch {
		// Ignore duplicate-stop races from scheduled cleanup.
	}

	voice.oscillator.disconnect();
	voice.gain.disconnect();
}

function clampVolume(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function getAudioContextCtor(): (new () => AudioContext) | null {
	const scope = globalThis as typeof globalThis & {
		AudioContext?: new () => AudioContext;
		webkitAudioContext?: new () => AudioContext;
	};

	return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}
