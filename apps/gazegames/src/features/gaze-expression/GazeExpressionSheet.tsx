import React from 'react';

export const GazeExpressionSheet = React.forwardRef<
	TGazeExpressionSheetRef,
	TGazeExpressionSheetProps
>((props, ref) => {
	const {
		spriteMap,
		size,
		spriteSheetUrl,
		initialTargetX,
		initialTargetY,
		smoothness = 0.2,
		shouldAnimate = true
	} = props;
	const containerRef = React.useRef<HTMLDivElement>(null);
	const spriteRef = React.useRef<HTMLDivElement>(null);
	const targetRef = React.useRef<{ x: number | undefined; y: number | undefined }>({
		x: initialTargetX,
		y: initialTargetY
	});
	const currentRef = React.useRef<{ x: number | undefined; y: number | undefined }>({
		x: initialTargetX,
		y: initialTargetY
	});
	const animationFrameRef = React.useRef<number | null>(null);

	// Sprite calculations
	const mapSize = spriteMap.length;
	const spriteSize = spriteMap[0]?.[0]?.width ?? 512;
	const center = (mapSize - 1) / 2;
	const scale = size / spriteSize;
	const scaledSheetSize = mapSize * spriteSize * scale;

	// =============================================================================
	// Events
	// =============================================================================

	// Update sprite to current interpolated position
	const updateSprite = React.useCallback(() => {
		if (containerRef.current == null || spriteRef.current == null) {
			return;
		}

		const rect = containerRef.current.getBoundingClientRect();
		const { x, y } = currentRef.current;

		// Use center sprite if no position
		if (x == null || y == null) {
			const centerSprite = spriteMap[center]?.[center];
			if (centerSprite != null) {
				const bgX = -centerSprite.spriteSheetX * scale;
				const bgY = -centerSprite.spriteSheetY * scale;
				spriteRef.current.style.backgroundPosition = `${bgX}px ${bgY}px`;
			}
			return;
		}

		// Calculate position relative to container center
		const relativeX = x - (rect.left + rect.width / 2);
		const relativeY = y - (rect.top + rect.height / 2);
		const maxDistance = Math.max(rect.width, rect.height) / 2;

		// Normalize to -1 to 1 and map to sprite coordinates
		const normalizedX = relativeX / maxDistance;
		const normalizedY = relativeY / maxDistance;
		const mapX = Math.round(center - normalizedX * center);
		const mapY = Math.round(center - normalizedY * center);

		// Clamp and render
		const clampedX = Math.max(0, Math.min(mapSize - 1, mapX));
		const clampedY = Math.max(0, Math.min(mapSize - 1, mapY));
		const sprite = spriteMap[clampedY]?.[clampedX];

		if (sprite != null) {
			const bgX = -sprite.spriteSheetX * scale;
			const bgY = -sprite.spriteSheetY * scale;
			spriteRef.current.style.backgroundPosition = `${bgX}px ${bgY}px`;
		}
	}, [spriteMap, center, mapSize, scale]);

	// Animation loop - interpolate current position toward target
	const animateRef = React.useRef<() => void>(undefined);

	React.useEffect(() => {
		animateRef.current = () => {
			const target = targetRef.current;
			const current = currentRef.current;

			// Snap to target if no position data
			if (target.x == null || target.y == null || current.x == null || current.y == null) {
				currentRef.current = target;
				updateSprite();
				return;
			}

			// Interpolate toward target
			const newX = current.x + (target.x - current.x) * smoothness;
			const newY = current.y + (target.y - current.y) * smoothness;

			// Stop when close enough (within 1px)
			const distance = Math.hypot(target.x - newX, target.y - newY);
			if (distance < 1) {
				currentRef.current = target;
				updateSprite();
				return;
			}

			// Continue animation
			currentRef.current = { x: newX, y: newY };
			updateSprite();
			animationFrameRef.current = requestAnimationFrame(() => animateRef.current?.());
		};
	}, [updateSprite, smoothness]);

	// =============================================================================
	// Effects
	// =============================================================================

	// Expose updateTarget to parent
	React.useImperativeHandle(ref, () => ({
		updateTarget: (x: number | undefined, y: number | undefined) => {
			targetRef.current = { x, y };
			if (animationFrameRef.current != null) {
				cancelAnimationFrame(animationFrameRef.current);
			}

			if (shouldAnimate) {
				// Animate to target
				if (animateRef.current != null) {
					animationFrameRef.current = requestAnimationFrame(animateRef.current);
				}
			} else {
				// Snap directly to target
				currentRef.current = { x, y };
				updateSprite();
			}
		}
	}));

	// Initial render
	React.useEffect(() => {
		updateSprite();
	}, [updateSprite]);

	// Cleanup animation on unmount
	React.useEffect(() => {
		return () => {
			if (animationFrameRef.current != null) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, []);

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
					backgroundSize: `${scaledSheetSize}px ${scaledSheetSize}px`,
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
	smoothness?: number;
	shouldAnimate?: boolean;
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
