import React from 'react';

export const GazeExpression: React.FC<TGazeExpressionProps> = (props) => {
	const { spriteMap, size } = props;
	const containerRef = React.useRef<HTMLDivElement>(null);
	const mapSize = spriteMap.length;
	const centerX = (mapSize - 1) / 2;
	const centerY = (mapSize - 1) / 2;

	// Initial image from center position
	const initialUrl = spriteMap[centerY]?.[centerX]?.spriteUrl ?? '';
	const [imageUrl, setImageUrl] = React.useState<string>(initialUrl);

	// Calculate which sprite map position to use based on cursor direction
	const getSpriteMapPosition = React.useCallback(
		(cursorX: number, cursorY: number, containerRect: DOMRect): { x: number; y: number } => {
			// Cursor position relative to container center
			const relativeX = cursorX - (containerRect.left + containerRect.width / 2);
			const relativeY = cursorY - (containerRect.top + containerRect.height / 2);

			// Normalize to -1 to 1 range
			const maxDistance = Math.max(containerRect.width, containerRect.height) / 2;
			const normalizedX = relativeX / maxDistance;
			const normalizedY = relativeY / maxDistance;

			// Map to sprite map coordinates (invert Y because screen Y increases downward)
			// Cursor top-left → face looks top-left → use bottom-right sprite position
			const mapX = Math.round(centerX - normalizedX * centerX);
			const mapY = Math.round(centerY - normalizedY * centerY);

			// Clamp to sprite map bounds
			return {
				x: Math.max(0, Math.min(mapSize - 1, mapX)),
				y: Math.max(0, Math.min(mapSize - 1, mapY))
			};
		},
		[centerX, centerY, mapSize]
	);

	React.useEffect(() => {
		function handleMouseMove(event: MouseEvent) {
			if (containerRef.current == null) return;

			const rect = containerRef.current.getBoundingClientRect();
			const pos = getSpriteMapPosition(event.clientX, event.clientY, rect);

			const item = spriteMap[pos.y]?.[pos.x];
			if (item != null) {
				setImageUrl(item.spriteUrl);
			}
		}

		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	}, [spriteMap, getSpriteMapPosition]);

	return (
		<div ref={containerRef} className="flex items-center justify-center">
			<img src={imageUrl} alt="expression" width={size} height={size} className="object-contain" />
		</div>
	);
};

interface TGazeExpressionProps {
	spriteMap: TSpriteMapItem[][];
	size: number;
}

interface TSpriteMapItem {
	spriteUrl: string;
	filename?: string;
}
