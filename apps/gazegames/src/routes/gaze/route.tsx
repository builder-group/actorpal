import React from 'react';
import { useLoaderData } from 'react-router';
import { GazeExpressionSheet, useMousePosition } from '@/features/gaze-expression';

const Page: React.FC = () => {
	const { spriteMap } = useLoaderData<typeof loader>();
	const mousePosition = useMousePosition();

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-900">
			<div className="text-center">
				<h1 className="mb-4 text-4xl font-bold text-white">Gaze Expression</h1>
				<p className="mb-8 text-gray-400">Move your cursor around to see the expression follow</p>
				<GazeExpressionSheet
					spriteMap={spriteMap}
					size={512}
					spriteSheetUrl="/girl-1_sprite-sheet.webp"
					targetX={mousePosition?.x}
					targetY={mousePosition?.y}
				/>
			</div>
		</div>
	);
};

export default Page;

export async function loader({ request }: { request: Request }) {
	const url = new URL('/girl-1_sprite-map.json', new URL(request.url).origin);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Response('Failed to load sprite map', { status: response.status });
	}
	const spriteMap = await response.json();
	return { spriteMap };
}
