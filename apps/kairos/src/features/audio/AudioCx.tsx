import { createState, type TState } from 'feature-state';
import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { getSystemSounds, play, stop } from '@/modules/audio';

export class AudioCx {
	public readonly $sounds: TState<string[], []>;

	constructor() {
		this.$sounds = createState<string[]>([]);
	}

	public async mount(): Promise<void> {
		try {
			const sounds = await getSystemSounds();
			if (sounds.length > 0) {
				this.$sounds.set(sounds);
			}
		} catch {
			// do nothing
		}
	}

	public play(name: string): void {
		play(name).catch((e) => {
			if (__DEV__) console.error('[Audio] play failed:', e);
		});
	}

	public stop(): void {
		stop();
	}
}

// MARK: - React Context

const AudioCxContext = React.createContext<AudioCx | null>(null);

export const AudioCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => [new AudioCx(), () => {}], []);

	React.useEffect(() => {
		cx.mount();
	}, [cx]);

	return <AudioCxContext.Provider value={cx}>{children}</AudioCxContext.Provider>;
};

export function useAudioCx(): AudioCx {
	const cx = React.useContext(AudioCxContext);
	if (cx == null) {
		throw new Error('useAudioCx must be used within an AudioCxProvider');
	}
	return cx;
}
