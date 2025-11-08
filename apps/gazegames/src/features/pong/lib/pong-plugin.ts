import { Entity, TApp, TAppContext, TDefaultPlugin, With } from 'ecsify';
import { TPongPlugin } from '../types';

export function createPongPlugin(): TPongPlugin {
	return {
		name: 'Pong',
		deps: ['Default'],
		components: {
			Position: [],
			Velocity: [],
			Size: [],
			Paddle: [],
			Ball: {}
		},
		resources: {
			gameConfig: {
				canvasWidth: 800,
				canvasHeight: 600,
				paddleWidth: 10,
				paddleHeight: 80,
				ballSize: 10,
				paddleSpeed: 300,
				ballSpeed: 200
			},
			inputState: {
				w: false,
				s: false,
				ArrowUp: false,
				ArrowDown: false
			},
			score: {
				left: 0,
				right: 0
			}
		},
		appExtensions: {
			handleKeyDown(this: TApp<TAppContext<[TDefaultPlugin, TPongPlugin]>>, key: string) {
				const inputState = this.r.inputState;
				if (key === 'w') {
					inputState.w = true;
				}
				if (key === 's') {
					inputState.s = true;
				}
				if (key === 'ArrowUp') {
					inputState.ArrowUp = true;
				}
				if (key === 'ArrowDown') {
					inputState.ArrowDown = true;
				}
			},
			handleKeyUp(this: TApp<TAppContext<[TDefaultPlugin, TPongPlugin]>>, key: string) {
				const inputState = this.r.inputState;
				if (key === 'w') {
					inputState.w = false;
				}
				if (key === 's') {
					inputState.s = false;
				}
				if (key === 'ArrowUp') {
					inputState.ArrowUp = false;
				}
				if (key === 'ArrowDown') {
					inputState.ArrowDown = false;
				}
			}
		},
		setup: (app: TApp<TAppContext<[TDefaultPlugin, TPongPlugin]>>) => {
			const config = app.r.gameConfig;

			// Create left paddle
			const leftPaddle = app.createEntity();
			app.addComponent(leftPaddle, app.c.Position, {
				x: 20,
				y: config.canvasHeight / 2 - config.paddleHeight / 2
			});
			app.addComponent(leftPaddle, app.c.Velocity, { dx: 0, dy: 0 });
			app.addComponent(leftPaddle, app.c.Size, {
				width: config.paddleWidth,
				height: config.paddleHeight
			});
			app.addComponent(leftPaddle, app.c.Paddle, { player: 1 });

			// Create right paddle
			const rightPaddle = app.createEntity();
			app.addComponent(rightPaddle, app.c.Position, {
				x: config.canvasWidth - 20 - config.paddleWidth,
				y: config.canvasHeight / 2 - config.paddleHeight / 2
			});
			app.addComponent(rightPaddle, app.c.Velocity, { dx: 0, dy: 0 });
			app.addComponent(rightPaddle, app.c.Size, {
				width: config.paddleWidth,
				height: config.paddleHeight
			});
			app.addComponent(rightPaddle, app.c.Paddle, { player: 2 });

			// Create ball
			const ball = app.createEntity();
			app.addComponent(ball, app.c.Position, {
				x: config.canvasWidth / 2 - config.ballSize / 2,
				y: config.canvasHeight / 2 - config.ballSize / 2
			});
			app.addComponent(ball, app.c.Velocity, {
				dx: config.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
				dy: config.ballSpeed * (Math.random() > 0.5 ? 1 : -1)
			});
			app.addComponent(ball, app.c.Size, { width: config.ballSize, height: config.ballSize });
			app.addComponent(ball, app.c.Ball);

			// Add systems
			app.addSystem(inputSystem, { set: 'First' });
			app.addSystem(physicsSystem, { set: 'Update' });
			app.addSystem(collisionSystem, { set: 'Update', after: physicsSystem });
		}
	};
}

