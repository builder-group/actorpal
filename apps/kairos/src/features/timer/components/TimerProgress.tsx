import Feather from '@expo/vector-icons/Feather';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/components';
import { cn } from '@/lib';
import { TimerCx } from '../TimerCx';
import { RingProgress } from './RingProgress';
import { RingProgressHidden } from './RingProgressHidden';

export const TimerProgress: React.FC<TTimerProgressProps> = (props) => {
	const { cx, className } = props;
	const { tokens } = useTheme();

	const status = useCompute(cx.$status, ({ value }) => value);
	const hideTimer = useCompute(cx.$config, ({ value }) => value.hideTimer);
	const endMode = useCompute(cx.$config, ({ value }) => value.endMode);
	const drawnSeconds = useCompute(cx.$drawnSeconds, ({ value }) => value);
	const remainingSeconds = useFeatureState(cx.$remainingSeconds);

	const isOvertime = status === 'overtime';

	const progress = React.useMemo(() => {
		if (isOvertime) return 1;
		if (drawnSeconds == null || drawnSeconds <= 0) return 0;
		return Math.min(Math.max(1 - Math.max(0, remainingSeconds) / drawnSeconds, 0), 1);
	}, [isOvertime, drawnSeconds, remainingSeconds]);

	// MARK: - UI

	const activeRingColor = isOvertime && endMode === 'overtime' ? '#FF9500' : tokens.primary;

	return (
		<View className={cn('relative h-[216px] w-full', className)}>
			{hideTimer ? (
				<RingProgressHidden
					className="absolute inset-0 top-0 left-1/2 -translate-x-1/2"
					size={235}
					animated={status === 'running' || isOvertime}
					activeColor={activeRingColor}
					inactiveColor={tokens.base300}
				>
					{isOvertime ? <TimerProgressContent cx={cx} /> : null}
				</RingProgressHidden>
			) : (
				<RingProgress
					className="absolute inset-0 top-0 left-1/2 -translate-x-1/2"
					progress={progress}
					size={235}
					progressColor={activeRingColor}
				>
					<TimerProgressContent cx={cx} />
				</RingProgress>
			)}
		</View>
	);
};

interface TTimerProgressProps {
	cx: TimerCx;
	className?: string;
}

// MARK: - TimerProgressContent

const TimerProgressContent: React.FC<TTimerProgressContentProps> = (props) => {
	const { cx } = props;
	const { tokens } = useTheme();

	const status = useCompute(cx.$status, ({ value }) => value);
	const endMode = useCompute(cx.$config, ({ value }) => value.endMode);
	const endAfterSeconds = useCompute(cx.$config, ({ value }) => value.endAfterSeconds);
	const drawnSeconds = useCompute(cx.$drawnSeconds, ({ value }) => value);
	const endTime = useCompute(cx.$endTime, ({ value }) => value);
	const remainingSeconds = useFeatureState(cx.$remainingSeconds);
	const overtimeSeconds = useFeatureState(cx.$overtimeSeconds);

	const isOvertime = status === 'overtime';

	const autoEndCountdown =
		isOvertime && endMode !== 'overtime' ? Math.max(0, endAfterSeconds - overtimeSeconds) : null;

	const labelColor = isOvertime && endMode === 'overtime' ? '#FF9500' : tokens.base500;
	const timeColor = isOvertime && endMode === 'overtime' ? '#FF9500' : tokens.base900;

	// MARK: - UI

	return (
		<View className="relative items-center">
			{!isOvertime && (
				<View className="absolute bottom-full flex-row items-center gap-1 pb-1.5">
					<Feather name="bell" size={14} color={tokens.base500} />
					<Text className="text-sm" style={{ color: tokens.base500 }}>
						{endTime != null ? formatEndTime(endTime) : '--:--'}
					</Text>
				</View>
			)}

			<Text
				className="min-w-[190px] text-center text-[72px] leading-[80px] font-light"
				style={{ color: timeColor }}
				adjustsFontSizeToFit
				numberOfLines={1}
			>
				{isOvertime
					? formatTime(Math.max(0, (drawnSeconds ?? 0) + overtimeSeconds))
					: formatTime(Math.max(0, remainingSeconds))}
			</Text>

			{isOvertime && (
				<View className="absolute top-full flex-row items-center gap-1 pt-1.5">
					<Feather name="clock" size={14} color={labelColor} />
					<Text className="text-sm" style={{ color: labelColor }}>
						{autoEndCountdown != null
							? `${endMode === 'loop' ? 'Repeat' : 'Stop'} in ${formatTime(autoEndCountdown)}`
							: `+${formatTime(Math.max(0, overtimeSeconds))}`}
					</Text>
				</View>
			)}
		</View>
	);
};

interface TTimerProgressContentProps {
	cx: TimerCx;
}

// MARK: - Helpers

function formatTime(seconds: number): string {
	const total = Math.ceil(seconds);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;

	if (h > 0) {
		return `${h}:${pad(m)}:${pad(s)}`;
	}
	return `${m}:${pad(s)}`;
}

function formatEndTime(epochMs: number): string {
	const date = new Date(epochMs);
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number): string {
	return value.toString().padStart(2, '0');
}
