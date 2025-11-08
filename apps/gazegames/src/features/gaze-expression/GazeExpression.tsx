import React from 'react';

export const GazeExpression: React.FC<TGazeExpressionProps> = (props) => {
	const { spriteMap, size, targetX, targetY } = props;
	const containerRef = React.useRef<HTMLDivElement>(null);

	const mapSize = React.useMemo(() => spriteMap.length, [spriteMap.length]);
	const centerX = React.useMemo(() => (mapSize - 1) / 2, [mapSize]);
	const centerY = React.useMemo(() => (mapSize - 1) / 2, [mapSize]);

	// Initial state: center position
	const initialUrl = spriteMap[centerY]?.[centerX]?.spriteUrl ?? '';
	const [imageUrl, setImageUrl] = React.useState<string>(initialUrl);

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
			setImageUrl(item.spriteUrl);
		}
	}, [spriteMap, getSpriteMapPosition, targetX, targetY]);

	// =============================================================================
	// UI
	// =============================================================================

	return (
		<div ref={containerRef} className="flex items-center justify-center">
			<img src={imageUrl} alt="expression" width={size} height={size} className="object-contain" />
		</div>
	);
};

interface TGazeExpressionProps {
	spriteMap: TSpriteMapItem[][];
	size: number;
	targetX?: number;
	targetY?: number;
}

interface TSpriteMapItem {
	spriteUrl: string;
}
