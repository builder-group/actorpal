import React from 'react';

export const GazeExpression = React.forwardRef<TGazeExpressionRef, TGazeExpressionProps>(
	(props, ref) => {
		const {
			spriteMap,
			size,
			initialTargetX,
			initialTargetY,
			smoothness = 0.2,
			shouldAnimate = true
		} = props;
		const containerRef = React.useRef<HTMLDivElement>(null);
		const imageRef = React.useRef<HTMLImageElement>(null);
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
		const center = (mapSize - 1) / 2;
		const initialUrl = spriteMap[center]?.[center]?.spriteUrl ?? '';

		// =============================================================================
		// Events
		// =============================================================================

		// Update sprite to current interpolated position
		const updateImage = React.useCallback(() => {
			if (containerRef.current == null || imageRef.current == null) {
				return;
			}

			const rect = containerRef.current.getBoundingClientRect();
			const { x, y } = currentRef.current;

			// Use center sprite if no position
			if (x == null || y == null) {
				const centerSprite = spriteMap[center]?.[center];
				if (centerSprite != null) {
					imageRef.current.src = centerSprite.spriteUrl;
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
				imageRef.current.src = sprite.spriteUrl;
			}
		}, [spriteMap, center, mapSize]);

		// Animation loop - interpolate current position toward target
		const animateRef = React.useRef<() => void>(undefined);

		React.useEffect(() => {
			animateRef.current = () => {
				const target = targetRef.current;
				const current = currentRef.current;

				// Snap to target if no position data
				if (target.x == null || target.y == null || current.x == null || current.y == null) {
					currentRef.current = target;
					updateImage();
					return;
				}

				// Interpolate toward target
				const newX = current.x + (target.x - current.x) * smoothness;
				const newY = current.y + (target.y - current.y) * smoothness;

				// Stop when close enough (within 1px)
				const distance = Math.hypot(target.x - newX, target.y - newY);
				if (distance < 1) {
					currentRef.current = target;
					updateImage();
					return;
				}

				// Continue animation
				currentRef.current = { x: newX, y: newY };
				updateImage();
				animationFrameRef.current = requestAnimationFrame(() => animateRef.current?.());
			};
		}, [updateImage, smoothness]);

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
					updateImage();
				}
			}
		}));

		// Initial render
		React.useEffect(() => {
			updateImage();
		}, [updateImage]);

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
	smoothness?: number;
	shouldAnimate?: boolean;
}

export interface TGazeExpressionRef {
	updateTarget: (x: number | undefined, y: number | undefined) => void;
}

interface TSpriteMapItem {
	spriteUrl: string;
}
