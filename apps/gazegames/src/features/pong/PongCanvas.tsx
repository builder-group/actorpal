import { createApp, createDefaultPlugin, With } from 'ecsify';
import React from 'react';
import { createPongCanvasPlugin, createPongPlugin } from './lib';

interface TPongCanvasProps {
	onBallPositionChange?: (x: number, y: number) => void;
}

export const PongCanvas: React.FC<TPongCanvasProps> = (props) => {
	const { onBallPositionChange } = props;
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

			// Report ball position
			if (onBallPositionChange != null) {
				const ballQuery = app.queryComponents(
					[app.c.Position, app.c.Size] as const,
					With(app.c.Ball)
				);
				const ballData = Array.from(ballQuery)[0];
				if (ballData != null) {
					const [ballPos, ballSize] = ballData;
					// Report center of ball (canvas coordinates)
					const ballCenterX = ballPos.x + ballSize.width / 2;
					const ballCenterY = ballPos.y + ballSize.height / 2;
					onBallPositionChange(ballCenterX, ballCenterY);
				}
			}

			animationId = requestAnimationFrame(gameLoop);
		}
		animationId = requestAnimationFrame(gameLoop);

		return () => {
			cancelAnimationFrame(animationId);
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, [onBallPositionChange]);

	return <canvas ref={canvasRef} width={800} height={600} className="border-2 border-white" />;
};
