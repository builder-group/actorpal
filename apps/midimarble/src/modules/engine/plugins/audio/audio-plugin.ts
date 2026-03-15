import { findNoteById, findTrackById } from '../midi';
import { audioConfig } from './config';
import { getTrackInstrumentId } from './lib/instruments';
import { getSelectedTrackNotesAtTick } from './lib/playback';
import {
	disposeAudioGraph,
	ensureAudioGraph,
	previewMidiKeyNote,
	previewSelectedTrackNote,
	previewTrackNotesAtTick,
	stopAllVoices
} from './lib/synth';
import { syncAudioPlaybackSystem } from './systems';
import type {
	TAudioApp,
	TAudioInstrumentId,
	TAudioPlugin,
	TAudioSettings,
	TAudioState
} from './types';

export function createAudioPlugin(options?: {
	audioSettings?: Partial<TAudioSettings>;
}): TAudioPlugin {
	let resumePromise: Promise<void> | null = null;
	let previewRequestId = 0;
	let audioSessionId = 0;

	return {
		// Audio owns note playback and simple built-in synthesis for the selected MIDI track.
		name: 'Audio',
		deps: ['Default', 'Midi', 'Transport'],
		resources: {
			audioState: createInitialAudioState(),
			audioSettings: {
				enabled: audioConfig.defaults.enabled,
				masterVolume: audioConfig.defaults.masterVolume,
				trackInstrumentIds: {},
				...options?.audioSettings
			},
			audioPlaybackFeedback: {
				activeNoteIds: new Set<number>(),
				activeNoteNumbers: new Set<number>(),
				expiresAtMs: 0
			}
		},
		appExtensions: {
			async resumeAudio(this: TAudioApp): Promise<void> {
				if (!this.r.audioSettings.enabled) {
					return;
				}

				if (resumePromise != null) {
					await resumePromise;
					return;
				}

				const sessionId = audioSessionId;
				resumePromise = (async () => {
					const nextState = await ensureAudioGraph(
						this.r.audioState,
						this.r.audioSettings.masterVolume
					);
					if (sessionId !== audioSessionId) {
						disposeAudioGraph(nextState);
						return;
					}
					if (nextState !== this.r.audioState) {
						this.updateResource('audioState', nextState);
					}
				})();

				try {
					await resumePromise;
				} finally {
					resumePromise = null;
				}
			},
			async previewNotesAtTick(this: TAudioApp, tick: number): Promise<void> {
				if (!this.r.audioSettings.enabled) {
					return;
				}

				const requestId = ++previewRequestId;
				await this.resumeAudio();
				if (requestId !== previewRequestId) {
					return;
				}
				const { audioState, midiSong, midiLookup, selectedTrackId, transport } = this.r;
				if (!audioState.isEnabled || midiSong == null || selectedTrackId == null) {
					return;
				}

				const notes = getSelectedTrackNotesAtTick(midiSong, midiLookup, selectedTrackId, tick);
				const instrumentId = getTrackInstrumentId(
					this.r.audioSettings.trackInstrumentIds,
					selectedTrackId
				);
				stopAllVoices(audioState);
				previewTrackNotesAtTick(audioState, midiSong, notes, instrumentId);
				this.updateResource('audioPlaybackFeedback', createPlaybackFeedback(notes));
				this.updateResource('audioState', {
					...audioState,
					lastProcessedTick: tick,
					lastMode: transport.mode
				});
			},
			async previewNote(this: TAudioApp, noteId: number): Promise<void> {
				if (!this.r.audioSettings.enabled) {
					return;
				}

				const requestId = ++previewRequestId;
				await this.resumeAudio();
				if (requestId !== previewRequestId) {
					return;
				}

				const { audioState, midiSong, midiLookup, selectedTrackId, transport } = this.r;
				if (!audioState.isEnabled || midiSong == null || selectedTrackId == null) {
					return;
				}

				const noteMatch = findNoteById(midiSong, noteId, midiLookup);
				if (noteMatch == null || noteMatch.track.id !== selectedTrackId) {
					return;
				}

				const instrumentId = getTrackInstrumentId(
					this.r.audioSettings.trackInstrumentIds,
					noteMatch.track.id
				);
				stopAllVoices(audioState);
				previewSelectedTrackNote(audioState, midiSong, noteMatch.note, instrumentId);
				this.updateResource('audioPlaybackFeedback', createPlaybackFeedback([noteMatch.note]));
				this.updateResource('audioState', {
					...audioState,
					lastProcessedTick: noteMatch.note.tick,
					lastMode: transport.mode
				});
			},
			async previewMidiNote(this: TAudioApp, noteNumber: number): Promise<void> {
				if (!this.r.audioSettings.enabled) {
					return;
				}

				const requestId = ++previewRequestId;
				await this.resumeAudio();
				if (requestId !== previewRequestId) {
					return;
				}

				const { audioState, midiSong, midiLookup, selectedTrackId, transport } = this.r;
				if (!audioState.isEnabled || midiSong == null || selectedTrackId == null) {
					return;
				}

				const track = findTrackById(midiSong, selectedTrackId, midiLookup);
				if (track == null) {
					return;
				}

				const clampedNoteNumber = Math.max(0, Math.min(127, Math.round(noteNumber)));
				const instrumentId = getTrackInstrumentId(
					this.r.audioSettings.trackInstrumentIds,
					selectedTrackId
				);
				stopAllVoices(audioState);
				previewMidiKeyNote(
					audioState,
					midiSong,
					clampedNoteNumber,
					{ velocity: 100 },
					instrumentId
				);
				this.updateResource('audioPlaybackFeedback', {
					activeNoteIds: new Set<number>(),
					activeNoteNumbers: new Set([clampedNoteNumber]),
					expiresAtMs: Date.now() + 120
				});
				this.updateResource('audioState', {
					...audioState,
					lastProcessedTick: transport.playheadTick,
					lastMode: transport.mode
				});
			},
			async previewTrackInstrument(this: TAudioApp, trackId: number): Promise<void> {
				if (!this.r.audioSettings.enabled) {
					return;
				}

				const requestId = ++previewRequestId;
				await this.resumeAudio();
				if (requestId !== previewRequestId) {
					return;
				}

				const { audioState, midiSong, midiLookup } = this.r;
				if (!audioState.isEnabled || midiSong == null) {
					return;
				}

				const track = findTrackById(midiSong, trackId, midiLookup);
				const previewNote = track?.notes[0];
				if (track == null || previewNote == null) {
					return;
				}

				const instrumentId = getTrackInstrumentId(
					this.r.audioSettings.trackInstrumentIds,
					track.id
				);
				stopAllVoices(audioState);
				previewMidiKeyNote(
					audioState,
					midiSong,
					previewNote.noteNumber,
					{ velocity: previewNote.velocity },
					instrumentId
				);
				this.updateResource('audioPlaybackFeedback', {
					activeNoteIds: new Set<number>(),
					activeNoteNumbers: new Set([previewNote.noteNumber]),
					expiresAtMs: Date.now() + 120
				});
			},
			updateAudioSettings(this: TAudioApp, patch: Partial<TAudioSettings>): void {
				this.updateResource('audioSettings', {
					...this.r.audioSettings,
					...patch
				});
			},
			setTrackInstrument(this: TAudioApp, trackId: number, instrumentId: TAudioInstrumentId): void {
				if (this.r.audioSettings.trackInstrumentIds[trackId] === instrumentId) {
					return;
				}

				stopAllVoices(this.r.audioState);
				this.updateResource('audioSettings', {
					...this.r.audioSettings,
					trackInstrumentIds: {
						...this.r.audioSettings.trackInstrumentIds,
						[trackId]: instrumentId
					}
				});
				this.updateResource('audioPlaybackFeedback', createEmptyPlaybackFeedback());
			},
			clearTrackInstruments(this: TAudioApp): void {
				if (Object.keys(this.r.audioSettings.trackInstrumentIds).length === 0) {
					return;
				}

				stopAllVoices(this.r.audioState);
				this.updateResource('audioSettings', {
					...this.r.audioSettings,
					trackInstrumentIds: {}
				});
				this.updateResource('audioPlaybackFeedback', createEmptyPlaybackFeedback());
			},
			disposeAudio(this: TAudioApp): void {
				audioSessionId += 1;
				disposeAudioGraph(this.r.audioState);
				resumePromise = null;
				previewRequestId += 1;
				this.updateResource('audioState', createInitialAudioState());
				this.updateResource('audioPlaybackFeedback', createEmptyPlaybackFeedback());
			}
		},
		setup(app: TAudioApp) {
			app.addSystem(syncAudioPlaybackSystem, { set: 'PostUpdate' });
		}
	};
}

function createInitialAudioState(): TAudioState {
	return {
		context: null,
		masterGain: null,
		isEnabled: false,
		lastProcessedTick: 0,
		lastMode: 'paused' as const,
		activeVoices: new Map(),
		instrumentPlayers: {}
	};
}

function createPlaybackFeedback(
	notes: Array<{ id: number; noteNumber: number }>
): TAudioApp['r']['audioPlaybackFeedback'] {
	return {
		activeNoteIds: new Set(notes.map((note) => note.id)),
		activeNoteNumbers: new Set(notes.map((note) => note.noteNumber)),
		expiresAtMs: Date.now() + 120
	};
}

function createEmptyPlaybackFeedback(): TAudioApp['r']['audioPlaybackFeedback'] {
	return {
		activeNoteIds: new Set<number>(),
		activeNoteNumbers: new Set<number>(),
		expiresAtMs: 0
	};
}
