// Zero-dependency binary MIDI parser.
// Supports Format 0 (single track, split by channel) and Format 1 (multi-track).

import type { MidiNote, MidiSong, MidiTrack } from '../types';
import { midiConfig } from './midi-config';

// MARK: - Binary helpers

function readUint16(data: Uint8Array, pos: number): number {
	return (data[pos]! << 8) | data[pos + 1]!;
}

function readUint32(data: Uint8Array, pos: number): number {
	return (
		((data[pos]! << 24) | (data[pos + 1]! << 16) | (data[pos + 2]! << 8) | data[pos + 3]!) >>> 0
	);
}

function readString(data: Uint8Array, pos: number, length: number): string {
	return String.fromCharCode(...data.slice(pos, pos + length));
}

function readVarLength(data: Uint8Array, pos: number): [value: number, byteCount: number] {
	let value = 0;
	let bytes = 0;
	let next: number;
	do {
		next = data[pos + bytes]!;
		value = (value << 7) | (next & 0x7f);
		bytes++;
	} while (next & 0x80);
	return [value, bytes];
}

// MARK: - Track chunk parsing

interface RawTrack {
	name: string;
	bpm: number | null;
	channels: Set<number>;
	notes: MidiNote[];
}

interface PendingNote {
	tick: number;
	channel: number;
	noteNumber: number;
	velocity: number;
}

function parseTrackChunk(data: Uint8Array, start: number, length: number): RawTrack {
	const track: RawTrack = { name: '', bpm: null, channels: new Set(), notes: [] };

	let pos = start;
	let currentTick = 0;
	let runningStatus = 0;
	let noteId = 0;
	const end = start + length;
	const pending = new Map<number, PendingNote>();

	const closeNote = (tick: number, channel: number, noteNumber: number) => {
		const key = channel * 128 + noteNumber;
		const active = pending.get(key);
		if (active == null) return;
		track.notes.push({
			id: noteId++,
			tick: active.tick,
			durationTicks: Math.max(1, tick - active.tick),
			noteNumber: active.noteNumber,
			velocity: active.velocity,
			channel: active.channel
		});
		pending.delete(key);
	};

	while (pos < end) {
		const [delta, deltaBytes] = readVarLength(data, pos);
		pos += deltaBytes;
		currentTick += delta;

		let statusByte: number;
		if (data[pos]! & 0x80) {
			statusByte = data[pos]!;
			pos++;
			if (statusByte < 0xf0) runningStatus = statusByte;
		} else {
			statusByte = runningStatus;
		}

		const type = statusByte & 0xf0;
		const channel = statusByte & 0x0f;

		if (type === 0x90) {
			const noteNumber = data[pos++]!;
			const velocity = data[pos++]!;
			if (velocity > 0) {
				track.channels.add(channel);
				pending.set(channel * 128 + noteNumber, { tick: currentTick, channel, noteNumber, velocity });
			} else {
				closeNote(currentTick, channel, noteNumber);
			}
			continue;
		}

		if (type === 0x80) {
			const noteNumber = data[pos++]!;
			pos++; // velocity ignored for note-off
			closeNote(currentTick, channel, noteNumber);
			continue;
		}

		// 2-byte messages: aftertouch, control change, pitch bend
		if (type === 0xa0 || type === 0xb0 || type === 0xe0) { pos += 2; continue; }
		// 1-byte messages: program change, channel pressure
		if (type === 0xc0 || type === 0xd0) { pos += 1; continue; }

		if (statusByte === 0xff) {
			const metaType = data[pos++]!;
			const [metaLength, metaLengthBytes] = readVarLength(data, pos);
			pos += metaLengthBytes;

			if (metaType === 0x03 && track.name === '') {
				track.name = readString(data, pos, metaLength);
			}
			if (metaType === 0x51 && metaLength === 3) {
				const us = ((data[pos]! << 16) | (data[pos + 1]! << 8) | data[pos + 2]!) >>> 0;
				if (us > 0) track.bpm = Math.round(60_000_000 / us);
			}

			pos += metaLength;
			continue;
		}

		if (statusByte === 0xf0 || statusByte === 0xf7) {
			const [sysexLen, sysexLenBytes] = readVarLength(data, pos);
			pos += sysexLenBytes + sysexLen;
			continue;
		}

		break;
	}

	return track;
}

// MARK: - Track building

function buildTrack(raw: RawTrack, id: number): MidiTrack {
	const { notes } = raw;
	const noteCount = notes.length;
	const minNote = noteCount === 0 ? 0 : Math.min(...notes.map((n) => n.noteNumber));
	const maxNote = noteCount === 0 ? 0 : Math.max(...notes.map((n) => n.noteNumber));
	const startTick = noteCount === 0 ? 0 : Math.min(...notes.map((n) => n.tick));
	const endTick = noteCount === 0 ? 0 : Math.max(...notes.map((n) => n.tick + n.durationTicks));

	return {
		id,
		name: raw.name.trim() || `Track ${id + 1}`,
		channel: raw.channels.size === 1 ? (Array.from(raw.channels)[0] ?? null) : null,
		color: midiConfig.colors.trackPalette[id % midiConfig.colors.trackPalette.length]!,
		notes,
		noteCount,
		minNote,
		maxNote,
		startTick,
		endTick
	};
}

// MARK: - Public API

export function parseMidi(buffer: ArrayBuffer, fileName?: string | null): MidiSong {
	const data = new Uint8Array(buffer);

	if (readString(data, 0, 4) !== 'MThd') {
		throw new Error('Not a valid MIDI file. Missing MThd header.');
	}

	const format = readUint16(data, 8);
	const trackCount = readUint16(data, 10);
	const timeDivision = readUint16(data, 12);

	if (timeDivision & 0x8000) {
		throw new Error('SMPTE MIDI timing is not supported.');
	}

	const ticksPerBeat = timeDivision;
	const rawTracks: RawTrack[] = [];

	let pos = 14;
	for (let i = 0; i < trackCount; i++) {
		if (pos >= data.length || readString(data, pos, 4) !== 'MTrk') break;
		const chunkLength = readUint32(data, pos + 4);
		rawTracks.push(parseTrackChunk(data, pos + 8, chunkLength));
		pos += 8 + chunkLength;
	}

	const bpm = rawTracks.find((t) => t.bpm != null)?.bpm ?? 120;

	// Format 0: split single track by channel
	// Format 1: skip the first (tempo-only) track if it has no notes
	const tracks =
		format === 0 && rawTracks.length === 1
			? Array.from(
					rawTracks[0]!.notes.reduce((map, note) => {
						const notes = map.get(note.channel) ?? [];
						notes.push(note);
						map.set(note.channel, notes);
						return map;
					}, new Map<number, MidiNote[]>()).entries()
				).map(([channel, notes]) =>
					buildTrack({ name: `Channel ${channel + 1}`, bpm: null, channels: new Set([channel]), notes }, channel)
				)
			: (format === 1 && rawTracks.length > 1 && rawTracks[0]!.notes.length === 0
					? rawTracks.slice(1)
					: rawTracks
				).map((t, i) => buildTrack(t, i));

	const totalTicks = tracks.length === 0 ? 0 : Math.max(...tracks.map((t) => t.endTick));
	const totalBeats = ticksPerBeat === 0 ? 0 : Math.ceil(totalTicks / ticksPerBeat);
	const durationSeconds = totalBeats * (60 / bpm);
	const songName = rawTracks.find((t) => t.name.trim() !== '')?.name.trim();

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
