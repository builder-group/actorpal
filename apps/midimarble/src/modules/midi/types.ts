export interface MidiNote {
	id: number;
	tick: number;
	durationTicks: number;
	noteNumber: number;
	velocity: number;
	channel: number;
}

export interface MidiTrack {
	id: number;
	name: string;
	channel: number | null;
	color: string;
	notes: MidiNote[];
	noteCount: number;
	minNote: number;
	maxNote: number;
	startTick: number;
	endTick: number;
}

export interface MidiSong {
	name: string;
	fileName: string | null;
	ticksPerBeat: number;
	bpm: number;
	totalTicks: number;
	totalBeats: number;
	durationSeconds: number;
	tracks: MidiTrack[];
}

export interface MidiViewportRect {
	width: number;
	height: number;
	left: number;
}
