import { TApp, TAppContext, TDefaultPlugin } from 'ecsify';
import { TPongCanvasPlugin, TPongPlugin } from '../types';

export function createPongCanvasPlugin(ctx: CanvasRenderingContext2D): TPongCanvasPlugin {
	return {
		name: 'PongCanvas',
		deps: ['Pong'],
		resources: {
			ctx
		},
		setup: (app: TApp<TAppContext<[TDefaultPlugin, TPongPlugin, TPongCanvasPlugin]>>) => {
			app.addSystem(renderSystem, { set: 'Last' });
		}
	};
}

function renderSystem(app: TApp<TAppContext<[TDefaultPlugin, TPongPlugin, TPongCanvasPlugin]>>) {
	const { gameConfig: config, ctx, score, gameState } = app.r;

	// Clear canvas
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);

	// Draw score
	ctx.fillStyle = '#666';
	ctx.font = '32px monospace';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillText(`${score.left} - ${score.right}`, 20, 20);

	// Draw center line
	ctx.strokeStyle = '#444';
	ctx.lineWidth = 2;
	ctx.setLineDash([10, 10]);
	ctx.beginPath();
	ctx.moveTo(config.canvasWidth / 2, 0);
	ctx.lineTo(config.canvasWidth / 2, config.canvasHeight);
	ctx.stroke();
	ctx.setLineDash([]);

	// Draw entities
	for (const [pos, size] of app.queryComponents([app.c.Position, app.c.Size] as const)) {
		ctx.fillStyle = '#fff';
		ctx.fillRect(pos.x, pos.y, size.width, size.height);
	}

	// Draw game info (bottom right)
	const leftLead = score.left - score.right;
	const rightLead = score.right - score.left;
	const lead = leftLead > 0 ? `L+${leftLead}` : rightLead > 0 ? `R+${rightLead}` : '';
	const speedText = `${gameState.speedMultiplier.toFixed(1)}x`;
	const paddleReduction =
		leftLead > 0 ? Math.min(leftLead * 10, 60) : rightLead > 0 ? Math.min(rightLead * 10, 60) : 0;
	const reductionText = paddleReduction > 0 ? `-${paddleReduction}%` : '';

	ctx.fillStyle = '#555';
	ctx.font = '12px monospace';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'bottom';
	const infoY = config.canvasHeight - 10;
	const infoX = config.canvasWidth - 10;

	if (lead !== '') {
		ctx.fillText(`${speedText} | ${lead} ${reductionText}`, infoX, infoY);
	} else {
		ctx.fillText(speedText, infoX, infoY);
	}
}
