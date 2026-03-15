import type { TMidiApp, TMidiCreateNoteInput, TMidiNote, TMidiSong, TMidiTrack } from '../types';
import { parseMidi } from './midi-parser';
import { findFirstTrackWithNotes, findTrackById } from './timing';

type TMidiStateAccess = {
	r?: Pick<
		TMidiApp['r'],
		'midiSong' | 'selectedTrackId' | 'selectedNoteId' | 'selectedNoteIds' | 'nextMidiNoteId'
	>;
	updateResource: TMidiApp['updateResource'];
};

type TMidiMutableStateAccess = TMidiStateAccess & {
	r: Pick<
		TMidiApp['r'],
		'midiSong' | 'selectedTrackId' | 'selectedNoteId' | 'selectedNoteIds' | 'nextMidiNoteId'
	>;
};

export async function loadMidiFileIntoState(app: TMidiStateAccess, file: File): Promise<void> {
	try {
		const song = parseMidi(await file.arrayBuffer(), file.name);
		const selectedTrack = findFirstTrackWithNotes(song);

		app.updateResource('midiSong', song);
		app.updateResource('selectedTrackId', selectedTrack?.id ?? null);
		app.updateResource('selectedNoteId', null);
		app.updateResource('selectedNoteIds', new Set<number>());
		app.updateResource('nextMidiNoteId', getNextMidiNoteId(song));
		app.updateResource('midiImportError', null);
	} catch (error) {
		app.updateResource('midiSong', null);
		app.updateResource('selectedTrackId', null);
		app.updateResource('selectedNoteId', null);
		app.updateResource('selectedNoteIds', new Set<number>());
		app.updateResource('nextMidiNoteId', 0);
		app.updateResource(
			'midiImportError',
			error instanceof Error ? error.message : 'Failed to import MIDI file.'
		);
	}
}

export function clearMidiSongState(app: TMidiStateAccess): void {
	app.updateResource('midiSong', null);
	app.updateResource('selectedTrackId', null);
	app.updateResource('selectedNoteId', null);
	app.updateResource('selectedNoteIds', new Set<number>());
	app.updateResource('nextMidiNoteId', 0);
	app.updateResource('midiImportError', null);
}

export function selectMidiNote(app: TMidiStateAccess, noteId: number | null): void {
	selectMidiNotes(app, noteId == null ? [] : [noteId], noteId);
}

export function selectMidiNotes(
	app: TMidiStateAccess,
	noteIds: number[],
	primaryNoteId: number | null
): void {
	const track = getSelectedTrack(app.r?.midiSong ?? null, app.r?.selectedTrackId ?? null);
	if (track == null) {
		clearMidiNoteSelection(app);
		return;
	}

	const trackNoteIds = new Set(track.notes.map((note) => note.id));
	const validNoteIds = Array.from(new Set(noteIds)).filter((noteId) => trackNoteIds.has(noteId));
	const selectedNoteIds = new Set(validNoteIds);
	const selectedNoteId =
		primaryNoteId != null && selectedNoteIds.has(primaryNoteId)
			? primaryNoteId
			: (validNoteIds[0] ?? null);

	app.updateResource('selectedNoteId', selectedNoteId);
	app.updateResource('selectedNoteIds', selectedNoteIds);
}

export function clearMidiNoteSelection(app: TMidiStateAccess): void {
	app.updateResource('selectedNoteId', null);
	app.updateResource('selectedNoteIds', new Set<number>());
}

export function selectAllTrackMidiNotes(
	app: TMidiMutableStateAccess,
	trackId: number | undefined
): void {
	const track = findTrackById(app.r.midiSong, trackId ?? app.r.selectedTrackId);
	if (track == null || track.notes.length === 0) {
		clearMidiNoteSelection(app);
		return;
	}

	selectMidiNotes(
		app,
		track.notes.map((note) => note.id),
		app.r.selectedNoteId != null && track.notes.some((note) => note.id === app.r.selectedNoteId)
			? app.r.selectedNoteId
			: (track.notes[0]?.id ?? null)
	);
}

