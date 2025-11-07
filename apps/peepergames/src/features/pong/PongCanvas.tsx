import { createApp, createDefaultPlugin } from 'ecsify';
import React from 'react';
import { createPongCanvasPlugin, createPongPlugin } from './lib';

export const PongCanvas: React.FC = () => {
	const canvasRef = React.useRef<HTMLCanvasElement>(null);

	React.useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas == null) {
			return;
		}

		const ctx = canvas.getContext('2d');
		if (ctx == null) {
			return;
		}

		const app = createApp({
			plugins: [createDefaultPlugin(), createPongPlugin(), createPongCanvasPlugin(ctx)] as const,
			systemSets: ['First', 'Update', 'Last']
		});

		// Input handling
		function handleKeyDown(e: KeyboardEvent) {
			app.handleKeyDown(e.key);
		}
		function handleKeyUp(e: KeyboardEvent) {
			app.handleKeyUp(e.key);
		}
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		// Game loop
		let lastTime = 0;
		let animationId: number;
		function gameLoop(currentTime: number) {
			const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
			lastTime = currentTime;

			app.update(dt);
			animationId = requestAnimationFrame(gameLoop);
		}
		animationId = requestAnimationFrame(gameLoop);

		return () => {
			cancelAnimationFrame(animationId);
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	return <canvas ref={canvasRef} width={800} height={600} className="border-2 border-white" />;
};
