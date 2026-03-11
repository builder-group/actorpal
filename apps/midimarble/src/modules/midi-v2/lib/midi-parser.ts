// Zero-dependency binary MIDI parser.
// Handles MIDI format 0 (single track) and format 1 (multi-track).
// Converts delta-time events into absolute-tick NoteEvents with duration.

import type { TMidiNote, TMidiSong, TMidiTrack } from '../types';

// Per-track colors cycling through a dark-theme palette.
const TRACK_COLORS = [
	'#4A9EFF',
	'#FF6B6B',
	'#FFD93D',
	'#6BCB77',
	'#FF9B50',
	'#CB77FF',
	'#FF77CB',
	'#77CBFF',
	'#FF77AA',
	'#AAFFBB'
];

// ─── Binary helpers ──────────────────────────────────────────────────────────

function readUint16(data: Uint8Array, pos: number): number {
	return (data[pos]! << 8) | data[pos + 1]!;
}

function readUint32(data: Uint8Array, pos: number): number {
	return (
		((data[pos]! << 24) | (data[pos + 1]! << 16) | (data[pos + 2]! << 8) | data[pos + 3]!) >>> 0
	);
}

function readString(data: Uint8Array, pos: number, len: number): string {
	return String.fromCharCode(...data.slice(pos, pos + len));
}

/** Reads a MIDI variable-length quantity. Returns [value, bytesConsumed]. */
function readVarLen(data: Uint8Array, pos: number): [number, number] {
	let value = 0;
	let bytes = 0;
	let b: number;
	do {
		b = data[pos + bytes]!;
		value = (value << 7) | (b & 0x7f);
		bytes++;
	} while (b & 0x80);
	return [value, bytes];
}

// ─── Track parsing ───────────────────────────────────────────────────────────

interface PendingNote {
	tick: number;
	channel: number;
	noteNumber: number;
	velocity: number;
}

interface ParsedTrack {
	name: string;
	bpm: number | null;
	channels: Set<number>;
	notes: TMidiNote[];
}