export function createMidiNote(
	app: TMidiMutableStateAccess,
	input: TMidiCreateNoteInput
): number | null {
	const track = findTrackById(app.r.midiSong, input.trackId ?? app.r.selectedTrackId);
	if (track == null || app.r.midiSong == null) {
		return null;
	}

	const noteId = app.r.nextMidiNoteId;
	const note: TMidiNote = {
		id: noteId,
		tick: normalizeTick(input.tick),
		durationTicks: Math.max(1, normalizeTick(input.durationTicks)),
		noteNumber: clampNoteNumber(input.noteNumber),
		velocity: 100,
		channel: track.notes[0]?.channel ?? 0
	};

	const nextSong = updateTrackNotes(app.r.midiSong, track.id, (notes) => [...notes, note]);
	app.updateResource('midiSong', nextSong);
	app.updateResource('nextMidiNoteId', noteId + 1);
	selectMidiNotes(app, [noteId], noteId);
	return noteId;
}

export function moveSelectedMidiNotes(
	app: TMidiMutableStateAccess,
	deltaTick: number,
	deltaNoteNumber: number
): boolean {
	const track = findTrackById(app.r.midiSong, app.r.selectedTrackId);
	if (track == null || app.r.midiSong == null || app.r.selectedNoteIds.size === 0) {
		return false;
	}

	const selectedNotes = track.notes.filter((note) => app.r.selectedNoteIds.has(note.id));
	if (selectedNotes.length === 0) {
		clearMidiNoteSelection(app);
		return false;
	}

	const clampedDeltaTick = clampMoveDeltaTick(selectedNotes, deltaTick);
	const clampedDeltaNoteNumber = clampMoveDeltaNoteNumber(selectedNotes, deltaNoteNumber);
	if (clampedDeltaTick === 0 && clampedDeltaNoteNumber === 0) {
		return false;
	}

	const nextSong = updateTrackNotes(app.r.midiSong, track.id, (notes) =>
		notes.map((note) =>
			app.r.selectedNoteIds.has(note.id)
				? {
						...note,
						tick: normalizeTick(note.tick + clampedDeltaTick),
						noteNumber: clampNoteNumber(note.noteNumber + clampedDeltaNoteNumber)
					}
				: note
		)
	);
	app.updateResource('midiSong', nextSong);
	return true;
}

export function resizePrimarySelectedMidiNote(
	app: TMidiMutableStateAccess,
	edge: 'start' | 'end',
	deltaTick: number
): boolean {
	const track = findTrackById(app.r.midiSong, app.r.selectedTrackId);
	const primaryNoteId = app.r.selectedNoteId;
	if (track == null || app.r.midiSong == null || primaryNoteId == null) {
		return false;
	}

	const note = track.notes.find((entry) => entry.id === primaryNoteId);
	if (note == null) {
		clearMidiNoteSelection(app);
		return false;
	}

	const delta = Math.round(deltaTick);
	if (delta === 0) {
		return false;
	}

	const noteEndTick = note.tick + note.durationTicks;
	const nextNote =
		edge === 'start'
			? {
					...note,
					tick: Math.max(0, Math.min(noteEndTick - 1, note.tick + delta)),
					durationTicks: noteEndTick - Math.max(0, Math.min(noteEndTick - 1, note.tick + delta))
				}
			: {
					...note,
					durationTicks: Math.max(1, note.durationTicks + delta)
				};

	if (nextNote.tick === note.tick && nextNote.durationTicks === note.durationTicks) {
		return false;
	}

	const nextSong = updateTrackNotes(app.r.midiSong, track.id, (notes) =>
		notes.map((entry) => (entry.id === note.id ? nextNote : entry))
	);
	app.updateResource('midiSong', nextSong);
	return true;
}

