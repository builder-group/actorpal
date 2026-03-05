import { useCombinedCompute, useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { Text, View } from 'react-native';
import { BellIcon, ClockIcon, useTheme } from '@/components';
import { cn } from '@/lib';
import { formatClockTime, formatTimerClock } from '../format';
import { TimerCx } from '../TimerCx';
import { RingProgress } from './RingProgress';
import { RingProgressHidden } from './RingProgressHidden';

export const TimerProgress: React.FC<TTimerProgressProps> = (props) => {
	const { cx, className } = props;
	const { tokens } = useTheme();

	const status = useCompute(cx.$status, ({ value }) => value);
	const hideTimer = useCompute(cx.$config, ({ value }) => value.hideTimer);
	const endMode = useCompute(cx.$config, ({ value }) => value.endMode);
	const isOvertime = status === 'overtime';
	const progress = useCombinedCompute(
		[cx.$status, cx.$totalSeconds, cx.$remainingSeconds],
		([{ value: status }, { value: totalSeconds }, { value: remainingSeconds }]) => {
			if (status === 'overtime') {
				return 1;
			}
			if (totalSeconds == null || totalSeconds <= 0) {
				return 0;
			}
			return Math.min(Math.max(1 - Math.max(0, remainingSeconds) / totalSeconds, 0), 1);
		}
	);
	const activeRingColor = isOvertime && endMode === 'overtime' ? '#FF9500' : tokens.primary;

	// MARK: - UI

	return (
		<View className={cn('relative h-[256px] w-full', className)}>
			{hideTimer ? (
				<RingProgressHidden
					className="absolute inset-0 top-4 left-1/2 -translate-x-1/2"
					size={272}
					animated={status === 'running' || isOvertime}
					activeColor={activeRingColor}
					inactiveColor={tokens.base300}
				>
					{isOvertime ? <TimerProgressContent cx={cx} /> : null}
				</RingProgressHidden>
			) : (
				<RingProgress
					className="absolute inset-0 top-4 left-1/2 -translate-x-1/2"
					progress={progress}
					size={272}
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
	const totalSeconds = useCompute(cx.$totalSeconds, ({ value }) => value);
	const remainingSeconds = useFeatureState(cx.$remainingSeconds);
	const overtimeSeconds = useFeatureState(cx.$overtimeSeconds);
	const endTime = useCombinedCompute(
		[cx.$startedAt, cx.$remainingAtStart],
		([{ value: startedAt }, { value: remainingAtStart }]) =>
			startedAt != null ? startedAt + remainingAtStart * 1000 : null
	);
	const autoEndCountdown = React.useMemo(() => {
		if (status === 'overtime' && endMode !== 'overtime') {
			return Math.max(0, endAfterSeconds - overtimeSeconds);
		}
		return null;
	}, [status, endMode, endAfterSeconds, overtimeSeconds]);

	// MARK: - UI

	return (
		<View className="relative items-center">
			{status !== 'overtime' && (
				<View className="absolute bottom-full flex-row items-center gap-1 pb-1.5">
					<BellIcon size={18} color={tokens.base500} />
					<Text className="text-base-500 text-xl">
						{endTime != null ? formatClockTime(endTime) : '--:--'}
					</Text>
				</View>
			)}

			<Text
				className="text-base-900 min-w-[190px] text-center text-[72px] leading-[80px] font-light"
				adjustsFontSizeToFit
				numberOfLines={1}
			>
				{status === 'overtime'
					? formatTimerClock(Math.max(0, (totalSeconds ?? 0) + overtimeSeconds))
					: formatTimerClock(Math.max(0, remainingSeconds))}
			</Text>

			{status === 'overtime' && (
				<View className="absolute top-full flex-row items-center gap-1 pt-1.5">
					<ClockIcon
						size={18}
						color={status === 'overtime' && endMode === 'overtime' ? '#FF9500' : tokens.base500}
					/>
					<Text
						className={cn(
							'text-xl',
							status === 'overtime' && endMode === 'overtime' ? 'text-[#FF9500]' : 'text-base-500'
						)}
					>
						{autoEndCountdown != null
							? `${endMode === 'loop' ? 'Repeat' : 'Stop'} in ${formatTimerClock(autoEndCountdown)}`
							: `+${formatTimerClock(Math.max(0, overtimeSeconds))}`}
					</Text>
				</View>
			)}
		</View>
	);
};

interface TTimerProgressContentProps {
	cx: TimerCx;
}
