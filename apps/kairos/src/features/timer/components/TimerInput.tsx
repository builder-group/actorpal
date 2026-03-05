import { useCompute } from 'feature-react/state';
import React from 'react';
import { Text, View } from 'react-native';
import { SegmentControl, TSegmentControlItem } from '@/components';
import {
	DurationPickerView,
	TDurationPickerChangeEvent
} from '../../../../modules/duration-picker';
import { formatDurationCompact } from '../format';
import { TimerCx } from '../TimerCx';
import { TimerActionButton } from './TimerActionButton';

export const TimerInput: React.FC<TTimerInputProps> = (props) => {
	const { cx } = props;
	const min = useCompute(cx.$config, ({ value }) => value.min);
	const max = useCompute(cx.$config, ({ value }) => value.max);
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
		cx.start();
	}, [cx]);

	// MARK: - UI

	const timerItems = React.useMemo<TSegmentControlItem[]>(
		() => [
			{
				key: 'min' as const,
				render: ({ isSelected }) => (
					<>
						<Text
							className={`text-[11px] font-semibold tracking-[0.6px] ${isSelected ? 'text-primary' : 'text-base-500'}`}
						>
							MIN
						</Text>
						<Text
							className={`text-[20px] font-light ${isSelected ? 'text-base-900' : 'text-base-500'}`}
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
							className={`text-[11px] font-semibold tracking-[0.6px] ${isSelected ? 'text-primary' : 'text-base-500'}`}
						>
							MAX
						</Text>
						<Text
							className={`text-[20px] font-light ${isSelected ? 'text-base-900' : 'text-base-500'}`}
							adjustsFontSizeToFit
							numberOfLines={1}
						>
							{formatDurationCompact(max)}
						</Text>
					</>
				)
			}
		],
		[min, max]
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
				<SegmentControl
					value={activeTimer}
					onValueChange={handleActiveTimerChange}
					items={timerItems}
					className="flex-1"
				/>

				<TimerActionButton label="Start" tone="start" onPress={handleStart} />
			</View>
		</>
	);
};

interface TTimerInputProps {
	cx: TimerCx;
}

type TActiveTimer = 'min' | 'max';
