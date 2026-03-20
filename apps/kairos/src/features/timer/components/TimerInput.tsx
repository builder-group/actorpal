import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { Text, View } from 'react-native';
import { SegmentControl, TSegmentControlItem } from '@/components';
import { cn } from '@/lib';
import { DurationPickerView, TDurationPickerChangeEvent } from '@/modules/duration-picker';
import {
	durationToSeconds,
	formatDurationCompact,
	getDurationCompactPartCount,
	isSameDuration
} from '../format';
import { TimerCx } from '../TimerCx';
import { TimerActionButton } from './TimerActionButton';

export const TimerInput: React.FC<TTimerInputProps> = (props) => {
	const { cx } = props;
	const { min, max, isInvalidRange, isFixedDuration } = useCombinedCompute(
		[cx.$config],
		([{ value: config }]) => {
			const min = config.min;
			const max = config.max;
			const minTotal = durationToSeconds(min);
			const maxTotal = durationToSeconds(max);
			return {
				min,
				max,
				isInvalidRange: minTotal > maxTotal,
				isFixedDuration: minTotal === maxTotal
			};
		},
		[],
		{
			isEqual: (a, b) =>
				isSameDuration(a.min, b.min) &&
				isSameDuration(a.max, b.max) &&
				a.isInvalidRange === b.isInvalidRange &&
				a.isFixedDuration === b.isFixedDuration
		}
	);
	const [activeTimer, setActiveTimer] = React.useState<TActiveTimer>('min');

	const hours = activeTimer === 'min' ? min.h : max.h;
	const minutes = activeTimer === 'min' ? min.m : max.m;
	const seconds = activeTimer === 'min' ? min.s : max.s;

	// MARK: - Actions

	const handleDurationChange = React.useCallback(
		({ nativeEvent }: { nativeEvent: TDurationPickerChangeEvent }) => {
			const next = { h: nativeEvent.hours, m: nativeEvent.minutes, s: nativeEvent.seconds };
			cx.$config.set((c) => ({ ...c, [activeTimer]: next }));
		},
		[activeTimer, cx]
	);

	const handleActiveTimerChange = React.useCallback((nextValue: string) => {
		if (nextValue === 'min' || nextValue === 'max') {
			setActiveTimer(nextValue);
		}
	}, []);

	const handleStart = React.useCallback(() => {
		void cx.start();
	}, [cx]);

	// MARK: - UI

	const timerItems = React.useMemo<TSegmentControlItem[]>(
		() => [
			{
				key: 'min' as const,
				render: ({ isSelected }) => (
					<>
						<Text
							className={cn(
								'text-[11px] font-semibold tracking-[0.6px]',
								isSelected ? 'text-primary' : 'text-base-500',
								isInvalidRange ? 'text-danger' : isFixedDuration ? 'text-warning' : null
							)}
						>
							MIN
						</Text>
						<Text
							className={cn(
								'font-light',
								getDurationCompactPartCount(min) === 3 ? 'text-[16px]' : 'text-[20px]',
								isSelected ? 'text-base-900' : 'text-base-500',
								isInvalidRange ? 'text-danger' : isFixedDuration ? 'text-warning' : null
							)}
							adjustsFontSizeToFit
							numberOfLines={1}
						>
							{formatDurationCompact(min)}
						</Text>
					</>
				)
			},
			{
				key: 'max' as const,
				render: ({ isSelected }) => (
					<>
						<Text
							className={cn(
								'text-[11px] font-semibold tracking-[0.6px]',
								isSelected ? 'text-primary' : 'text-base-500',
								isInvalidRange ? 'text-danger' : isFixedDuration ? 'text-warning' : null
							)}
						>
							MAX
						</Text>
						<Text
							className={cn(
								'font-light',
								getDurationCompactPartCount(max) === 3 ? 'text-[16px]' : 'text-[20px]',
								isSelected ? 'text-base-900' : 'text-base-500',
								isInvalidRange ? 'text-danger' : isFixedDuration ? 'text-warning' : null
							)}
							adjustsFontSizeToFit
							numberOfLines={1}
						>
							{formatDurationCompact(max)}
						</Text>
					</>
				)
			}
		],
		[isFixedDuration, isInvalidRange, max, min]
	);

	return (
		<>
			<DurationPickerView
				key={activeTimer}
				style={{ height: 256, backgroundColor: 'transparent' }}
				hours={hours}
				minutes={minutes}
				seconds={seconds}
				onDurationChange={handleDurationChange}
			/>

			<View className="flex-row items-center gap-3 px-4">
				<View className="relative z-10 flex-1">
					<SegmentControl
						value={activeTimer}
						onValueChange={handleActiveTimerChange}
						items={timerItems}
						className="w-full"
					/>
					{isInvalidRange && (
						<Text className="text-danger absolute top-full right-0 left-0 -mt-7 text-sm">
							MAX must be greater than or equal to MIN.
						</Text>
					)}
					{!isInvalidRange && isFixedDuration && (
						<Text className="text-warning absolute top-full right-0 left-0 -mt-7 text-sm">
							MIN and MAX are equal. Timer will always use the same duration.
						</Text>
					)}
				</View>

				<TimerActionButton
					label="Start"
					tone="positive"
					onPress={handleStart}
					disabled={isInvalidRange}
				/>
			</View>
		</>
	);
};

interface TTimerInputProps {
	cx: TimerCx;
}

type TActiveTimer = 'min' | 'max';
