import React from 'react';
import { View } from 'react-native';
import Animated, {
	Easing,
	useAnimatedProps,
	useSharedValue,
	withTiming
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/components';
import { cn } from '@/lib';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ProgressRing: React.FC<TProgressRingProps> = (props) => {
	const { tokens } = useTheme();
	const {
		progress,
		size = 250,
		thickness = 8,
		trackColor = tokens.base300,
		progressColor = tokens.primary,
		animationDuration = 220,
		className,
		children
	} = props;

	const clampedProgress = React.useMemo(() => Math.min(Math.max(progress, 0), 1), [progress]);
	const radius = React.useMemo(() => (size - thickness) / 2, [size, thickness]);
	const center = React.useMemo(() => size / 2, [size]);
	const circumference = React.useMemo(() => 2 * Math.PI * radius, [radius]);

	const strokeDashoffset = useSharedValue(circumference);

	// MARK: - Effects

	React.useEffect(() => {
		strokeDashoffset.value = withTiming(circumference * (1 - clampedProgress), {
			duration: animationDuration,
			easing: Easing.linear
		});
	}, [animationDuration, clampedProgress, circumference, strokeDashoffset]);

	// MARK: - UI

	const animatedProps = useAnimatedProps(() => ({
		strokeDashoffset: strokeDashoffset.value
	}));

	return (
		<View className={cn(className)} style={{ width: size, height: size }}>
			<Svg className="absolute inset-0" width={size} height={size}>
				<Circle
					cx={center}
					cy={center}
					r={radius}
					stroke={trackColor}
					strokeWidth={thickness}
					fill="transparent"
				/>

				<AnimatedCircle
					animatedProps={animatedProps}
					cx={center}
					cy={center}
					r={radius}
					stroke={progressColor}
					strokeWidth={thickness}
					strokeDasharray={circumference}
					strokeLinecap="round"
					fill="transparent"
					transform={`rotate(-90 ${center} ${center})`}
				/>
			</Svg>

			{children != null ? (
				<View className="absolute inset-0 items-center justify-center">{children}</View>
			) : null}
		</View>
	);
};

interface TProgressRingProps {
	progress: number;
	size?: number;
	thickness?: number;
	trackColor?: string;
	progressColor?: string;
	animationDuration?: number;
	className?: string;
	children?: React.ReactNode;
}
