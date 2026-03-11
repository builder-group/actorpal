// Sticky piano keyboard column — 128 DOM rows.
// Proper physical white/black key aesthetics (not UI theme grays).
// Scroll is controlled by the parent scroll container (shared with notes).

import React from 'react';
import { isBlackKey, isCNote, noteName, midiConfig } from '../lib';

const { noteHeight, keyboardWidth, totalNotes } = midiConfig.layout;
const { pianoWhite, pianoWhiteC, pianoBlack } = midiConfig.colors;
const BLACK_KEY_WIDTH = Math.round(keyboardWidth * 0.64);

export const PianoKeys: React.FC<TPianoKeysProps> = ({ accentColor = 'var(--color-primary)' }) => (
	<div
		className="sticky left-0 z-10 shrink-0 border-r"
		style={{ width: keyboardWidth, height: noteHeight * totalNotes, borderColor: 'var(--color-base-200)' }}
	>
		{Array.from({ length: totalNotes }, (_, i) => {
			const note = totalNotes - 1 - i;
			return <KeyRow key={note} note={note} accentColor={accentColor} />;
		})}
	</div>
);

// MARK: - Key row

const KeyRow: React.FC<TKeyRowProps> = ({ note, accentColor }) => {
	if (isBlackKey(note)) {
		return (
			// White-key lane behind the black key
			<div className="relative" style={{ height: noteHeight, background: pianoWhite }}>
				{/* Black key body */}
				<div
					className="absolute left-0"
					style={{ top: 1, width: BLACK_KEY_WIDTH, height: noteHeight - 2, background: pianoBlack }}
				/>
				{/* White-key divider on the right portion */}
				<div
					className="absolute right-0"
					style={{
						left: BLACK_KEY_WIDTH,
						top: noteHeight / 2,
						height: 1,
						background: 'var(--color-base-200)'
					}}
				/>
			</div>
		);
	}

	const c = isCNote(note);
	return (
		<div
			className="relative border-b"
			style={{
				height: noteHeight,
				background: c ? pianoWhiteC : pianoWhite,
				borderColor: 'var(--color-base-200)'
			}}
		>
			{c && (
				<>
					{/* Accent bar on right edge */}
					<div
						className="absolute right-0 top-0 h-full"
						style={{ width: 3, background: accentColor }}
					/>
					{/* C-note label */}
					<span
						className="absolute select-none"
						style={{
							right: 6,
							top: '50%',
							transform: 'translateY(-50%)',
							fontSize: 9,
							fontWeight: 700,
							lineHeight: 1,
							color: accentColor
						}}
					>
						{noteName(note)}
					</span>
				</>
			)}
		</div>
	);
};

// MARK: - Types

interface TPianoKeysProps {
	accentColor?: string;
}

interface TKeyRowProps {
	note: number;
	accentColor: string;
}