export function deleteSelectedMidiNotes(app: TMidiMutableStateAccess): number {
	const track = getSelectedTrack(app.r.midiSong, app.r.selectedTrackId);
	if (track == null || app.r.midiSong == null || app.r.selectedNoteIds.size === 0) {
		return 0;
	}

	const selectedTrackNoteIds = new Set(track.notes.map((note) => note.id));
	const noteIdsToDelete = new Set(
		Array.from(app.r.selectedNoteIds).filter((noteId) => selectedTrackNoteIds.has(noteId))
	);
	if (noteIdsToDelete.size === 0) {
		clearMidiNoteSelection(app);
		return 0;
	}

	const nextSong = updateTrackNotes(app.r.midiSong, track.id, (notes) =>
		notes.filter((note) => !noteIdsToDelete.has(note.id))
	);
	const removedCount = track.notes.length - (findTrackById(nextSong, track.id)?.notes.length ?? 0);
	if (removedCount === 0) {
		return 0;
	}

	app.updateResource('midiSong', nextSong);
	clearMidiNoteSelection(app);
	return removedCount;
}

function updateTrackNotes(
	song: TMidiSong,
	trackId: number,
	updateNotes: (notes: TMidiNote[]) => TMidiNote[]
): TMidiSong {
	const nextTracks = song.tracks.map((track) =>
		track.id === trackId
			? {
					...track,
					notes: sortMidiNotes(updateNotes(track.notes))
				}
			: track
	);

	return {
		...song,
		tracks: nextTracks,
		totalTicks: getSongTotalTicks(nextTracks)
	};
}

function clampMoveDeltaTick(notes: TMidiNote[], deltaTick: number): number {
	const roundedDeltaTick = Math.round(deltaTick);
	const minTick = Math.min(...notes.map((note) => note.tick));
	return Math.max(-minTick, roundedDeltaTick);
}

function clampMoveDeltaNoteNumber(notes: TMidiNote[], deltaNoteNumber: number): number {
	const roundedDeltaNoteNumber = Math.round(deltaNoteNumber);
	const minNoteNumber = Math.min(...notes.map((note) => note.noteNumber));
	const maxNoteNumber = Math.max(...notes.map((note) => note.noteNumber));
	return Math.max(-minNoteNumber, Math.min(127 - maxNoteNumber, roundedDeltaNoteNumber));
}

function normalizeTick(tick: number): number {
	if (!Number.isFinite(tick)) {
		return 0;
	}

	return Math.max(0, Math.round(tick));
}

function clampNoteNumber(noteNumber: number): number {
	if (!Number.isFinite(noteNumber)) {
		return 60;
	}

	return Math.max(0, Math.min(127, Math.round(noteNumber)));
}

function getSongTotalTicks(tracks: TMidiTrack[]): number {
	return tracks.reduce(
		(maxTick, track) =>
			Math.max(
				maxTick,
				...track.notes.map((note) => normalizeTick(note.tick + note.durationTicks))
			),
		0
	);
}

function getNextMidiNoteId(song: TMidiSong | null): number {
	if (song == null) {
		return 0;
	}

	return (
		song.tracks.reduce(
			(maxId, track) => Math.max(maxId, ...track.notes.map((note) => note.id)),
			-1
		) + 1
	);
}

function hasMidiNote(song: TMidiSong | null, noteId: number): boolean {
	return song?.tracks.some((track) => track.notes.some((note) => note.id === noteId)) ?? false;
}

function getSelectedTrack(song: TMidiSong | null, trackId: number | null): TMidiTrack | null {
	if (song == null || trackId == null) {
		return null;
	}

	return findTrackById(song, trackId) ?? null;
}

function sortMidiNotes(notes: TMidiNote[]): TMidiNote[] {
	return [...notes].sort(
		(left, right) =>
			left.tick - right.tick ||
			left.noteNumber - right.noteNumber ||
			left.durationTicks - right.durationTicks ||
			left.id - right.id
	);
}
