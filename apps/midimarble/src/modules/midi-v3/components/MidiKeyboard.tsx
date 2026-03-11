import React from 'react';
import {
	getMidiV3NoteName,
	isMidiV3BlackKey,
	isMidiV3CNote,
	MIDI_V3_GRID_HEIGHT,
	MIDI_V3_KEYBOARD_WIDTH,
	MIDI_V3_NOTE_HEIGHT,
	MIDI_V3_TOTAL_NOTES
} from '../lib';

export const MidiKeyboard: React.FC<TMidiKeyboardProps> = ({ accentColor }) => {
	return (
		<div
			className="bg-base-50 border-base-200 sticky left-0 z-20 shrink-0 border-r"
			style={{ width: MIDI_V3_KEYBOARD_WIDTH, height: MIDI_V3_GRID_HEIGHT }}
		>
			{Array.from({ length: MIDI_V3_TOTAL_NOTES }, (_, index) => {
				const noteNumber = MIDI_V3_TOTAL_NOTES - 1 - index;
				const isBlackKey = isMidiV3BlackKey(noteNumber);
				const isCNote = isMidiV3CNote(noteNumber);

				return (
					<div
						key={noteNumber}
						className="border-base-200/80 relative border-b"
						style={{
							height: MIDI_V3_NOTE_HEIGHT,
							background: isBlackKey
								? 'linear-gradient(90deg, rgb(15 23 42) 0%, rgb(39 39 42) 100%)'
								: isCNote
									? 'color-mix(in srgb, var(--color-base-0) 82%, white)'
									: 'color-mix(in srgb, var(--color-base-50) 88%, white)'
						}}
					>
						{isCNote && (
							<>
								<div
									className="absolute top-0 right-0 h-full w-1"
									style={{ background: accentColor }}
								/>
								<span className="text-base-700 absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-semibold select-none">
									{getMidiV3NoteName(noteNumber)}
								</span>
							</>
						)}
					</div>
				);
			})}
		</div>
	);
};

interface TMidiKeyboardProps {
	accentColor: string;
}
