import React from 'react';
import { GazeExpressionSheet, type TGazeExpressionSheetRef } from '@/features/gaze-expression';

export const PongGazers = React.forwardRef<TPongGazersRef, TPongGazersProps>((props, ref) => {
	const { spriteMap, spriteSheetUrl, expressionSize = 256 } = props;
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [gridDimensions, setGridDimensions] = React.useState({ cols: 0, rows: 0 });
	const expressionRefsRef = React.useRef<Map<number, TGazeExpressionSheetRef>>(new Map());
	const animationFrameRef = React.useRef<number | undefined>(undefined);
	const targetRef = React.useRef<{ x: number | undefined; y: number | undefined }>({
		x: undefined,
		y: undefined
	});
	const smoothedTargetRef = React.useRef<{ x: number; y: number } | null>(null);

	const totalExpressions = React.useMemo(
		() => gridDimensions.cols * gridDimensions.rows,
		[gridDimensions.cols, gridDimensions.rows]
	);
	const gridWidth = React.useMemo(
		() => gridDimensions.cols * expressionSize,
		[gridDimensions.cols, expressionSize]
	);
	const gridHeight = React.useMemo(
		() => gridDimensions.rows * expressionSize,
		[gridDimensions.rows, expressionSize]
	);

	// =============================================================================
	// Effects
	// =============================================================================

	// Calculate grid dimensions: one tile larger than needed, then center
	React.useEffect(() => {
		function updateGridDimensions() {
			if (containerRef.current == null) {
				return;
			}

			const rect = containerRef.current.getBoundingClientRect();
			// Add one extra tile to ensure full coverage
			const cols = Math.ceil(rect.width / expressionSize) + 1;
			const rows = Math.ceil(rect.height / expressionSize) + 1;
			setGridDimensions({ cols, rows });
		}

		updateGridDimensions();
		window.addEventListener('resize', updateGridDimensions);
		return () => window.removeEventListener('resize', updateGridDimensions);
	}, [expressionSize]);

	// Expose updateTarget method via ref
	React.useImperativeHandle(ref, () => ({
		updateTarget: (x: number | undefined, y: number | undefined) => {
			targetRef.current = { x, y };
		}
	}));

	// Smooth animation toward target position
	React.useEffect(() => {
		function animate() {
			// Initialize on first frame if needed
			if (smoothedTargetRef.current == null) {
				const centerX = window.innerWidth / 2;
				const centerY = window.innerHeight / 2;
				smoothedTargetRef.current = {
					x: targetRef.current.x ?? centerX,
					y: targetRef.current.y ?? centerY
				};
			}

			const currentX = smoothedTargetRef.current.x;
			const currentY = smoothedTargetRef.current.y;
			const targetX = targetRef.current.x ?? window.innerWidth / 2;
			const targetY = targetRef.current.y ?? window.innerHeight / 2;

			// Smooth interpolation (8% per frame)
			const factor = 0.08;
			const newX = currentX + (targetX - currentX) * factor;
			const newY = currentY + (targetY - currentY) * factor;

			smoothedTargetRef.current = { x: newX, y: newY };

			// Update all expressions directly via refs (no re-renders)
			expressionRefsRef.current.forEach((ref) => {
				ref.updateTarget(newX, newY);
			});

			animationFrameRef.current = requestAnimationFrame(animate);
		}

		animationFrameRef.current = requestAnimationFrame(animate);
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
		<div ref={containerRef} className="absolute inset-0 overflow-hidden">
			<div
				className="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 gap-0"
				style={{
					gridTemplateColumns: `repeat(${gridDimensions.cols}, ${expressionSize}px)`,
					gridTemplateRows: `repeat(${gridDimensions.rows}, ${expressionSize}px)`,
					width: `${gridWidth}px`,
					height: `${gridHeight}px`
				}}
			>
				{Array.from({ length: totalExpressions }).map((_, index) => (
					<div key={index} className="overflow-hidden">
						<GazeExpressionSheet
							ref={(ref) => {
								if (ref != null) {
									expressionRefsRef.current.set(index, ref);
								} else {
									expressionRefsRef.current.delete(index);
								}
							}}
							spriteMap={spriteMap}
							size={expressionSize}
							spriteSheetUrl={spriteSheetUrl}
						/>
					</div>
				))}
			</div>
		</div>
	);
});
PongGazers.displayName = 'PongGazers';

export interface TPongGazersProps {
	spriteMap: TSpriteMapItem[][];
	spriteSheetUrl: string;
	expressionSize?: number;
}

export interface TPongGazersRef {
	updateTarget: (x: number | undefined, y: number | undefined) => void;
}

interface TSpriteMapItem {
	spriteUrl: string;
	width: number;
	height: number;
	spriteSheetX: number;
	spriteSheetY: number;
}
