import React from 'react';

export const GazeExpression = React.forwardRef<TGazeExpressionRef, TGazeExpressionProps>(
	(props, ref) => {
		const { spriteMap, size, initialTargetX, initialTargetY } = props;
		const containerRef = React.useRef<HTMLDivElement>(null);
		const imageRef = React.useRef<HTMLImageElement>(null);
		const targetRef = React.useRef<{ x: number | undefined; y: number | undefined }>({
			x: initialTargetX,
			y: initialTargetY
		});

		const mapSize = React.useMemo(() => spriteMap.length, [spriteMap.length]);
		const centerX = React.useMemo(() => (mapSize - 1) / 2, [mapSize]);
		const centerY = React.useMemo(() => (mapSize - 1) / 2, [mapSize]);

		// Initial state: center position
		const initialUrl = spriteMap[centerY]?.[centerX]?.spriteUrl ?? '';

		// =============================================================================
		// Events
		// =============================================================================

		const updateImage = React.useCallback(() => {
			if (containerRef.current == null || imageRef.current == null) {
				return;
			}

			const rect = containerRef.current.getBoundingClientRect();
			const targetX = targetRef.current.x;
			const targetY = targetRef.current.y;

			// If no target, use center
			if (targetX == null || targetY == null) {
				const centerItem = spriteMap[centerY]?.[centerX];
				if (centerItem != null) {
					imageRef.current.src = centerItem.spriteUrl;
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
				imageRef.current.src = item.spriteUrl;
			}
		}, [spriteMap, centerX, centerY, mapSize]);

		// =============================================================================
		// Effects
		// =============================================================================

		// Expose updateTarget method via ref
		React.useImperativeHandle(ref, () => ({
			updateTarget: (x: number | undefined, y: number | undefined) => {
				targetRef.current = { x, y };
				updateImage();
			}
		}));

		// Initial render
		React.useEffect(() => {
			updateImage();
		}, [updateImage]);

		// =============================================================================
		// UI
		// =============================================================================

		return (
			<div ref={containerRef} className="flex items-center justify-center">
				<img
					ref={imageRef}
					src={initialUrl}
					alt="expression"
					width={size}
					height={size}
					className="object-contain"
				/>
			</div>
		);
	}
);
GazeExpression.displayName = 'GazeExpression';

export interface TGazeExpressionProps {
	spriteMap: TSpriteMapItem[][];
	size: number;
	initialTargetX?: number;
	initialTargetY?: number;
}

export interface TGazeExpressionRef {
	updateTarget: (x: number | undefined, y: number | undefined) => void;
}

interface TSpriteMapItem {
	spriteUrl: string;
}
