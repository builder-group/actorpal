export interface MidiV3Note {
	id: number;
	tick: number;
	durationTicks: number;
	noteNumber: number;
	velocity: number;
	channel: number;
}

export interface MidiV3Track {
	id: number;
	name: string;
	channel: number | null;
	color: string;
	notes: MidiV3Note[];
	noteCount: number;
	minNote: number;
	maxNote: number;
	startTick: number;
	endTick: number;
}

export interface MidiV3Song {
	name: string;
	fileName: string | null;
	ticksPerBeat: number;
	bpm: number;
	totalTicks: number;
	totalBeats: number;
	durationSeconds: number;
	tracks: MidiV3Track[];
}

export interface MidiV3ViewportRect {
	width: number;
	left: number;
	height: number;
}
