import React from 'react';
import { GazeExpressionSheet } from '@/features/gaze-expression';

export const PongGazers: React.FC<TPongGazersProps> = (props) => {
	const { spriteMap, targetX, targetY, spriteSheetUrl, expressionSize = 256 } = props;
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [gridDimensions, setGridDimensions] = React.useState({ cols: 0, rows: 0 });

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

	const totalExpressions = gridDimensions.cols * gridDimensions.rows;
	const gridWidth = gridDimensions.cols * expressionSize;
	const gridHeight = gridDimensions.rows * expressionSize;

	return (
		<div ref={containerRef} className="absolute inset-0 overflow-hidden">
			<div
				className="absolute grid"
				style={{
					left: '50%',
					top: '50%',
					transform: 'translate(-50%, -50%)',
					gridTemplateColumns: `repeat(${gridDimensions.cols}, ${expressionSize}px)`,
					gridTemplateRows: `repeat(${gridDimensions.rows}, ${expressionSize}px)`,
					gap: 0,
					width: `${gridWidth}px`,
					height: `${gridHeight}px`
				}}
			>
				{Array.from({ length: totalExpressions }).map((_, index) => (
					<div key={index} className="overflow-hidden">
						<GazeExpressionSheet
							spriteMap={spriteMap}
							size={expressionSize}
							spriteSheetUrl={spriteSheetUrl}
							targetX={targetX}
							targetY={targetY}
						/>
					</div>
				))}
			</div>
		</div>
	);
};

interface TPongGazersProps {
	spriteMap: TSpriteMapItem[][];
	spriteSheetUrl: string;
	targetX?: number;
	targetY?: number;
	expressionSize?: number;
}

interface TSpriteMapItem {
	spriteUrl: string;
	width: number;
	height: number;
	spriteSheetX: number;
	spriteSheetY: number;
}
