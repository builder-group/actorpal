import React from 'react';
import { getMidiNoteName, isMidiBlackKey, isMidiCNote, midiConfig } from '../lib';

const { keyboardWidth, noteHeight, totalNotes } = midiConfig.layout;
const blackKeyWidth = Math.round(keyboardWidth * 0.64);

export const MidiPianoKeys: React.FC<TMidiPianoKeysProps> = React.memo(({ accentColor }) => (
	<div
		className="border-base-200 sticky left-0 z-10 shrink-0 border-r"
		style={{ width: keyboardWidth, height: noteHeight * totalNotes }}
	>
		{Array.from({ length: totalNotes }, (_, index) => {
			const noteNumber = totalNotes - 1 - index;
			return <MidiPianoKeyRow key={noteNumber} accentColor={accentColor} noteNumber={noteNumber} />;
		})}
	</div>
));

MidiPianoKeys.displayName = 'MidiPianoKeys';

const MidiPianoKeyRow: React.FC<TMidiPianoKeyRowProps> = ({ accentColor, noteNumber }) => {
	if (isMidiBlackKey(noteNumber)) {
		return (
			<div className="relative" style={{ height: noteHeight, background: midiConfig.colors.pianoWhite }}>
				<div
					className="absolute left-0"
					style={{
						top: 1,
						width: blackKeyWidth,
						height: noteHeight - 2,
						background: midiConfig.colors.pianoBlack
					}}
				/>

				<div
					className="absolute right-0"
					style={{
						left: blackKeyWidth,
						top: noteHeight / 2,
						height: 1,
						background: 'color-mix(in srgb, var(--color-base-200) 40%, transparent)'
					}}
				/>
			</div>
		);
	}

	const isC = isMidiCNote(noteNumber);

	return (
		<div
			className="border-base-200 relative border-b"
			style={{
				height: noteHeight,
				background: isC ? midiConfig.colors.pianoWhiteC : midiConfig.colors.pianoWhite
			}}
		>
			{isC && (
				<>
					<div className="absolute top-0 right-0 h-full" style={{ width: 4, background: accentColor }} />

					<span
						className="text-base-500 absolute select-none text-[9px] font-bold leading-none"
						style={{
							right: 8,
							top: '50%',
							transform: 'translateY(-50%)'
						}}
					>
						{getMidiNoteName(noteNumber)}
					</span>
				</>
			)}
		</div>
	);
};

interface TMidiPianoKeysProps {
	accentColor: string;
}

interface TMidiPianoKeyRowProps extends TMidiPianoKeysProps {
	noteNumber: number;
}