function parseTrackChunk(data: Uint8Array, start: number, length: number): ParsedTrack {
	const result: ParsedTrack = {
		name: '',
		bpm: null,
		channels: new Set(),
		notes: []
	};

	let pos = start;
	const end = start + length;
	let currentTick = 0;
	let runningStatus = 0;
	let noteId = 0;

	// Map: (channel * 128 + noteNumber) → pending note-on
	const pending = new Map<number, PendingNote>();

	const closeNote = (tick: number, channel: number, noteNumber: number) => {
		const key = channel * 128 + noteNumber;
		const on = pending.get(key);
		if (on != null) {
			result.notes.push({
				id: noteId++,
				tick: on.tick,
				duration: Math.max(1, tick - on.tick),
				noteNumber: on.noteNumber,
				velocity: on.velocity,
				channel: on.channel
			});
			pending.delete(key);
		}
	};

	while (pos < end) {
		const [delta, deltaBytes] = readVarLen(data, pos);
		pos += deltaBytes;
		currentTick += delta;

		let statusByte: number;
		if (data[pos]! & 0x80) {
			statusByte = data[pos]!;
			pos++;
			// SysEx/meta cancel running status; channel events persist it
			if (statusByte < 0xf0) {
				runningStatus = statusByte;
			}
		} else {
			// Running status: data byte follows without a new status byte
			statusByte = runningStatus;
		}

		const type = statusByte & 0xf0;
		const ch = statusByte & 0x0f;

		if (type === 0x90) {
			const note = data[pos++]!;
			const vel = data[pos++]!;
			if (vel > 0) {
				result.channels.add(ch);
				pending.set(ch * 128 + note, {
					tick: currentTick,
					channel: ch,
					noteNumber: note,
					velocity: vel
				});
			} else {
				closeNote(currentTick, ch, note);
			}
		} else if (type === 0x80) {
			const note = data[pos++]!;
			pos++; // velocity byte (ignored for note-off)
			closeNote(currentTick, ch, note);
		} else if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
			pos += 2;
		} else if (type === 0xc0 || type === 0xd0) {
			pos += 1;
		} else if (statusByte === 0xff) {
			// Meta event
			const metaType = data[pos++]!;
			const [metaLen, metaLenBytes] = readVarLen(data, pos);
			pos += metaLenBytes;
			if (metaType === 0x03 && result.name === '') {
				result.name = readString(data, pos, metaLen);
			} else if (metaType === 0x51 && metaLen === 3) {
				const micros = ((data[pos]! << 16) | (data[pos + 1]! << 8) | data[pos + 2]!) >>> 0;
				if (micros > 0) result.bpm = Math.round(60_000_000 / micros);
			}
			pos += metaLen;
		} else if (statusByte === 0xf0 || statusByte === 0xf7) {
			const [sysexLen, sysexLenBytes] = readVarLen(data, pos);
			pos += sysexLenBytes + sysexLen;
		}
		// Unknown status bytes: skip — can't determine data length, so stop
	}

	return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function parseMidi(buffer: ArrayBuffer): TMidiSong {
	const data = new Uint8Array(buffer);

	if (readString(data, 0, 4) !== 'MThd') {
		throw new Error('Not a valid MIDI file (missing MThd header)');
	}

	const format = readUint16(data, 8);
	const trackCount = readUint16(data, 10);
	const timeDivision = readUint16(data, 12);

	if (timeDivision & 0x8000) {
		throw new Error('SMPTE timing not supported');
	}
	const ticksPerBeat = timeDivision;

	// Parse all track chunks
	let pos = 14; // 8 header bytes + 6 bytes of header data
	const rawTracks: ParsedTrack[] = [];

	for (let i = 0; i < trackCount; i++) {
		if (pos >= data.length) break;
		if (readString(data, pos, 4) !== 'MTrk') break;
		const chunkLen = readUint32(data, pos + 4);
		rawTracks.push(parseTrackChunk(data, pos + 8, chunkLen));
		pos += 8 + chunkLen;
	}

	// Extract global BPM (from conductor track in format 1, or first track otherwise)
	const bpm = rawTracks.find((t) => t.bpm != null)?.bpm ?? 120;

	// Build domain tracks
	let tracks: TMidiTrack[];

	if (format === 0 && rawTracks.length === 1) {
		// Group by channel
		const byChannel = new Map<number, TMidiNote[]>();
		for (const note of rawTracks[0]!.notes) {
			if (!byChannel.has(note.channel)) byChannel.set(note.channel, []);
			byChannel.get(note.channel)!.push(note);
		}
		tracks = Array.from(byChannel.entries()).map(([channel, notes], i) => ({
			id: i,
			name: `Channel ${channel + 1}`,
			channel,
			notes,
			color: TRACK_COLORS[i % TRACK_COLORS.length]!
		}));
	} else {
		// Format 1 (or multi-track format 0): skip conductor if it has no notes
		const instrumentTracks =
			format === 1 && rawTracks.length > 1 && rawTracks[0]!.notes.length === 0
				? rawTracks.slice(1)
				: rawTracks;

		tracks = instrumentTracks.map((raw, i) => ({
			id: i,
			name: raw.name.trim() || `Track ${i + 1}`,
			channel: raw.channels.size === 1 ? (Array.from(raw.channels)[0] ?? null) : null,
			notes: raw.notes,
			color: TRACK_COLORS[i % TRACK_COLORS.length]!
		}));
	}

	const totalTicks =
		tracks.length === 0
			? 0
			: Math.max(...tracks.flatMap((t) => t.notes.map((n) => n.tick + n.duration)));

	const name = rawTracks.find((t) => t.name !== '')?.name.trim() ?? 'Untitled';

	return { name, tracks, ticksPerBeat, totalTicks, bpm };
}
