// Core MIDI domain types for the midi viewer module.

export interface MidiNote {
	id: number;
	tick: number;
	duration: number; // in ticks
	noteNumber: number; // 0–127
	velocity: number; // 0–127
	channel: number; // 0–15
}

export interface MidiTrack {
	id: number;
	name: string;
	channel: number | null; // null when track spans multiple channels
	notes: MidiNote[];
	color: string;
}

export interface MidiSong {
	name: string;
	tracks: MidiTrack[];
	ticksPerBeat: number;
	totalTicks: number;
	bpm: number;
}
