import type { MidiNote, MidiSong, MidiTrack } from '../types';
import { midiConfig } from './midi-config';

interface PendingNote {
	tick: number;
	channel: number;
	noteNumber: number;
	velocity: number;
}

interface ParsedTrackChunk {
	name: string;
	bpm: number | null;
	channels: Set<number>;
	notes: MidiNote[];
}

function readByte(data: Uint8Array, pos: number): number {
	const value = data[pos];
	if (value == null) {
		throw new Error('Unexpected end of MIDI data.');
	}

	return value;
}

function readUint16(data: Uint8Array, pos: number): number {
	return (readByte(data, pos) << 8) | readByte(data, pos + 1);
}

function readUint32(data: Uint8Array, pos: number): number {
	return (
		((readByte(data, pos) << 24) |
			(readByte(data, pos + 1) << 16) |
			(readByte(data, pos + 2) << 8) |
			readByte(data, pos + 3)) >>>
		0
	);
}

function readString(data: Uint8Array, pos: number, length: number): string {
	return String.fromCharCode(...data.slice(pos, pos + length));
}

function readVarLength(data: Uint8Array, pos: number): [number, number] {
	let value = 0;
	let bytes = 0;
	let next: number;

	do {
		next = readByte(data, pos + bytes);
		value = (value << 7) | (next & 0x7f);
		bytes++;
	} while (next & 0x80);

	return [value, bytes];
}

function parseTrackChunk(data: Uint8Array, start: number, length: number): ParsedTrackChunk {
	const track: ParsedTrackChunk = {
		name: '',
		bpm: null,
		channels: new Set(),
		notes: []
	};

	let pos = start;
	let currentTick = 0;
	let runningStatus = 0;
	let noteId = 0;
	const end = start + length;
	const pendingNotes = new Map<number, PendingNote>();

	const closeNote = (tick: number, channel: number, noteNumber: number) => {
		const key = channel * 128 + noteNumber;
		const activeNote = pendingNotes.get(key);
		if (activeNote == null) {
			return;
		}

		track.notes.push({
			id: noteId++,
			tick: activeNote.tick,
			durationTicks: Math.max(1, tick - activeNote.tick),
			noteNumber: activeNote.noteNumber,
			velocity: activeNote.velocity,
			channel: activeNote.channel
		});
		pendingNotes.delete(key);
	};

	while (pos < end) {
		const [delta, deltaByteCount] = readVarLength(data, pos);
		pos += deltaByteCount;
		currentTick += delta;

		let statusByte: number;
		if (readByte(data, pos) & 0x80) {
			statusByte = readByte(data, pos);
			pos++;
			if (statusByte < 0xf0) {
				runningStatus = statusByte;
			}
		} else {
			statusByte = runningStatus;
		}

		const type = statusByte & 0xf0;
		const channel = statusByte & 0x0f;

		if (type === 0x90) {
			const noteNumber = readByte(data, pos++);
			const velocity = readByte(data, pos++);
			if (velocity > 0) {
				track.channels.add(channel);
				pendingNotes.set(channel * 128 + noteNumber, {
					tick: currentTick,
					channel,
					noteNumber,
					velocity
				});
			} else {
				closeNote(currentTick, channel, noteNumber);
			}
			continue;
		}

		if (type === 0x80) {
			const noteNumber = readByte(data, pos++);
			pos++;
			closeNote(currentTick, channel, noteNumber);
			continue;
		}

		if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
			pos += 2;
			continue;
		}

		if (type === 0xc0 || type === 0xd0) {
			pos += 1;
			continue;
		}

		if (statusByte === 0xff) {
			const metaType = readByte(data, pos++);
			const [metaLength, metaLengthBytes] = readVarLength(data, pos);
			pos += metaLengthBytes;

			if (metaType === 0x03 && track.name === '') {
				track.name = readString(data, pos, metaLength);
			}

			if (metaType === 0x51 && metaLength === 3) {
				const microsecondsPerBeat =
					((readByte(data, pos) << 16) |
						(readByte(data, pos + 1) << 8) |
						readByte(data, pos + 2)) >>>
					0;
				if (microsecondsPerBeat > 0) {
					track.bpm = Math.round(60_000_000 / microsecondsPerBeat);
				}
			}

			pos += metaLength;
			continue;
		}

		if (statusByte === 0xf0 || statusByte === 0xf7) {
			const [sysexLength, sysexLengthBytes] = readVarLength(data, pos);
			pos += sysexLengthBytes + sysexLength;
			continue;
		}

		break;
	}

	return track;
}

