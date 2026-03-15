import { getTrackInstrumentId } from './lib/instruments';
import { getSelectedTrackNotesInRange } from './lib/playback';
import { playTrackNotes, stopAllVoices, syncMasterVolume } from './lib/synth';
import type { TAudioApp } from './types';

export function syncAudioPlaybackSystem(app: TAudioApp) {
	const {
		audioConfig,
		audioState,
		audioPlaybackFeedback,
		midiSong,
		midiLookup,
		selectedTrackId,
		transport
	} = app.r;

	if (
		audioPlaybackFeedback.expiresAtMs > 0 &&
		audioPlaybackFeedback.expiresAtMs <= Date.now() &&
		(audioPlaybackFeedback.activeNoteIds.size > 0 ||
			audioPlaybackFeedback.activeNoteNumbers.size > 0)
	) {
		app.updateResource('audioPlaybackFeedback', {
			activeNoteIds: new Set<number>(),
			activeNoteNumbers: new Set<number>(),
			expiresAtMs: 0
		});
	}

	syncMasterVolume(audioState, audioConfig.masterVolume);

	if (
		!audioConfig.enabled ||
		!audioState.isEnabled ||
		audioState.context == null ||
		audioState.masterGain == null
	) {
		if (audioState.activeVoices.size > 0) {
			stopAllVoices(audioState);
		}
		syncAudioCursor(app, transport.playheadTick, transport.mode);
		return;
	}

	const didSongContextChange =
		app.wasResourceChanged('midiSong') || app.wasResourceChanged('selectedTrackId');

	if (midiSong == null || selectedTrackId == null) {
		if (audioState.activeVoices.size > 0) {
			stopAllVoices(audioState);
		}
		syncAudioCursor(app, 0, transport.mode);
		return;
	}

	if (didSongContextChange) {
		stopAllVoices(audioState);
		syncAudioCursor(app, transport.playheadTick, transport.mode);
		return;
	}

	if (transport.mode !== 'running') {
		if (audioState.lastMode !== 'paused') {
			stopAllVoices(audioState);
			syncAudioCursor(app, transport.playheadTick, 'paused');
		} else if (audioState.lastProcessedTick !== transport.playheadTick) {
			stopAllVoices(audioState);
			syncAudioCursor(app, transport.playheadTick, 'paused');
		}
		return;
	}

	if (audioState.lastMode !== 'running') {
		const notesAtCurrentTick = getSelectedTrackNotesInRange(
			midiSong,
			midiLookup,
			selectedTrackId,
			transport.playheadTick - 0.0001,
			transport.playheadTick
		);
		const instrumentId = getTrackInstrumentId(audioConfig.trackInstrumentIds, selectedTrackId);
		syncPlaybackFeedback(app, notesAtCurrentTick);
		playTrackNotes(
			audioState,
			midiSong,
			notesAtCurrentTick,
			transport.playheadTick - 0.0001,
			instrumentId
		);
		syncAudioCursor(app, transport.playheadTick, 'running');
		return;
	}

	if (transport.playheadTick < audioState.lastProcessedTick) {
		stopAllVoices(audioState);
		syncAudioCursor(app, transport.playheadTick, 'running');
		return;
	}

	const notes = getSelectedTrackNotesInRange(
		midiSong,
		midiLookup,
		selectedTrackId,
		audioState.lastProcessedTick,
		transport.playheadTick
	);
	const instrumentId = getTrackInstrumentId(audioConfig.trackInstrumentIds, selectedTrackId);
	syncPlaybackFeedback(app, notes);
	playTrackNotes(audioState, midiSong, notes, audioState.lastProcessedTick, instrumentId);
	syncAudioCursor(app, transport.playheadTick, 'running');
}

function syncAudioCursor(
	app: Pick<TAudioApp, 'r' | 'updateResource'>,
	lastProcessedTick: number,
	lastMode: 'paused' | 'running'
): void {
	const { audioState } = app.r;
	if (audioState.lastProcessedTick === lastProcessedTick && audioState.lastMode === lastMode) {
		return;
	}

	app.updateResource('audioState', {
		...audioState,
		lastProcessedTick,
		lastMode
	});
}

function syncPlaybackFeedback(
	app: Pick<TAudioApp, 'updateResource'>,
	notes: Array<{ id: number; noteNumber: number }>
): void {
	if (notes.length === 0) {
		return;
	}

	app.updateResource('audioPlaybackFeedback', {
		activeNoteIds: new Set(notes.map((note) => note.id)),
		activeNoteNumbers: new Set(notes.map((note) => note.noteNumber)),
		expiresAtMs: Date.now() + 120
	});
}
