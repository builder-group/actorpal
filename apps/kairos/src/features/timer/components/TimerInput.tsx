import { useCompute } from 'feature-react/state';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SegmentControl, TSegmentControlItem } from '@/components';
import {
	DurationPickerView,
	TDurationPickerChangeEvent
} from '../../../../modules/duration-picker';
import { TimerCx } from '../TimerCx';

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
							{formatDuration(min.h, min.m, min.s)}
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
							{formatDuration(max.h, max.m, max.s)}
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
				style={{ height: 216, backgroundColor: 'transparent' }}
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

				<Pressable
					className="h-24 w-24 items-center justify-center rounded-full bg-[#E3F5E9] dark:bg-[#1C3620]"
					onPress={() => cx.start()}
				>
					<Text className="text-[18px] text-[#248A3D] dark:text-[#30D158]">Start</Text>
				</Pressable>
			</View>
		</>
	);
};

interface TTimerInputProps {
	cx: TimerCx;
}

type TActiveTimer = 'min' | 'max';

// MARK: - Helpers

function formatDuration(h: number, m: number, s: number): string {
	if (h > 0) return `${h}h ${m}m ${s}s`;
	if (m > 0 && s === 0) return `${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	if (s > 0) return `${s}s`;
	return '0s';
}
