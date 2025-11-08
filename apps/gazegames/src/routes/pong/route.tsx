import React from 'react';
import { useLoaderData } from 'react-router';
import { PongCanvas, PongGazers } from '@/features/pong';

export async function loader({ request }: { request: Request }) {
	const url = new URL('/girl-1_sprite-map.json', new URL(request.url).origin);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Response('Failed to load sprite map', { status: response.status });
	}
	const spriteMap = await response.json();
	return { spriteMap };
}

const Page: React.FC = () => {
	const { spriteMap } = useLoaderData<typeof loader>();
	const canvasContainerRef = React.useRef<HTMLDivElement>(null);
	const [ballPosition, setBallPosition] = React.useState<{ x: number; y: number } | null>(null);

	const canvasWidth = 800;
	const canvasHeight = 600;

	// Convert canvas coordinates to screen coordinates
	const handleBallPositionChange = React.useCallback(
		(canvasX: number, canvasY: number) => {
			if (canvasContainerRef.current == null) {
				return;
			}

			const rect = canvasContainerRef.current.getBoundingClientRect();
			const screenX = rect.left + (rect.width - canvasWidth) / 2 + canvasX;
			const screenY = rect.top + (rect.height - canvasHeight) / 2 + canvasY;
			setBallPosition({ x: screenX, y: screenY });
		},
		[canvasWidth, canvasHeight]
	);

	return (
		<div className="relative min-h-screen bg-gray-50">
			{/* Background grid of expressions */}
			<PongGazers
				spriteMap={spriteMap}
				spriteSheetUrl="/girl-1_sprite-sheet.webp"
				targetX={ballPosition?.x}
				targetY={ballPosition?.y}
			/>

			{/* Pong canvas centered */}
			<div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
				<div className="mb-4 rounded-lg bg-black/30 px-6 py-3 text-center text-white backdrop-blur-sm">
					<h1 className="mb-2 text-4xl font-bold">Gaze Pong</h1>
					<p className="text-gray-200">W/S for left paddle, ↑/↓ for right paddle</p>
				</div>
				<div ref={canvasContainerRef}>
					<PongCanvas onBallPositionChange={handleBallPositionChange} />
				</div>
			</div>

			{/* Footer */}
			<div className="absolute right-0 bottom-4 left-0 z-10 flex justify-center">
				<div className="rounded-lg bg-black/30 px-4 py-2 text-center text-sm text-white backdrop-blur-sm">
					Made by{' '}
					<a
						href="https://github.com/bennobuilder"
						target="_blank"
						rel="noopener noreferrer"
						className="font-semibold text-gray-200 transition-colors hover:text-gray-300"
					>
						benno builder
					</a>
				</div>
			</div>
		</div>
	);
};

export default Page;
