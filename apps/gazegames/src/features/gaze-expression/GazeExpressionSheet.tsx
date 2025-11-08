import React from 'react';

export const GazeExpressionSheet: React.FC<TGazeExpressionSheetProps> = (props) => {
	const { spriteMap, size, spriteSheetUrl, targetX, targetY } = props;
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
	const scale = React.useMemo(() => size / spriteSize, [size, spriteSize]);
	const scaledSheetWidth = React.useMemo(() => spriteSheetWidth * scale, [spriteSheetWidth, scale]);
	const scaledSheetHeight = React.useMemo(
		() => spriteSheetHeight * scale,
		[spriteSheetHeight, scale]
	);

	// Initial state: center position
	const initialItem = React.useMemo(
		() => spriteMap[centerY]?.[centerX],
		[spriteMap, centerY, centerX]
	);
	const [currentItem, setCurrentItem] = React.useState<TSpriteMapItem | undefined>(initialItem);

	// =============================================================================
	// Events
	// =============================================================================

	// Calculate which sprite map position to use based on target direction
	const getSpriteMapPosition = React.useCallback(
		(
			targetX: number | undefined,
			targetY: number | undefined,
			containerRect: DOMRect
		): {
			x: number;
			y: number;
		} => {
			// If no target, use center
			if (targetX == null || targetY == null) {
				return { x: centerX, y: centerY };
			}

			// Target position relative to container center
			const relativeX = targetX - (containerRect.left + containerRect.width / 2);
			const relativeY = targetY - (containerRect.top + containerRect.height / 2);

			// Normalize to -1 to 1 range
			const maxDistance = Math.max(containerRect.width, containerRect.height) / 2;
			const normalizedX = relativeX / maxDistance;
			const normalizedY = relativeY / maxDistance;

			// Map to sprite map coordinates (invert Y because screen Y increases downward)
			// Target top-left → face looks top-left → use bottom-right sprite position
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

	// Update based on target position
	React.useEffect(() => {
		if (containerRef.current == null) {
			return;
		}

		const rect = containerRef.current.getBoundingClientRect();
		const pos = getSpriteMapPosition(targetX, targetY, rect);
		const item = spriteMap[pos.y]?.[pos.x];
		if (item != null) {
			setCurrentItem(item);
		}
	}, [spriteMap, getSpriteMapPosition, targetX, targetY]);

	// =============================================================================
	// UI
	// =============================================================================

	if (currentItem == null) {
		return null;
	}

	const backgroundX = -currentItem.spriteSheetX * scale;
	const backgroundY = -currentItem.spriteSheetY * scale;

	return (
		<div ref={containerRef} className="flex items-center justify-center">
			<div
				style={{
					width: size,
					height: size,
					backgroundImage: `url(${spriteSheetUrl})`,
					backgroundSize: `${scaledSheetWidth}px ${scaledSheetHeight}px`,
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
	targetX?: number;
	targetY?: number;
}

interface TSpriteMapItem {
	spriteUrl: string;
	width: number;
	height: number;
	spriteSheetX: number;
	spriteSheetY: number;
}
