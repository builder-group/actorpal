import { useCombinedCompute, useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { Text, View } from 'react-native';
import { BellIcon, ClockIcon, useTheme } from '@/components';
import { cn } from '@/lib';
import {
	durationToSeconds,
	formatClockTime,
	formatTimerClock,
	formatTimerClockRedacted,
	hasTimerHours
} from '../format';
import { TimerCx } from '../TimerCx';
import { ProgressRing } from './ProgressRing';
import { PulsingDashRing } from './PulsingDashRing';

export const TimerProgress: React.FC<TTimerProgressProps> = (props) => {
	const { cx, className } = props;
	const { tokens } = useTheme();

	const status = useCompute(cx.$status, ({ value }) => value);
	const hideTimeDisplay = useCompute(cx.$config, ({ value }) => value.hideTimeDisplay);
	const endMode = useCompute(cx.$config, ({ value }) => value.endMode);
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
	const activeRingColor =
		status !== 'overtime'
			? tokens.primary
			: endMode === 'overtime'
				? tokens.warning
				: tokens.secondary;

	// MARK: - UI

	return (
		<View className={cn('relative h-[256px] w-full', className)}>
			{hideTimeDisplay ? (
				<PulsingDashRing
					className="absolute inset-0 top-4 left-1/2 -translate-x-1/2"
					size={272 + 12}
					animated={status === 'running' || status === 'overtime'}
					activeColor={activeRingColor}
					inactiveColor={tokens.base300}
				>
					<TimerProgressContent cx={cx} />
				</PulsingDashRing>
			) : (
				<ProgressRing
					className="absolute inset-0 top-4 left-1/2 -translate-x-1/2"
					progress={progress}
					size={272}
					progressColor={activeRingColor}
				>
					<TimerProgressContent cx={cx} />
				</ProgressRing>
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
	const hideTimeDisplay = useCompute(cx.$config, ({ value }) => value.hideTimeDisplay);
	const endMode = useCompute(cx.$config, ({ value }) => value.endMode);
	const maxSeconds = useCompute(cx.$config, ({ value }) => durationToSeconds(value.max));
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
	const timerDisplaySeconds = React.useMemo(
		() =>
			status === 'overtime'
				? Math.max(0, (totalSeconds ?? 0) + overtimeSeconds)
				: Math.max(0, remainingSeconds),
		[status, totalSeconds, overtimeSeconds, remainingSeconds]
	);
	const useHourClock = React.useMemo(
		() => hasTimerHours(timerDisplaySeconds) || (hideTimeDisplay && hasTimerHours(maxSeconds)),
		[timerDisplaySeconds, hideTimeDisplay, maxSeconds]
	);
	const timerText = React.useMemo(() => {
		if (!hideTimeDisplay || status === 'overtime') {
			return formatTimerClock(timerDisplaySeconds);
		}
		return formatTimerClockRedacted(maxSeconds);
	}, [hideTimeDisplay, maxSeconds, status, timerDisplaySeconds]);

	// MARK: - UI

	return (
		<View className="relative items-center">
			{status !== 'overtime' && !hideTimeDisplay && (
				<View className="absolute bottom-full flex-row items-center gap-1 pb-1.5">
					<BellIcon size={18} color={endTime != null ? tokens.base500 : tokens.base300} />
					<Text className={cn('text-xl', endTime != null ? 'text-base-500' : 'text-base-300')}>
						{endTime != null ? formatClockTime(endTime) : '--:--'}
					</Text>
				</View>
			)}

			<Text
				className={cn(
					'text-base-900 min-w-[190px] text-center font-extralight',
					useHourClock ? 'text-[58px] leading-[64px]' : 'text-[72px] leading-[80px]'
				)}
				adjustsFontSizeToFit
				numberOfLines={1}
			>
				{timerText}
			</Text>

			{status === 'overtime' && (
				<View className="absolute top-full flex-row items-center gap-1 pt-1.5">
					<ClockIcon size={18} color={endMode === 'overtime' ? tokens.warning : tokens.secondary} />
					<Text
						className={cn('text-xl', endMode === 'overtime' ? 'text-warning' : 'text-secondary')}
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
