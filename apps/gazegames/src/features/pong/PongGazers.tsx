import React from 'react';
import { GazeExpressionSheet, type TGazeExpressionSheetRef } from '@/features/gaze-expression';

export const PongGazers = React.forwardRef<TPongGazersRef, TPongGazersProps>((props, ref) => {
	const {
		leftSpriteMap,
		leftSpriteSheetUrl,
		rightSpriteMap,
		rightSpriteSheetUrl,
		expressionSize = 256
	} = props;
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [gridDimensions, setGridDimensions] = React.useState({ cols: 0, rows: 0 });
	const expressionRefsRef = React.useRef<Map<number, TGazeExpressionSheetRef>>(new Map());
	const targetRef = React.useRef<{ x: number | undefined; y: number | undefined }>({
		x: undefined,
		y: undefined
	});

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
			expressionRefsRef.current.forEach((ref) => {
				ref.updateTarget(x, y);
			});
		}
	}));

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
				{Array.from({ length: totalExpressions }).map((_, index) => {
					// Determine which side this tile is on (left or right)
					const col = index % gridDimensions.cols;
					const isLeftSide = col < gridDimensions.cols / 2;
					const spriteMap = isLeftSide ? leftSpriteMap : rightSpriteMap;
					const spriteSheetUrl = isLeftSide ? leftSpriteSheetUrl : rightSpriteSheetUrl;

					return (
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
					);
				})}
			</div>
		</div>
	);
});
PongGazers.displayName = 'PongGazers';

export interface TPongGazersProps {
	leftSpriteMap: TSpriteMapItem[][];
	leftSpriteSheetUrl: string;
	rightSpriteMap: TSpriteMapItem[][];
	rightSpriteSheetUrl: string;
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
