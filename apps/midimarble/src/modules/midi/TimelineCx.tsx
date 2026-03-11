// Timeline UI state: zoom level and scroll position.
// Separated from MidiCx so zoom/scroll concerns don't mix with song/playback data.

import React from 'react';
import { createState } from 'feature-state';
import { useMemoCleanup } from '@/hooks';

export class TimelineCx {
	public readonly $pixelsPerBeat = createState(80);
	public readonly $scrollLeft = createState(0);
	public readonly $scrollTop = createState(0);

	public setZoom(v: number): void {
		this.$pixelsPerBeat.set(Math.max(20, Math.min(600, v)));
	}

	public zoomIn(): void {
		this.setZoom(this.$pixelsPerBeat.get() * 1.25);
	}

	public zoomOut(): void {
		this.setZoom(this.$pixelsPerBeat.get() / 1.25);
	}

	public unmount(): void {
		// Nothing to clean up
	}
}

// MARK: - React context

const ReactTimelineCx = React.createContext<TimelineCx | null>(null);

export const TimelineCxProvider: React.FC<{ children: React.ReactNode }> = (props) => {
	const { children } = props;
	const cx = useMemoCleanup(() => {
		const timelineCx = new TimelineCx();
		return [timelineCx, () => timelineCx.unmount()];
	}, []);
	return <ReactTimelineCx.Provider value={cx}>{children}</ReactTimelineCx.Provider>;
};

export function useTimelineCx(): TimelineCx {
	const cx = React.useContext(ReactTimelineCx);
	if (cx == null) throw new Error('useTimelineCx must be used within TimelineCxProvider');
	return cx;
}
