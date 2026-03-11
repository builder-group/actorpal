// Piano keyboard column — 128 DOM rows, Signal-style colors.
// Scroll is controlled externally by NoteGrid (shared scroll container).

import React from 'react';
import { isBlackKey, isCNote, NOTE_HEIGHT, PIANO_WIDTH, TOTAL_NOTES } from '../lib';

// Physical piano key colors — these represent actual piano key aesthetics, not UI theme colors.
const KEY = {
	whiteBg: '#d8d8e8',
	cBg: '#d0d8f0',
	blackGradient: 'linear-gradient(to right, #212121 0%, #5d5a5a 89.5%, #303030 92.4%, #000 100%)',
	defaultAccent: 'var(--color-primary)'
} as const;

const BLACK_KEY_WIDTH = Math.round(PIANO_WIDTH * 0.64);

export const PianoKeys: React.FC<TPianoKeysProps> = (props) => {
	const { accentColor = KEY.defaultAccent } = props;

	return (
		<div
			style={{
				width: PIANO_WIDTH,
				height: NOTE_HEIGHT * TOTAL_NOTES,
				flexShrink: 0,
				borderRight: '1px solid var(--color-base-200)'
			}}
		>
			{Array.from({ length: TOTAL_NOTES }, (_, i) => {
				const note = TOTAL_NOTES - 1 - i; // index 0 = note 127 (top)
				return <PianoKeyRow key={note} note={note} accentColor={accentColor} />;
			})}
		</div>
	);
};

// MARK: - Key row

const PianoKeyRow: React.FC<TPianoKeyRowProps> = (props) => {
	const { note, accentColor } = props;
	const black = isBlackKey(note);
	const c = isCNote(note);
	const octave = Math.floor(note / 12) - 1;

	if (black) {
		return (
			<div
				style={{ position: 'relative', height: NOTE_HEIGHT, background: 'var(--color-base-50)' }}
			>
				{/* Black key body — Signal gradient */}
				<div
					style={{
						position: 'absolute',
						left: 0,
						top: 1,
						width: BLACK_KEY_WIDTH,
						height: NOTE_HEIGHT - 2,
						background: KEY.blackGradient
					}}
				/>
				{/* White-key gap divider */}
				<div
					style={{
						position: 'absolute',
						left: BLACK_KEY_WIDTH,
						top: NOTE_HEIGHT / 2,
						right: 0,
						height: 1,
						background: 'var(--color-base-200)'
					}}
				/>
			</div>
		);
	}

	return (
		<div
			style={{
				position: 'relative',
				height: NOTE_HEIGHT,
				background: c ? KEY.cBg : KEY.whiteBg,
				borderBottom: `1px solid var(--color-base-200)`
			}}
		>
			{/* C-note accent bar (Signal pattern: 4px on right edge) */}
			{c && (
				<div
					style={{
						position: 'absolute',
						right: 0,
						top: 0,
						width: 4,
						height: '100%',
						background: accentColor
					}}
				/>
			)}
			{/* C label */}
			{c && (
				<span
					style={{
						position: 'absolute',
						right: 7,
						top: '50%',
						transform: 'translateY(-50%)',
						fontSize: 9,
						fontWeight: 700,
						color: accentColor,
						lineHeight: 1,
						userSelect: 'none'
					}}
				>
					C{octave}
				</span>
			)}
		</div>
	);
};

// MARK: - Types

interface TPianoKeysProps {
	accentColor?: string;
}

interface TPianoKeyRowProps {
	note: number;
	accentColor: string;
}
