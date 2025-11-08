import React from 'react';

export const GazeExpressionSheet: React.FC<TGazeExpressionSheetProps> = (props) => {
	const { spriteMap, size, spriteSheetUrl } = props;
	const containerRef = React.useRef<HTMLDivElement>(null);

	const mapSize = React.useMemo(() => spriteMap.length, [spriteMap.length]);
	const spriteSize = React.useMemo(() => {
		const firstItem = spriteMap[0]?.[0];
		return firstItem?.width ?? 512;
	}, [spriteMap]);
	const centerX = React.useMemo(() => (mapSize - 1) / 2, [mapSize]);
	const centerY = React.useMemo(() => (mapSize - 1) / 2, [mapSize]);
	const spriteSheetWidth = React.useMemo(() => mapSize * spriteSize, [mapSize, spriteSize]);
	const spriteSheetHeight = React.useMemo(() => mapSize * spriteSize, [mapSize, spriteSize]);

	// Initial state: center position
	const initialItem = React.useMemo(
		() => spriteMap[centerY]?.[centerX],
		[spriteMap, centerY, centerX]
	);
	const [currentItem, setCurrentItem] = React.useState<TSpriteMapItem | undefined>(initialItem);

	// =============================================================================
	// Events
	// =============================================================================

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

	// =============================================================================
	// Effects
	// =============================================================================

	React.useEffect(() => {
		function handleMouseMove(event: MouseEvent) {
			if (containerRef.current == null) {
				return;
			}

			const rect = containerRef.current.getBoundingClientRect();
			const pos = getSpriteMapPosition(event.clientX, event.clientY, rect);

			const item = spriteMap[pos.y]?.[pos.x];
			if (item != null) {
				setCurrentItem(item);
			}
		}

		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	}, [spriteMap, getSpriteMapPosition]);

	// =============================================================================
	// UI
	// =============================================================================

	if (currentItem == null) {
		return null;
	}

	const backgroundX = -currentItem.spriteSheetX;
	const backgroundY = -currentItem.spriteSheetY;

	return (
		<div ref={containerRef} className="flex items-center justify-center">
			<div
				style={{
					width: size,
					height: size,
					backgroundImage: `url(${spriteSheetUrl})`,
					backgroundSize: `${spriteSheetWidth}px ${spriteSheetHeight}px`,
					backgroundPosition: `${backgroundX}px ${backgroundY}px`,
					backgroundRepeat: 'no-repeat'
				}}
				className="object-contain"
			/>
		</div>
	);
};

interface TGazeExpressionSheetProps {
	spriteMap: TSpriteMapItem[][];
	size: number;
	spriteSheetUrl: string;
}

interface TSpriteMapItem {
	spriteUrl: string;
	width: number;
	height: number;
	spriteSheetX: number;
	spriteSheetY: number;
}
