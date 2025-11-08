import React from 'react';

export const GazeExpressionSheet = React.forwardRef<
	TGazeExpressionSheetRef,
	TGazeExpressionSheetProps
>((props, ref) => {
	const { spriteMap, size, spriteSheetUrl, initialTargetX, initialTargetY } = props;
	const containerRef = React.useRef<HTMLDivElement>(null);
	const spriteRef = React.useRef<HTMLDivElement>(null);
	const targetRef = React.useRef<{ x: number | undefined; y: number | undefined }>({
		x: initialTargetX,
		y: initialTargetY
	});

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

	// =============================================================================
	// Events
	// =============================================================================

	// Update sprite position
	const updateSprite = React.useCallback(() => {
		if (containerRef.current == null || spriteRef.current == null) {
			return;
		}

		const rect = containerRef.current.getBoundingClientRect();
		const targetX = targetRef.current.x;
		const targetY = targetRef.current.y;

		// If no target, use center
		if (targetX == null || targetY == null) {
			const centerItem = spriteMap[centerY]?.[centerX];
			if (centerItem != null) {
				const bgX = -centerItem.spriteSheetX * scale;
				const bgY = -centerItem.spriteSheetY * scale;
				spriteRef.current.style.backgroundPosition = `${bgX}px ${bgY}px`;
			}
			return;
		}

		// Target position relative to container center
		const relativeX = targetX - (rect.left + rect.width / 2);
		const relativeY = targetY - (rect.top + rect.height / 2);

		// Normalize to -1 to 1 range
		const maxDistance = Math.max(rect.width, rect.height) / 2;
		const normalizedX = relativeX / maxDistance;
		const normalizedY = relativeY / maxDistance;

		// Map to sprite map coordinates
		const mapX = Math.round(centerX - normalizedX * centerX);
		const mapY = Math.round(centerY - normalizedY * centerY);

		// Clamp to sprite map bounds
		const clampedX = Math.max(0, Math.min(mapSize - 1, mapX));
		const clampedY = Math.max(0, Math.min(mapSize - 1, mapY));

		const item = spriteMap[clampedY]?.[clampedX];
		if (item != null) {
			const bgX = -item.spriteSheetX * scale;
			const bgY = -item.spriteSheetY * scale;
			spriteRef.current.style.backgroundPosition = `${bgX}px ${bgY}px`;
		}
	}, [spriteMap, centerX, centerY, mapSize, scale]);

	// =============================================================================
	// Effects
	// =============================================================================

	// Expose updateTarget method via ref
	React.useImperativeHandle(ref, () => ({
		updateTarget: (x: number | undefined, y: number | undefined) => {
			targetRef.current = { x, y };
			updateSprite();
		}
	}));

	// Initial render
	React.useEffect(() => {
		updateSprite();
	}, [updateSprite]);

	// =============================================================================
	// UI
	// =============================================================================

	return (
		<div ref={containerRef} className="flex items-center justify-center">
			<div
				ref={spriteRef}
				style={{
					width: size,
					height: size,
					backgroundImage: `url(${spriteSheetUrl})`,
					backgroundSize: `${scaledSheetWidth}px ${scaledSheetHeight}px`,
					backgroundRepeat: 'no-repeat'
				}}
				className="object-contain"
			/>
		</div>
	);
});
GazeExpressionSheet.displayName = 'GazeExpressionSheet';

export interface TGazeExpressionSheetProps {
	spriteMap: TSpriteMapItem[][];
	size: number;
	spriteSheetUrl: string;
	initialTargetX?: number;
	initialTargetY?: number;
}

export interface TGazeExpressionSheetRef {
	updateTarget: (x: number | undefined, y: number | undefined) => void;
}

interface TSpriteMapItem {
	spriteUrl: string;
	width: number;
	height: number;
	spriteSheetX: number;
	spriteSheetY: number;
}
