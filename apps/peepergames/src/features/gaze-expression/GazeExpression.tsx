import React, { useEffect, useRef, useState } from 'react';

export const GazeExpression: React.FC<TGazeExpressionProps> = ({ atlas, size }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const gridSize = atlas.length;
	const centerX = (gridSize - 1) / 2;
	const centerY = (gridSize - 1) / 2;

	// Initial image from center position
	const initialUrl = atlas[centerY]?.[centerX]?.url ?? '';
	const [imageUrl, setImageUrl] = useState<string>(initialUrl);

	// Calculate which atlas position to use based on cursor direction
	const getAtlasPosition = React.useCallback(
		(cursorX: number, cursorY: number, containerRect: DOMRect): { x: number; y: number } => {
			// Cursor position relative to container center
			const relativeX = cursorX - (containerRect.left + containerRect.width / 2);
			const relativeY = cursorY - (containerRect.top + containerRect.height / 2);

			// Normalize to -1 to 1 range
			const maxDistance = Math.max(containerRect.width, containerRect.height) / 2;
			const normalizedX = relativeX / maxDistance;
			const normalizedY = relativeY / maxDistance;

			// Map to atlas coordinates (invert Y because screen Y increases downward)
			// Cursor top-left → face looks top-left → use bottom-right atlas position
			const atlasX = Math.round(centerX - normalizedX * centerX);
			const atlasY = Math.round(centerY - normalizedY * centerY);

			// Clamp to atlas bounds
			return {
				x: Math.max(0, Math.min(gridSize - 1, atlasX)),
				y: Math.max(0, Math.min(gridSize - 1, atlasY))
			};
		},
		[centerX, centerY, gridSize]
	);

	useEffect(() => {
		function handleMouseMove(event: MouseEvent) {
			if (containerRef.current == null) return;

			const rect = containerRef.current.getBoundingClientRect();
			const pos = getAtlasPosition(event.clientX, event.clientY, rect);

			const item = atlas[pos.y]?.[pos.x];
			if (item != null) {
				setImageUrl(item.url);
			}
		}

		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	}, [atlas, getAtlasPosition]);

	return (
		<div ref={containerRef} className="flex items-center justify-center">
			<img src={imageUrl} alt="expression" width={size} height={size} className="object-contain" />
		</div>
	);
};

interface TGazeExpressionProps {
	atlas: TGridItem[][];
	size: number;
}

interface TGridItem {
	url: string;
	filename?: string;
}
