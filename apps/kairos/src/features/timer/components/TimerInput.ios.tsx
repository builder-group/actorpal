import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SegmentControl } from '@/components';
import {
	DurationPickerView,
	TDurationPickerChangeEvent
} from '../../../../modules/duration-picker';

type TActiveTimer = 'min' | 'max';

export const TimerInput: React.FC = () => {
	const [activeTimer, setActiveTimer] = React.useState<TActiveTimer>('min');
	const [minHours, setMinHours] = React.useState(0);
	const [minMinutes, setMinMinutes] = React.useState(1);
	const [minSeconds, setMinSeconds] = React.useState(0);
	const [maxHours, setMaxHours] = React.useState(0);
	const [maxMinutes, setMaxMinutes] = React.useState(5);
	const [maxSeconds, setMaxSeconds] = React.useState(0);

	const hours = activeTimer === 'min' ? minHours : maxHours;
	const minutes = activeTimer === 'min' ? minMinutes : maxMinutes;
	const seconds = activeTimer === 'min' ? minSeconds : maxSeconds;

	const handleDurationChange = React.useCallback(
		({ nativeEvent }: { nativeEvent: TDurationPickerChangeEvent }) => {
			if (activeTimer === 'min') {
				setMinHours(nativeEvent.hours);
				setMinMinutes(nativeEvent.minutes);
				setMinSeconds(nativeEvent.seconds);
			} else {
				setMaxHours(nativeEvent.hours);
				setMaxMinutes(nativeEvent.minutes);
				setMaxSeconds(nativeEvent.seconds);
			}
		},
		[activeTimer]
	);

	const handleActiveTimerChange = React.useCallback((nextValue: string) => {
		if (nextValue === 'min' || nextValue === 'max') {
			setActiveTimer(nextValue);
		}
	}, []);

	const timerItems = React.useMemo(
		() => [
			{
				key: 'min' as const,
				render: ({ isSelected }: { isSelected: boolean }) => (
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
							{formatDuration(minHours, minMinutes, minSeconds)}
						</Text>
					</>
				)
			},
			{
				key: 'max' as const,
				render: ({ isSelected }: { isSelected: boolean }) => (
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
							{formatDuration(maxHours, maxMinutes, maxSeconds)}
						</Text>
					</>
				)
			}
		],
		[minHours, minMinutes, minSeconds, maxHours, maxMinutes, maxSeconds]
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

			<View className="flex-row items-center gap-3 px-4 pb-1">
				<SegmentControl
					value={activeTimer}
					onValueChange={handleActiveTimerChange}
					items={timerItems}
					className="flex-1"
				/>

				<Pressable className="h-24 w-24 items-center justify-center rounded-full bg-[#E3F5E9] dark:bg-[#1C3620]">
					<Text className="text-[18px] text-[#248A3D] dark:text-[#30D158]">Start</Text>
				</Pressable>
			</View>
		</>
	);
};

function formatDuration(h: number, m: number, s: number): string {
	if (h > 0) return `${h}h ${m}m ${s}s`;
	if (m > 0 && s === 0) return `${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	if (s > 0) return `${s}s`;
	return '0s';
}
