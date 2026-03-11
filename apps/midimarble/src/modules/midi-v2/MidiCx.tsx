// Song data, track selection, and playback transport.
// Zoom and scroll state lives in TimelineCx — keep these concerns separate.

import { createState } from 'feature-state';
import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { parseMidi } from './lib';
import type { TMidiSong, TMidiTrack } from './types';

export class MidiCx {
	public readonly $song = createState<TMidiSong | null>(null);
	public readonly $selectedTrackId = createState<number | null>(null);
	public readonly $isLoading = createState(false);
	public readonly $error = createState<string | null>(null);
	public readonly $playheadTick = createState(0);
	public readonly $isPlaying = createState(false);

	private _rafId: number | null = null;
	private _lastFrameTime: number | null = null;

	// MARK: - File loading

	public async loadFile(file: File): Promise<void> {
		this.stop();
		this.$isLoading.set(true);
		this.$error.set(null);
		try {
			const buffer = await file.arrayBuffer();
			const song = parseMidi(buffer);
			if (song.name === 'Untitled') {
				(song as TMidiSong).name = file.name.replace(/\.midi?$/i, '');
			}
			this.$song.set(song);
			this.$selectedTrackId.set(song.tracks[0]?.id ?? null);
			this.$playheadTick.set(0);
		} catch (err) {
			this.$error.set(err instanceof Error ? err.message : 'Failed to parse MIDI file');
			this.$song.set(null);
		} finally {
			this.$isLoading.set(false);
		}
	}

	// MARK: - Track selection

	public selectTrack(track: TMidiTrack): void {
		this.$selectedTrackId.set(track.id);
	}

	// MARK: - Playback

	public play(): void {
		const song = this.$song.get();
		if (song == null) return;
		if (this.$playheadTick.get() >= song.totalTicks) this.$playheadTick.set(0);
		this.$isPlaying.set(true);
		this._lastFrameTime = null;
		this._tick();
	}

	public pause(): void {
		this.$isPlaying.set(false);
		this._cancel();
	}

	public stop(): void {
		this.pause();
		this.$playheadTick.set(0);
	}

	public seekTo(tick: number): void {
		const song = this.$song.get();
		if (song == null) return;
		this.$playheadTick.set(Math.max(0, Math.min(tick, song.totalTicks)));
	}

	private _tick(): void {
		this._rafId = requestAnimationFrame((now) => {
			if (!this.$isPlaying.get()) return;
			const song = this.$song.get();
			if (song == null) return;

			if (this._lastFrameTime != null) {
				const ticksPerSecond = (song.ticksPerBeat * song.bpm) / 60;
				const next =
					this.$playheadTick.get() + ((now - this._lastFrameTime) / 1000) * ticksPerSecond;
				if (next >= song.totalTicks) {
					this.$playheadTick.set(song.totalTicks);
					this.$isPlaying.set(false);
					return;
				}
				this.$playheadTick.set(next);
			}

			this._lastFrameTime = now;
			this._tick();
		});
	}

	private _cancel(): void {
		if (this._rafId != null) cancelAnimationFrame(this._rafId);
		this._rafId = null;
		this._lastFrameTime = null;
	}

	public unmount(): void {
		this._cancel();
	}
}

// MARK: - React context

const ReactMidiCx = React.createContext<MidiCx | null>(null);

export const MidiCxProvider: React.FC<{ children: React.ReactNode }> = (props) => {
	const { children } = props;
	const cx = useMemoCleanup(() => {
		const midiCx = new MidiCx();
		return [midiCx, () => midiCx.unmount()];
	}, []);
	return <ReactMidiCx.Provider value={cx}>{children}</ReactMidiCx.Provider>;
};

export function useMidiCx(): MidiCx {
	const cx = React.useContext(ReactMidiCx);
	if (cx == null) throw new Error('useMidiCx must be used within MidiCxProvider');
	return cx;
}
