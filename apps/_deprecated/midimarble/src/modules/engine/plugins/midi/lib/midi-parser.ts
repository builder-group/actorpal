import type { TMidiNote, TMidiSong, TMidiTrack } from '../types';

interface TPendingNote {
	tick: number;
	channel: number;
	noteNumber: number;
	velocity: number;
}

interface TParsedTrackChunk {
	name: string;
	bpm: number | null;
	channels: Set<number>;
	notes: TMidiNote[];
}

function readByte(data: Uint8Array, position: number): number {
	const value = data[position];
	if (value == null) {
		throw new Error('Unexpected end of MIDI data.');
	}

	return value;
}

function readUint16(data: Uint8Array, position: number): number {
	return (readByte(data, position) << 8) | readByte(data, position + 1);
}

function readUint32(data: Uint8Array, position: number): number {
	return (
		((readByte(data, position) << 24) |
			(readByte(data, position + 1) << 16) |
			(readByte(data, position + 2) << 8) |
			readByte(data, position + 3)) >>>
		0
	);
}

function readString(data: Uint8Array, position: number, length: number): string {
	return String.fromCharCode(...data.slice(position, position + length));
}

function readVariableLengthValue(data: Uint8Array, position: number): [number, number] {
	let value = 0;
	let bytes = 0;
	let next: number;

	do {
		next = readByte(data, position + bytes);
		value = (value << 7) | (next & 0x7f);
		bytes++;
	} while (next & 0x80);

	return [value, bytes];
}

function parseTrackChunk(data: Uint8Array, start: number, length: number): TParsedTrackChunk {
	const track: TParsedTrackChunk = {
		name: '',
		bpm: null,
		channels: new Set(),
		notes: []
	};

	let position = start;
	let currentTick = 0;
	let runningStatus = 0;
	let noteId = 0;
	const pendingNotes = new Map<number, TPendingNote>();
	const end = start + length;

	const closePendingNote = (tick: number, channel: number, noteNumber: number) => {
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

	while (position < end) {
		const [deltaTick, deltaBytes] = readVariableLengthValue(data, position);
		position += deltaBytes;
		currentTick += deltaTick;

		let statusByte: number;
		if (readByte(data, position) & 0x80) {
			statusByte = readByte(data, position);
			position++;
			if (statusByte < 0xf0) {
				runningStatus = statusByte;
			}
		} else {
			statusByte = runningStatus;
		}

		const type = statusByte & 0xf0;
		const channel = statusByte & 0x0f;

		if (type === 0x90) {
			const noteNumber = readByte(data, position++);
			const velocity = readByte(data, position++);
			if (velocity > 0) {
				track.channels.add(channel);
				pendingNotes.set(channel * 128 + noteNumber, {
					tick: currentTick,
					channel,
					noteNumber,
					velocity
				});
			} else {
				closePendingNote(currentTick, channel, noteNumber);
			}
			continue;
		}

		if (type === 0x80) {
			const noteNumber = readByte(data, position++);
			position++;
			closePendingNote(currentTick, channel, noteNumber);
			continue;
		}

		if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
			position += 2;
			continue;
		}

		if (type === 0xc0 || type === 0xd0) {
			position += 1;
			continue;
		}

		if (statusByte === 0xff) {
			const metaType = readByte(data, position++);
			const [metaLength, metaLengthBytes] = readVariableLengthValue(data, position);
			position += metaLengthBytes;

			if (metaType === 0x03 && track.name === '') {
				track.name = readString(data, position, metaLength);
			}

			if (metaType === 0x51 && metaLength === 3) {
				const microsecondsPerBeat =
					((readByte(data, position) << 16) |
						(readByte(data, position + 1) << 8) |
						readByte(data, position + 2)) >>>
					0;
				if (microsecondsPerBeat > 0) {
					track.bpm = Math.round(60_000_000 / microsecondsPerBeat);
				}
			}

			position += metaLength;
			continue;
		}

		if (statusByte === 0xf0 || statusByte === 0xf7) {
			const [sysexLength, sysexLengthBytes] = readVariableLengthValue(data, position);
			position += sysexLengthBytes + sysexLength;
			continue;
		}

		break;
	}

	return track;
}

function buildTrack(chunk: TParsedTrackChunk, id: number): TMidiTrack {
	return {
		id,
		name: chunk.name.trim() || `Track ${id + 1}`,
		notes: chunk.notes
	};
}

export function parseMidi(buffer: ArrayBuffer, fileName?: string | null): TMidiSong {
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
	const rawTracks: TParsedTrackChunk[] = [];
	let position = 14;

	for (let index = 0; index < trackCount; index++) {
		if (position >= data.length || readString(data, position, 4) !== 'MTrk') {
			break;
		}

		const chunkLength = readUint32(data, position + 4);
		rawTracks.push(parseTrackChunk(data, position + 8, chunkLength));
		position += 8 + chunkLength;
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
						}, new Map<number, TMidiNote[]>())
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

	const totalTicks =
		tracks.length === 0
			? 0
			: Math.max(
					...tracks.map((track) =>
						track.notes.length === 0
							? 0
							: Math.max(...track.notes.map((note) => note.tick + note.durationTicks))
					)
				);
	const songName = rawTracks.find((track) => track.name.trim() !== '')?.name.trim();

	return {
		name: songName || fileName?.replace(/\.midi?$/i, '') || 'Untitled',
		bpm,
		ticksPerBeat,
		totalTicks,
		tracks
	};
}