function inputSystem(app: TApp<TAppContext<[TDefaultPlugin, TPongPlugin]>>) {
	const input = app.r.inputState;
	const config = app.r.gameConfig;

	for (const [eid, paddle, vel] of app.queryComponents([
		Entity,
		app.c.Paddle,
		app.c.Velocity
	] as const)) {
		let dy = 0;

		if (paddle.player === 1) {
			if (input.w) {
				dy = -config.paddleSpeed;
			}
			if (input.s) {
				dy = config.paddleSpeed;
			}
		} else if (paddle.player === 2) {
			if (input.ArrowUp) {
				dy = -config.paddleSpeed;
			}
			if (input.ArrowDown) {
				dy = config.paddleSpeed;
			}
		}

		app.updateComponent(eid, app.c.Velocity, { dx: vel.dx, dy });
	}
}

function physicsSystem(app: TApp<TAppContext<[TDefaultPlugin, TPongPlugin]>>, dt = 0.016) {
	const { gameConfig: config } = app.r;

	for (const [eid, pos, vel, size] of app.queryComponents([
		Entity,
		app.c.Position,
		app.c.Velocity,
		app.c.Size
	] as const)) {
		const newX = pos.x + vel.dx * dt;
		const newY = pos.y + vel.dy * dt;

		// Keep paddles within bounds
		if (app.hasComponent(eid, app.c.Paddle)) {
			const clampedY = Math.max(0, Math.min(config.canvasHeight - size.height, newY));
			app.updateComponent(eid, app.c.Position, { x: pos.x, y: clampedY });
		} else {
			app.updateComponent(eid, app.c.Position, { x: newX, y: newY });
		}
	}
}

function collisionSystem(app: TApp<TAppContext<[TDefaultPlugin, TPongPlugin]>>) {
	const { gameConfig: config } = app.r;

	// Get ball
	const ballQuery = app.queryComponents(
		[Entity, app.c.Position, app.c.Velocity, app.c.Size] as const,
		With(app.c.Ball)
	);

	const ballData = Array.from(ballQuery)[0];
	if (ballData == null) {
		return;
	}

	const [ballEid, ballPos, ballVel, ballSize] = ballData;

	// Wall collision (top/bottom)
	if (ballPos.y <= 0 || ballPos.y + ballSize.height >= config.canvasHeight) {
		app.updateComponent(ballEid, app.c.Velocity, { dx: ballVel.dx, dy: -ballVel.dy });
		const clampedY = Math.max(0, Math.min(config.canvasHeight - ballSize.height, ballPos.y));
		app.updateComponent(ballEid, app.c.Position, { x: ballPos.x, y: clampedY });
	}

	// Paddle collision
	for (const [paddlePos, paddleSize] of app.queryComponents(
		[app.c.Position, app.c.Size] as const,
		With(app.c.Paddle)
	)) {
		const ballRight = ballPos.x + ballSize.width;
		const ballBottom = ballPos.y + ballSize.height;
		const paddleRight = paddlePos.x + paddleSize.width;
		const paddleBottom = paddlePos.y + paddleSize.height;

		// AABB collision detection
		if (
			ballPos.x < paddleRight &&
			ballRight > paddlePos.x &&
			ballPos.y < paddleBottom &&
			ballBottom > paddlePos.y
		) {
			// Add slight randomness to trajectory
			const randomDy = (Math.random() - 0.5) * 100;
			app.updateComponent(ballEid, app.c.Velocity, { dx: -ballVel.dx, dy: ballVel.dy + randomDy });
		}
	}

	// Score (ball goes out of bounds)
	if (ballPos.x < 0 || ballPos.x > config.canvasWidth) {
		// Reset ball
		app.updateComponent(ballEid, app.c.Position, {
			x: config.canvasWidth / 2 - config.ballSize / 2,
			y: config.canvasHeight / 2 - config.ballSize / 2
		});
		app.updateComponent(ballEid, app.c.Velocity, {
			dx: config.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
			dy: config.ballSpeed * (Math.random() > 0.5 ? 1 : -1)
		});
	}
}
