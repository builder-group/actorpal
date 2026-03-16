import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TEngineSystemSet } from '../../types';
import type { TMidiPlugin } from '../midi';
import type { TTransportPlugin } from '../transport';

export type TAudioPlugin = TPlugin<
	{
		name: 'Audio';
		resources: {
			audioState: TAudioState;
			audioSettings: TAudioSettings;
			audioPlaybackFeedback: TAudioPlaybackFeedback;
		};
		appExtensions: {
			resumeAudio(): Promise<void>;
			previewNotesAtTick(tick: number): Promise<void>;
			previewNote(noteId: number): Promise<void>;
			previewMidiNote(noteNumber: number): Promise<void>;
			previewTrackInstrument(trackId: number): Promise<void>;
			updateAudioSettings(patch: Partial<TAudioSettings>): void;
			setTrackInstrument(trackId: number, instrumentId: TAudioInstrumentId): void;
			clearTrackInstruments(): void;
			disposeAudio(): void;
		};
		systemSets: TEngineSystemSet;
	},
	[TDefaultPlugin, TMidiPlugin, TTransportPlugin]
>;

export type TAudioApp = TApp<
	TAppContext<[TDefaultPlugin, TMidiPlugin, TTransportPlugin, TAudioPlugin]>
>;

export interface TAudioState {
	context: AudioContext | null;
	masterGain: GainNode | null;
	isEnabled: boolean;
	lastProcessedTick: number;
	lastMode: 'paused' | 'running';
	activeVoices: Map<number, TActiveVoice[]>;
	instrumentPlayers: Partial<Record<TAudioInstrumentId, TAudioInstrumentPlayer>>;
}

export type TAudioInstrumentId = 'classic' | 'bell' | 'xylophone' | 'warm' | 'pluck' | 'lead';

export interface TAudioSettings {
	enabled: boolean;
	masterVolume: number;
	trackInstrumentIds: Record<number, TAudioInstrumentId>;
}

export interface TAudioPlaybackFeedback {
	activeNoteIds: Set<number>;
	activeNoteNumbers: Set<number>;
	expiresAtMs: number;
}

export interface TAudioInstrumentOption {
	id: TAudioInstrumentId;
	label: string;
}

export interface TAudioInstrumentPlayer {
	connect(destination: AudioNode): unknown;
	dispose(): unknown;
	releaseAll(time?: number): unknown;
	triggerAttackRelease(note: number, duration: number, time?: number, velocity?: number): unknown;
}

export interface TActiveVoice {
	instrumentId: TAudioInstrumentId;
	noteNumber: number;
	cleanupId: ReturnType<typeof setTimeout> | null;
}
