import { TDefaultPlugin, TPlugin } from 'ecsify';

export type TPongPlugin = TPlugin<
	{
		name: 'Pong';
		components: {
			Position: TCPosition;
			Velocity: TCVelocity;
			Size: TCSize;
			Paddle: TCPaddle;
			Ball: TCBall;
		};
		resources: {
			gameConfig: TRGameConfig;
			inputState: TRInputState;
			score: TRScore;
		};
		appExtensions: {
			handleKeyDown: (key: string) => void;
			handleKeyUp: (key: string) => void;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin]
>;

export type TPongCanvasPlugin = TPlugin<
	{
		name: 'PongCanvas';
		resources: {
			ctx: CanvasRenderingContext2D;
		};
	},
	[TPongPlugin]
>;

type TCPosition = { x: number; y: number }[];
type TCVelocity = { dx: number; dy: number }[];
type TCSize = { width: number; height: number }[];
type TCPaddle = { player: number }[];
type TCBall = Record<string, never>;

type TRGameConfig = {
	canvasWidth: number;
	canvasHeight: number;
	paddleWidth: number;
	paddleHeight: number;
	ballSize: number;
	paddleSpeed: number;
	ballSpeed: number;
};

type TRInputState = {
	w: boolean;
	s: boolean;
	ArrowUp: boolean;
	ArrowDown: boolean;
};

type TRScore = {
	left: number;
	right: number;
};
