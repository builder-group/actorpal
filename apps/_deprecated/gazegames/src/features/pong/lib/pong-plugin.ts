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
			},
			gameState: {
				paddleHitCount: 0,
				speedMultiplier: 1.0
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
			app.addSystem(paddleSizeSystem, { set: 'Update', after: collisionSystem });
		}
	};
}

function updateSpeedMultiplier(gameState: { paddleHitCount: number; speedMultiplier: number }) {
	// Increase speed multiplier based on paddle hits (1.0 -> 5.0 over 20 hits)
	// Formula: 1.0 + (hits / 20) * 4.0, capped at 5.0
	gameState.speedMultiplier = Math.min(1.0 + (gameState.paddleHitCount / 20) * 4.0, 5.0);
}

function inputSystem(app: TApp<TAppContext<[TDefaultPlugin, TPongPlugin]>>) {
	const input = app.r.inputState;
	const config = app.r.gameConfig;
	const speedMultiplier = app.r.gameState.speedMultiplier;

	for (const [eid, paddle, vel] of app.queryComponents([
		Entity,
		app.c.Paddle,
		app.c.Velocity
	] as const)) {
		let dy = 0;

		if (paddle.player === 1) {
			if (input.w) {
				dy = -config.paddleSpeed * speedMultiplier;
			}
			if (input.s) {
				dy = config.paddleSpeed * speedMultiplier;
			}
		} else if (paddle.player === 2) {
			if (input.ArrowUp) {
				dy = -config.paddleSpeed * speedMultiplier;
			}
			if (input.ArrowDown) {
				dy = config.paddleSpeed * speedMultiplier;
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
	const { gameConfig: config, gameState } = app.r;

	// Get ball
	const ballQuery = app.queryComponents(
		[Entity, app.c.Position, app.c.Velocity, app.c.Size] as const,
		With(app.c.Ball)
	);

	const ballResults = Array.from(ballQuery);
	if (ballResults.length === 0 || ballResults[0] == null) {
		return;
	}

	const [ballEid, ballPos, ballVel, ballSize] = ballResults[0];

	// Wall collision (top/bottom)
	if (ballPos.y <= 0 || ballPos.y + ballSize.height >= config.canvasHeight) {
		app.updateComponent(ballEid, app.c.Velocity, { dx: ballVel.dx, dy: -ballVel.dy });
		const clampedY = Math.max(0, Math.min(config.canvasHeight - ballSize.height, ballPos.y));
		app.updateComponent(ballEid, app.c.Position, { x: ballPos.x, y: clampedY });
	}

	// Paddle collision - check if ball is moving toward paddle to prevent multiple collisions
	const ballMovingRight = ballVel.dx > 0;
	const ballMovingLeft = ballVel.dx < 0;

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
			// Only bounce if ball is moving toward the paddle (prevents stuck ball)
			const isLeftPaddle = paddlePos.x < config.canvasWidth / 2;
			const shouldBounce = (isLeftPaddle && ballMovingLeft) || (!isLeftPaddle && ballMovingRight);

			if (shouldBounce) {
				// Increment paddle hit count and update speed
				gameState.paddleHitCount += 1;
				updateSpeedMultiplier(gameState);

				// Calculate new velocity with speed multiplier
				const speedMultiplier = gameState.speedMultiplier;
				const randomDy = (Math.random() - 0.5) * 100;
				const currentSpeed = Math.sqrt(ballVel.dx * ballVel.dx + ballVel.dy * ballVel.dy);

				// Prevent division by zero
				if (currentSpeed > 0.1) {
					const newSpeed = config.ballSpeed * speedMultiplier;
					const speedRatio = newSpeed / currentSpeed;
					app.updateComponent(ballEid, app.c.Velocity, {
						dx: -ballVel.dx * speedRatio,
						dy: (ballVel.dy + randomDy) * speedRatio
					});
				} else {
					// Fallback if speed is too low
					app.updateComponent(ballEid, app.c.Velocity, {
						dx: -config.ballSpeed * speedMultiplier * (ballVel.dx < 0 ? -1 : 1),
						dy: config.ballSpeed * speedMultiplier * (Math.random() > 0.5 ? 1 : -1)
					});
				}

				// Break after first collision to prevent multiple bounces per frame
				break;
			}
		}
	}

	// Score (ball goes out of bounds)
	if (ballPos.x < 0) {
		// Right player scores
		app.r.score.right += 1;
		// Reset game state
		gameState.paddleHitCount = 0;
		gameState.speedMultiplier = 1.0;
		// Reset ball
		app.updateComponent(ballEid, app.c.Position, {
			x: config.canvasWidth / 2 - config.ballSize / 2,
			y: config.canvasHeight / 2 - config.ballSize / 2
		});
		app.updateComponent(ballEid, app.c.Velocity, {
			dx: config.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
			dy: config.ballSpeed * (Math.random() > 0.5 ? 1 : -1)
		});
	} else if (ballPos.x > config.canvasWidth) {
		// Left player scores
		app.r.score.left += 1;
		// Reset game state
		gameState.paddleHitCount = 0;
		gameState.speedMultiplier = 1.0;
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

function paddleSizeSystem(app: TApp<TAppContext<[TDefaultPlugin, TPongPlugin]>>) {
	const { gameConfig: config, score } = app.r;
	const basePaddleHeight = config.paddleHeight;

	// Calculate lead
	const leftLead = score.left - score.right;
	const rightLead = score.right - score.left;

	// Update paddle sizes based on lead
	// Each point of lead reduces paddle size by 10%, minimum 40% of original size
	for (const [eid, paddle, paddleSize, paddlePos] of app.queryComponents([
		Entity,
		app.c.Paddle,
		app.c.Size,
		app.c.Position
	] as const)) {
		let lead = 0;
		if (paddle.player === 1) {
			lead = leftLead;
		} else if (paddle.player === 2) {
			lead = rightLead;
		}

		// Calculate new height: reduce by 10% per point of lead, minimum 40% of original
		const sizeReduction = Math.min(lead * 0.1, 0.6); // Cap at 60% reduction
		const newHeight = basePaddleHeight * (1 - sizeReduction);
		const minHeight = basePaddleHeight * 0.4; // Minimum 40% of original
		const finalHeight = Math.max(newHeight, minHeight);

		// Only update if height changed
		if (Math.abs(paddleSize.height - finalHeight) > 0.1) {
			// Adjust position to keep paddle centered vertically
			const heightDiff = finalHeight - paddleSize.height;
			const newY = paddlePos.y - heightDiff / 2;

			app.updateComponent(eid, app.c.Size, {
				width: paddleSize.width,
				height: finalHeight
			});
			app.updateComponent(eid, app.c.Position, {
				x: paddlePos.x,
				y: Math.max(0, Math.min(config.canvasHeight - finalHeight, newY))
			});
		}
	}
}