function buildTrack(rawTrack: ParsedTrackChunk, id: number): MidiTrack {
	const noteCount = rawTrack.notes.length;
	const minNote = noteCount === 0 ? 0 : Math.min(...rawTrack.notes.map((note) => note.noteNumber));
	const maxNote = noteCount === 0 ? 0 : Math.max(...rawTrack.notes.map((note) => note.noteNumber));
	const startTick = noteCount === 0 ? 0 : Math.min(...rawTrack.notes.map((note) => note.tick));
	const endTick =
		noteCount === 0 ? 0 : Math.max(...rawTrack.notes.map((note) => note.tick + note.durationTicks));

	return {
		id,
		name: rawTrack.name.trim() || `Track ${id + 1}`,
		channel: rawTrack.channels.size === 1 ? (Array.from(rawTrack.channels)[0] ?? null) : null,
		color: midiConfig.colors.trackPalette[id % midiConfig.colors.trackPalette.length]!,
		notes: rawTrack.notes,
		noteCount,
		minNote,
		maxNote,
		startTick,
		endTick
	};
}

export function parseMidi(buffer: ArrayBuffer, fileName?: string | null): MidiSong {
	const data = new Uint8Array(buffer);

	if (readString(data, 0, 4) !== 'MThd') {
		throw new Error('Not a valid MIDI file. Missing MThd header.');
	}

	const format = readUint16(data, 8);
	const trackCount = readUint16(data, 10);
	const timeDivision = readUint16(data, 12);

	if (timeDivision & 0x8000) {
		throw new Error('SMPTE MIDI timing is not supported yet.');
	}

	const ticksPerBeat = timeDivision;
	const rawTracks: ParsedTrackChunk[] = [];

	let pos = 14;
	for (let index = 0; index < trackCount; index++) {
		if (pos >= data.length || readString(data, pos, 4) !== 'MTrk') {
			break;
		}

		const chunkLength = readUint32(data, pos + 4);
		rawTracks.push(parseTrackChunk(data, pos + 8, chunkLength));
		pos += 8 + chunkLength;
	}

	const bpm = rawTracks.find((track) => track.bpm != null)?.bpm ?? 120;
	const firstTrack = rawTracks[0];
	const tracks =
		format === 0 && rawTracks.length === 1 && firstTrack != null
			? Array.from(
					firstTrack.notes
						.reduce((map, note) => {
							const notes = map.get(note.channel) ?? [];
							notes.push(note);
							map.set(note.channel, notes);
							return map;
						}, new Map<number, MidiNote[]>())
						.entries()
				).map(([channel, notes]) =>
					buildTrack(
						{
							name: `Channel ${channel + 1}`,
							bpm: null,
							channels: new Set([channel]),
							notes
						},
						channel
					)
				)
			: (format === 1 && rawTracks.length > 1 && firstTrack?.notes.length === 0
					? rawTracks.slice(1)
					: rawTracks
				).map((track, index) => buildTrack(track, index));

	const totalTicks = tracks.length === 0 ? 0 : Math.max(...tracks.map((track) => track.endTick));
	const totalBeats = ticksPerBeat === 0 ? 0 : Math.ceil(totalTicks / ticksPerBeat);
	const durationSeconds = totalBeats * (60 / bpm);
	const songName = rawTracks.find((track) => track.name.trim() !== '')?.name.trim();

	return {
		name: songName || fileName?.replace(/\.midi?$/i, '') || 'Untitled',
		fileName: fileName ?? null,
		ticksPerBeat,
		bpm,
		totalTicks,
		totalBeats,
		durationSeconds,
		tracks
	};
}
