import React from 'react';
import { useLoaderData } from 'react-router';
import { PongCanvas, PongGazers, type TPongGazersRef } from '@/features/pong';

export async function loader({ request }: { request: Request }) {
	const origin = new URL(request.url).origin;

	// Load sprite maps
	const [leftResponse, rightResponse] = await Promise.all([
		fetch(new URL('/girl-1_sprite-map.json', origin)),
		fetch(new URL('/hide-the-pain-harold-1_sprite-map.json', origin))
	]);
	if (!leftResponse.ok) {
		throw new Response('Failed to load left sprite map', { status: leftResponse.status });
	}
	if (!rightResponse.ok) {
		throw new Response('Failed to load right sprite map', { status: rightResponse.status });
	}
	const [leftSpriteMap, rightSpriteMap] = await Promise.all([
		leftResponse.json(),
		rightResponse.json()
	]);

	return { leftSpriteMap, rightSpriteMap };
}

const Page: React.FC = () => {
	const { leftSpriteMap, rightSpriteMap } = useLoaderData<typeof loader>();
	const canvasContainerRef = React.useRef<HTMLDivElement>(null);
	const pongGazersRef = React.useRef<TPongGazersRef>(null);

	const canvasWidth = 800;
	const canvasHeight = 600;

	// Convert canvas coordinates to screen coordinates and update gaze
	const handleBallPositionChange = React.useCallback(
		(canvasX: number, canvasY: number) => {
			if (canvasContainerRef.current == null || pongGazersRef.current == null) {
				return;
			}

			const rect = canvasContainerRef.current.getBoundingClientRect();
			const screenX = rect.left + (rect.width - canvasWidth) / 2 + canvasX;
			const screenY = rect.top + (rect.height - canvasHeight) / 2 + canvasY;
			pongGazersRef.current.updateTarget(screenX, screenY);
		},
		[canvasWidth, canvasHeight]
	);

	return (
		<div className="relative min-h-screen bg-gray-50">
			{/* Mobile message */}
			<div className="flex min-h-screen items-center justify-center md:hidden">
				<div className="mx-auto max-w-md px-4 text-center">
					<h1 className="mb-4 text-3xl font-bold text-gray-900">Gaze Pong</h1>
					<p className="text-gray-600">Desktop only - please use a desktop or laptop to play</p>
				</div>
			</div>

			{/* Desktop game */}
			<div className="hidden md:block">
				{/* Background grid of expressions */}
				<PongGazers
					ref={pongGazersRef}
					leftSpriteMap={leftSpriteMap}
					leftSpriteSheetUrl="/girl-1_sprite-sheet.webp"
					rightSpriteMap={rightSpriteMap}
					rightSpriteSheetUrl="/hide-the-pain-harold-1_sprite-sheet.webp"
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
		</div>
	);
};

export default Page;
