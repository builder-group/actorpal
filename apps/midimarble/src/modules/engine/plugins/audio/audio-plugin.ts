import { findNoteById } from '../midi';
import { getSelectedTrackNotesAtTick } from './lib/playback';
import {
	disposeAudioGraph,
	ensureAudioGraph,
	previewSelectedTrackNote,
	previewTrackNotesAtTick,
	stopAllVoices
} from './lib/synth';
import { syncAudioPlaybackSystem } from './systems';
import type { TAudioApp, TAudioPlugin, TAudioState } from './types';

export function createAudioPlugin(): TAudioPlugin {
	let resumePromise: Promise<void> | null = null;
	let previewRequestId = 0;
	let audioSessionId = 0;

	return {
		// Audio owns note playback and simple built-in synthesis for the selected MIDI track.
		name: 'Audio',
		deps: ['Default', 'Midi', 'Transport'],
		resources: {
			audioState: createInitialAudioState(),
			audioConfig: {
				enabled: true,
				masterVolume: 0.32
			},
			audioPlaybackFeedback: {
				activeNoteIds: new Set<number>(),
				activeNoteNumbers: new Set<number>(),
				expiresAtMs: 0
			}
		},
		appExtensions: {
			async resumeAudio(this: TAudioApp): Promise<void> {
				if (!this.r.audioConfig.enabled) {
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
						this.r.audioConfig.masterVolume
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
				if (!this.r.audioConfig.enabled) {
					return;
				}

				const requestId = ++previewRequestId;
				await this.resumeAudio();
				if (requestId !== previewRequestId) {
					return;
				}
				const { audioState, midiSong, selectedTrackId, transport } = this.r;
				if (!audioState.isEnabled || midiSong == null || selectedTrackId == null) {
					return;
				}

				const notes = getSelectedTrackNotesAtTick(midiSong, selectedTrackId, tick);
				stopAllVoices(audioState);
				previewTrackNotesAtTick(audioState, midiSong, notes);
				this.updateResource('audioPlaybackFeedback', createPlaybackFeedback(notes));
				this.updateResource('audioState', {
					...audioState,
					lastProcessedTick: tick,
					lastMode: transport.mode
				});
			},
			async previewNote(this: TAudioApp, noteId: number): Promise<void> {
				if (!this.r.audioConfig.enabled) {
					return;
				}

				const requestId = ++previewRequestId;
				await this.resumeAudio();
				if (requestId !== previewRequestId) {
					return;
				}

				const { audioState, midiSong, selectedTrackId, transport } = this.r;
				if (!audioState.isEnabled || midiSong == null || selectedTrackId == null) {
					return;
				}

				const noteMatch = findNoteById(midiSong, noteId);
				if (noteMatch == null || noteMatch.track.id !== selectedTrackId) {
					return;
				}

				stopAllVoices(audioState);
				previewSelectedTrackNote(audioState, midiSong, noteMatch.note);
				this.updateResource('audioPlaybackFeedback', createPlaybackFeedback([noteMatch.note]));
				this.updateResource('audioState', {
					...audioState,
					lastProcessedTick: noteMatch.note.tick,
					lastMode: transport.mode
				});
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
		activeVoices: new Map()
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
