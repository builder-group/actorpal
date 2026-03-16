import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TimelineHeader } from './TimelineHeader';

describe('TimelineHeader', () => {
	it('renders the selected instrument and routes changes through the callback', () => {
		const onSetInstrument = vi.fn();

		const tree = TimelineHeader({
			canControlPlayback: true,
			canEditNotes: true,
			canZoom: true,
			isImporting: false,
			importLabel: 'Open MIDI',
			importError: null,
			mode: 'paused',
			previewEnabled: false,
			trackName: 'Lead',
			bpm: 120,
			playheadTick: 0,
			liveStep: 0,
			preloadedLabel: 'Preloaded 0',
			selectedNoteLabel: null,
			keyboardMode: 'adaptive',
			trackId: 1,
			trackOptions: [{ id: 1, name: 'Lead' }],
			instrumentId: 'bell',
			instrumentOptions: [
				{ id: 'classic', label: 'Classic' },
				{ id: 'bell', label: 'Bell' },
				{ id: 'lead', label: 'Lead' }
			],
			onOpenMidi: vi.fn(),
			onSetTrack: vi.fn(),
			onSetInstrument,
			onSetKeyboardMode: vi.fn(),
			onStepBackwardTick: vi.fn(),
			onStepForwardTick: vi.fn(),
			onPlay: vi.fn(),
			onPause: vi.fn(),
			onReset: vi.fn(),
			onTogglePreview: vi.fn(),
			onZoomOut: vi.fn(),
			onZoomIn: vi.fn()
		}) as React.ReactNode;

		const select = findElement(tree, 'select');
		expect(select).not.toBeNull();
		expect(select?.props['value']).toBe('bell');

		select?.props['onChange']?.({ target: { value: 'lead' } });
		expect(onSetInstrument).toHaveBeenCalledWith('lead');
	});

	it('hides the instrument control when no playable track is selected', () => {
		const tree = TimelineHeader({
			canControlPlayback: false,
			canEditNotes: false,
			canZoom: false,
			isImporting: false,
			importLabel: 'Open MIDI',
			importError: null,
			mode: 'paused',
			previewEnabled: false,
			trackName: null,
			bpm: null,
			playheadTick: 0,
			liveStep: 0,
			preloadedLabel: 'Preloaded 0',
			selectedNoteLabel: null,
			keyboardMode: 'adaptive',
			trackId: null,
			trackOptions: [],
			instrumentId: null,
			instrumentOptions: [],
			onOpenMidi: vi.fn(),
			onSetTrack: vi.fn(),
			onSetInstrument: vi.fn(),
			onSetKeyboardMode: vi.fn(),
			onStepBackwardTick: vi.fn(),
			onStepForwardTick: vi.fn(),
			onPlay: vi.fn(),
			onPause: vi.fn(),
			onReset: vi.fn(),
			onTogglePreview: vi.fn(),
			onZoomOut: vi.fn(),
			onZoomIn: vi.fn()
		}) as React.ReactNode;

		expect(findElement(tree, 'select')).toBeNull();
	});
});

type TInspectableElement = React.ReactElement<{
	children?: React.ReactNode;
	value?: string;
	onChange?: (event: { target: { value: string } }) => void;
}>;

function findElement(node: React.ReactNode, type: string): TInspectableElement | null {
	if (!React.isValidElement(node)) {
		if (Array.isArray(node)) {
			for (const child of node) {
				const match = findElement(child, type);
				if (match != null) {
					return match;
				}
			}
		}
		return null;
	}

	if (node.type === type) {
		return node as TInspectableElement;
	}

	const element = node as React.ReactElement<{ children?: React.ReactNode }>;
	return findElement(element.props.children, type);
}
