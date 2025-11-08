import React from 'react';
import { Link, useLoaderData } from 'react-router';
import { GazeExpressionSheet, type TGazeExpressionSheetRef } from '@/features/gaze-expression';

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
	const gazeRef = React.useRef<TGazeExpressionSheetRef>(null);

	// Track mouse position and update gaze expression
	React.useEffect(() => {
		function handleMouseMove(event: MouseEvent) {
			if (gazeRef.current != null) {
				gazeRef.current.updateTarget(event.clientX, event.clientY);
			}
		}

		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	}, []);

	return (
		<div className="flex min-h-screen flex-col bg-gray-50">
			<div className="flex flex-1 items-center justify-center py-20">
				<div className="mx-auto max-w-4xl px-4 text-center">
					{/* Gaze Expression Icon */}
					<div className="mb-8 flex justify-center">
						<GazeExpressionSheet
							ref={gazeRef}
							spriteMap={spriteMap}
							size={128}
							spriteSheetUrl="/girl-1_sprite-sheet.webp"
						/>
					</div>

					<h1 className="mb-4 text-4xl font-bold text-gray-900">Gaze Games</h1>
					<p className="mb-12 text-gray-600">
						Interactive games featuring gaze-following expressions
					</p>

					{/* Games Grid */}
					<div className="flex justify-center gap-6">
						<Link
							to="/pong"
							className="group rounded-xl border-2 border-gray-200 bg-white p-6 text-center transition-all hover:border-gray-900 hover:shadow-lg"
						>
							<h3 className="mb-2 text-xl font-semibold text-gray-900">Gaze Pong</h3>
							<p className="text-sm text-gray-600">Classic Pong with gaze-following expressions</p>
						</Link>
					</div>
				</div>
			</div>

			{/* Footer */}
			<footer className="mt-auto border-t border-gray-200 bg-gray-100 py-4">
				<div className="mx-auto flex max-w-3xl justify-center px-4">
					<p className="text-center text-sm text-gray-600">
						Made by{' '}
						<a
							href="https://github.com/bennobuilder"
							target="_blank"
							rel="noopener noreferrer"
							className="font-semibold text-gray-900 transition-colors hover:text-gray-700"
						>
							benno builder
						</a>
					</p>
				</div>
			</footer>
		</div>
	);
};

export default Page;
