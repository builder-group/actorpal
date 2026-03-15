import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TEngineSystemSet } from '../../types';
import type { TMidiPlugin } from '../midi';
import type { TTransportPlugin } from '../transport';

export type TAudioPlugin = TPlugin<
	{
		name: 'Audio';
		resources: {
			audioState: TAudioState;
			audioConfig: TAudioConfig;
			audioPlaybackFeedback: TAudioPlaybackFeedback;
		};
		appExtensions: {
			resumeAudio(): Promise<void>;
			previewNotesAtTick(tick: number): Promise<void>;
			previewNote(noteId: number): Promise<void>;
			previewMidiNote(noteNumber: number): Promise<void>;
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
}

export interface TAudioConfig {
	enabled: boolean;
	masterVolume: number;
}

export interface TAudioPlaybackFeedback {
	activeNoteIds: Set<number>;
	activeNoteNumbers: Set<number>;
	expiresAtMs: number;
}

export interface TActiveVoice {
	oscillator: OscillatorNode;
	gain: GainNode;
	cleanupId: ReturnType<typeof setTimeout> | null;
}
