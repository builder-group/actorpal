import { ClientOnly } from '@tanstack/react-router';
import React from 'react';

const LazyThreeViewport = React.lazy(() =>
	import('./ThreeViewport').then((module) => ({
		default: module.ThreeViewport
	}))
);

export const ThreeViewportClient: React.FC = () => {
	return (
		<ClientOnly
			fallback={
				<div className="text-base-600 flex h-full w-full items-center justify-center text-sm">
					Loading 3D viewport...
				</div>
			}
		>
			<React.Suspense
				fallback={
					<div className="text-base-600 flex h-full w-full items-center justify-center text-sm">
						Loading Three.js...
					</div>
				}
			>
				<LazyThreeViewport />
			</React.Suspense>
		</ClientOnly>
	);
};
