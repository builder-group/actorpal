import React from 'react';
import { AppState, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '@/components';
import { cn } from '@/lib';

export const PulsingDashRing: React.FC<TPulsingDashRingProps> = (props) => {
	const { tokens } = useTheme();
	const {
		size = 250,
		dashCount = 60,
		dashLength = 12,
		dashThickness = 3,
		trailLength = 14,
		stepMs = 10,
		animated = true,
		activeColor = tokens.primary,
		inactiveColor = tokens.base300,
		children,
		className
	} = props;
	const [headIndex, setHeadIndex] = React.useState(0);

	const center = React.useMemo(() => size / 2, [size]);
	const radius = React.useMemo(() => size / 2 - 12, [size]);

	// MARK: - Effects

	React.useEffect(() => {
		if (!animated) {
			return;
		}

		let timer: ReturnType<typeof setInterval> | null = null;
		const startTime = Date.now();

		const start = () => {
			if (timer != null) return;
			timer = setInterval(() => {
				const elapsed = Date.now() - startTime;
				setHeadIndex(Math.floor(elapsed / stepMs) % dashCount);
			}, stepMs);
		};

		const stop = () => {
			if (timer == null) return;
			clearInterval(timer);
			timer = null;
		};

		start();

		// Pause while backgrounded: iOS throttles JS timers, causing a burst of
		// queued callbacks on resume that would freeze the UI
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') {
				start();
			} else {
				stop();
			}
		});

		return () => {
			stop();
			sub.remove();
		};
	}, [animated, dashCount, stepMs]);

	const dashes = React.useMemo(() => {
		return Array.from({ length: dashCount }, (_, index) => {
			const angle = -Math.PI / 2 + (index / dashCount) * Math.PI * 2;
			const outerX = center + Math.cos(angle) * radius;
			const outerY = center + Math.sin(angle) * radius;
			const innerX = center + Math.cos(angle) * (radius - dashLength);
			const innerY = center + Math.sin(angle) * (radius - dashLength);
			const distance = (headIndex - index + dashCount) % dashCount;
			const intensity = distance < trailLength ? 1 - distance / trailLength : 0;
			const stroke = mixColor(inactiveColor, activeColor, intensity);
			return { key: `dash-${index}`, outerX, outerY, innerX, innerY, stroke };
		});
	}, [center, activeColor, inactiveColor, dashCount, dashLength, headIndex, radius, trailLength]);

	// MARK: - UI

	return (
		<View className={cn(className)} style={{ width: size, height: size }}>
			<Svg className="absolute inset-0" width={size} height={size}>
				{dashes.map((dash) => (
					<Line
						key={dash.key}
						x1={dash.outerX}
						y1={dash.outerY}
						x2={dash.innerX}
						y2={dash.innerY}
						stroke={dash.stroke}
						strokeWidth={dashThickness}
						strokeLinecap="round"
					/>
				))}
			</Svg>

			{children != null ? (
				<View className="absolute inset-0 items-center justify-center">{children}</View>
			) : null}
		</View>
	);
};

interface TPulsingDashRingProps {
	size?: number;
	dashCount?: number;
	dashLength?: number;
	dashThickness?: number;
	trailLength?: number;
	stepMs?: number;
	animated?: boolean;
	activeColor?: string;
	inactiveColor?: string;
	className?: string;
	children?: React.ReactNode;
}

// MARK: - Helpers

function mixColor(from: string, to: string, weight: number): string {
	const w = Math.min(Math.max(weight, 0), 1);
	const start = hexToRgb(from);
	const end = hexToRgb(to);
	const r = Math.round(start.r + (end.r - start.r) * w);
	const g = Math.round(start.g + (end.g - start.g) * w);
	const b = Math.round(start.b + (end.b - start.b) * w);
	return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const clean = hex.replace('#', '');
	const normalized =
		clean.length === 3
			? clean
					.split('')
					.map((char) => `${char}${char}`)
					.join('')
			: clean;

	const parsed = parseInt(normalized, 16);
	if (Number.isNaN(parsed)) {
		return { r: 0, g: 0, b: 0 };
	}

	return {
		r: (parsed >> 16) & 255,
		g: (parsed >> 8) & 255,
		b: parsed & 255
	};
}
