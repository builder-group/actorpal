export interface TMidiNote {
	id: number;
	tick: number;
	duration: number;
	noteNumber: number;
	velocity: number;
	channel: number;
}

export interface TMidiTrack {
	id: number;
	name: string;
	channel: number | null;
	notes: TMidiNote[];
	color: string;
}

export interface TMidiSong {
	name: string;
	tracks: TMidiTrack[];
	ticksPerBeat: number;
	totalTicks: number;
	bpm: number;
}
