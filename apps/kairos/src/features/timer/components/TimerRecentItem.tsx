import React from 'react';
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	type SharedValue
} from 'react-native-reanimated';
import { PlayIcon, TrashIcon, useTheme } from '@/components';
import { hexToRgba } from '@/lib';
import {
	durationToSeconds,
	formatDurationRange,
	formatTimerClock,
	formatTimerClockRedacted
} from '../format';
import type { TimerCx, TTimerRecent } from '../TimerCx';

export const TimerRecentItem = React.memo<TTimerRecentItemProps>((props) => {
	const { recent, cx, shouldMaskTitle } = props;
	const swipeProgress = useSharedValue(0);

	const title = React.useMemo(() => {
		return shouldMaskTitle
			? formatTimerClockRedacted(durationToSeconds(recent.config.max))
			: formatTimerClock(recent.lastUsedTotalSeconds);
	}, [recent.config.max, recent.lastUsedTotalSeconds, shouldMaskTitle]);
	const subtitle = React.useMemo(() => {
		const label = recent.config.label.trim();
		return label.length > 0 ? label : formatDurationRange(recent.config.min, recent.config.max);
	}, [recent.config.label, recent.config.max, recent.config.min]);

	// MARK: - Actions

	const handleSelect = React.useCallback(() => {
		cx.$config.set(recent.config);
	}, [cx, recent.config]);

	const handleStart = React.useCallback(() => {
		void cx.start({ config: recent.config });
	}, [cx, recent.config]);

	const handleDelete = React.useCallback(() => {
		cx.removeRecent(recent.hash);
	}, [cx, recent.hash]);

	// MARK: - UI

	return (
		<Swipeable
			enabled
			friction={1.9}
			overshootRight={false}
			rightThreshold={32}
			renderRightActions={(progress) => (
				<View className="justify-center px-4">
					<RecentDeleteAction
						progress={progress}
						swipeProgress={swipeProgress}
						onPress={handleDelete}
					/>
				</View>
			)}
		>
			<Pressable
				className="flex-row items-center justify-between gap-4 px-4 py-2"
				onPress={handleSelect}
			>
				<View className="flex-1">
					<Text
						className="text-base-900 text-[58px] leading-[64px] font-extralight"
						numberOfLines={1}
					>
						{title}
					</Text>
					<Text className="text-base-500 text-xl" numberOfLines={1}>
						{subtitle}
					</Text>
				</View>

				<RecentPlayButton
					progress={swipeProgress}
					onPress={(e) => {
						e.stopPropagation();
						handleStart();
					}}
				/>
			</Pressable>
		</Swipeable>
	);
});
TimerRecentItem.displayName = 'TimerRecentItem';

interface TTimerRecentItemProps {
	recent: TTimerRecent;
	cx: TimerCx;
	shouldMaskTitle: boolean;
}

const RecentDeleteAction: React.FC<TRecentDeleteActionProps> = (props) => {
	const { progress, swipeProgress, onPress } = props;
	const { tokens } = useTheme();

	useAnimatedReaction(
		() => progress.value,
		(value) => {
			swipeProgress.value = value;
		},
		[swipeProgress, progress]
	);

	const animatedStyle = useAnimatedStyle(() => {
		const opacity = interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
		const scale = interpolate(progress.value, [0, 1], [0.75, 1], Extrapolation.CLAMP);
		return {
			opacity,
			transform: [{ scale }]
		};
	}, [progress]);

	return (
		<Animated.View style={animatedStyle}>
			<Pressable
				className="h-20 w-20 items-center justify-center rounded-full"
				style={{ backgroundColor: hexToRgba(tokens.danger, 0.14) }}
				onPress={onPress}
			>
				<TrashIcon size={26} color={tokens.danger} />
			</Pressable>
		</Animated.View>
	);
};

interface TRecentDeleteActionProps {
	progress: SharedValue<number>;
	swipeProgress: SharedValue<number>;
	onPress: () => void;
}

const RecentPlayButton: React.FC<TRecentPlayButtonProps> = (props) => {
	const { progress, onPress } = props;
	const { tokens } = useTheme();

	const animatedStyle = useAnimatedStyle(() => {
		const opacity = interpolate(progress.value, [0, 0.15, 0.35], [1, 0.82, 0], Extrapolation.CLAMP);
		const scale = interpolate(progress.value, [0, 0.35], [1, 0.9], Extrapolation.CLAMP);
		return {
			opacity,
			transform: [{ scale }]
		};
	}, [progress]);

	return (
		<Animated.View style={animatedStyle}>
			<Pressable
				className="h-20 w-20 items-center justify-center rounded-full"
				style={{ backgroundColor: hexToRgba(tokens.success, 0.14) }}
				onPress={(e) => {
					if (progress.value > 0.15) {
						return;
					}
					onPress(e);
				}}
			>
				<PlayIcon size={24} color={tokens.success} />
			</Pressable>
		</Animated.View>
	);
};

interface TRecentPlayButtonProps {
	progress: SharedValue<number>;
	onPress: (e: GestureResponderEvent) => void;
}
