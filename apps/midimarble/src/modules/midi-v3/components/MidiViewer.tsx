import { useFeatureState } from 'feature-react';
import React from 'react';
import { MidiFileCxProvider, useMidiFileCx } from '../MidiFileCx';
import { MidiViewportCxProvider } from '../MidiViewportCx';
import { MidiEmptyState } from './MidiEmptyState';
import { MidiPianoRoll } from './MidiPianoRoll';
import { MidiSidebar } from './MidiSidebar';
import { MidiTimelineAxis } from './MidiTimelineAxis';
import { MidiToolbar } from './MidiToolbar';

export const MidiViewerV3: React.FC<TMidiViewerV3Props> = ({ className }) => {
	return (
		<MidiFileCxProvider>
			<MidiViewportCxProvider>
				<div className={className ?? 'h-full w-full'}>
					<InnerMidiViewerV3 />
				</div>
			</MidiViewportCxProvider>
		</MidiFileCxProvider>
	);
};

const InnerMidiViewerV3: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const song = useFeatureState(midiFileCx.$song);

	return (
		<section className="bg-base-100 text-base-950 flex h-full w-full overflow-hidden">
			{song == null ? (
				<MidiEmptyState />
			) : (
				<>
					<MidiSidebar />
					<div className="flex min-w-0 flex-1 flex-col">
						<MidiToolbar />
						<MidiTimelineAxis />
						<MidiPianoRoll />
					</div>
				</>
			)}
		</section>
	);
};

interface TMidiViewerV3Props {
	className?: string;
}
