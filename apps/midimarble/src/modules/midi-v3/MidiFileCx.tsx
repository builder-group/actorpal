import { createState } from 'feature-state';
import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { parseMidiV3 } from './lib';
import type { MidiV3Song } from './types';

export class MidiFileCx {
	public readonly $song = createState<MidiV3Song | null>(null);
	public readonly $selectedTrackId = createState<number | null>(null);
	public readonly $isLoading = createState(false);
	public readonly $error = createState<string | null>(null);
	public readonly $playheadTick = createState(0);
	public readonly $isPlaying = createState(false);

	private _animationFrameId: number | null = null;
	private _lastFrameTime: number | null = null;

	public async loadFile(file: File): Promise<void> {
		this.stop();
		this.$isLoading.set(true);
		this.$error.set(null);

		try {
			const song = parseMidiV3(await file.arrayBuffer(), file.name);
			this.$song.set(song);
			this.$selectedTrackId.set(song.tracks[0]?.id ?? null);
			this.$playheadTick.set(0);
		} catch (error) {
			this.$song.set(null);
			this.$selectedTrackId.set(null);
			this.$error.set(error instanceof Error ? error.message : 'Failed to parse MIDI file.');
		} finally {
			this.$isLoading.set(false);
		}
	}

	public selectTrack(trackId: number): void {
		this.$selectedTrackId.set(trackId);
	}

	public play(): void {
		const song = this.$song.get();
		if (song == null || song.totalTicks <= 0) {
			return;
		}

		if (this.$playheadTick.get() >= song.totalTicks) {
			this.$playheadTick.set(0);
		}

		this.$isPlaying.set(true);
		this._lastFrameTime = null;
		this._tick();
	}

	public pause(): void {
		this.$isPlaying.set(false);
		this._cancelAnimationFrame();
	}

	public stop(): void {
		this.pause();
		this.$playheadTick.set(0);
	}

	public seekToTick(tick: number): void {
		const song = this.$song.get();
		if (song == null) {
			return;
		}

		this.$playheadTick.set(Math.max(0, Math.min(song.totalTicks, tick)));
	}

	private _tick(): void {
		this._animationFrameId = requestAnimationFrame((now) => {
			if (!this.$isPlaying.get()) {
				return;
			}

			const song = this.$song.get();
			if (song == null) {
				return;
			}

			if (this._lastFrameTime != null) {
				const ticksPerSecond = (song.ticksPerBeat * song.bpm) / 60;
				const elapsedSeconds = (now - this._lastFrameTime) / 1000;
				const nextTick = this.$playheadTick.get() + elapsedSeconds * ticksPerSecond;

				if (nextTick >= song.totalTicks) {
					this.$playheadTick.set(song.totalTicks);
					this.$isPlaying.set(false);
					this._cancelAnimationFrame();
					return;
				}

				this.$playheadTick.set(nextTick);
			}

			this._lastFrameTime = now;
			this._tick();
		});
	}

	private _cancelAnimationFrame(): void {
		if (this._animationFrameId != null) {
			cancelAnimationFrame(this._animationFrameId);
		}

		this._animationFrameId = null;
		this._lastFrameTime = null;
	}

	public unmount(): void {
		this._cancelAnimationFrame();
	}
}

const ReactMidiFileCx = React.createContext<MidiFileCx | null>(null);

export const MidiFileCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const midiFileCx = new MidiFileCx();
		return [midiFileCx, () => midiFileCx.unmount()];
	}, []);

	return <ReactMidiFileCx.Provider value={cx}>{children}</ReactMidiFileCx.Provider>;
};

export function useMidiFileCx(): MidiFileCx {
	const cx = React.useContext(ReactMidiFileCx);
	if (cx == null) {
		throw new Error('useMidiFileCx must be used within MidiFileCxProvider');
	}
	return cx;
}
