import {
	Form,
	Host,
	LabeledContent,
	Picker,
	Section,
	Text,
	TextField,
	Toggle
} from '@expo/ui/swift-ui';
import {
	disabled,
	frame,
	listSectionSpacing,
	multilineTextAlignment,
	tag,
	textFieldStyle
} from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { Pressable, Text as RNText, ScrollView, View } from 'react-native';
import { SegmentControl } from '@/components';
import { DurationPickerView, TDurationPickerChangeEvent } from '../../../modules/duration-picker';

const Screen: React.FC = () => {
	const [activeTimer, setActiveTimer] = React.useState<TActiveTimer>('min');
	const [hideTimer, setHideTimer] = React.useState(false);
	const [timerLabel, setTimerLabel] = React.useState('Timer');
	const [whenTimerEnds, setWhenTimerEnds] = React.useState<TWhenTimerEnds>('radar');
	const [interval, setInterval] = React.useState<TInterval>('off');

	const [minHours, setMinHours] = React.useState(0);
	const [minMinutes, setMinMinutes] = React.useState(1);
	const [minSeconds, setMinSeconds] = React.useState(0);
	const [maxHours, setMaxHours] = React.useState(0);
	const [maxMinutes, setMaxMinutes] = React.useState(5);
	const [maxSeconds, setMaxSeconds] = React.useState(0);

	const hours = activeTimer === 'min' ? minHours : maxHours;
	const minutes = activeTimer === 'min' ? minMinutes : maxMinutes;
	const seconds = activeTimer === 'min' ? minSeconds : maxSeconds;

	const timerItems = React.useMemo(
		() => [
			{
				key: 'min' as const,
				render: ({ isSelected }: { isSelected: boolean }) => (
					<>
						<RNText
							className={`text-[11px] font-semibold tracking-[0.6px] ${isSelected ? 'text-primary' : 'text-base-500'}`}
						>
							MIN
						</RNText>
						<RNText
							className={`text-[20px] font-light ${isSelected ? 'text-base-900' : 'text-base-500'}`}
							adjustsFontSizeToFit
							numberOfLines={1}
						>
							{formatDuration(minHours, minMinutes, minSeconds)}
						</RNText>
					</>
				)
			},
			{
				key: 'max' as const,
				render: ({ isSelected }: { isSelected: boolean }) => (
					<>
						<RNText
							className={`text-[11px] font-semibold tracking-[0.6px] ${isSelected ? 'text-primary' : 'text-base-500'}`}
						>
							MAX
						</RNText>
						<RNText
							className={`text-[20px] font-light ${isSelected ? 'text-base-900' : 'text-base-500'}`}
							adjustsFontSizeToFit
							numberOfLines={1}
						>
							{formatDuration(maxHours, maxMinutes, maxSeconds)}
						</RNText>
					</>
				)
			}
		],
		[minHours, minMinutes, minSeconds, maxHours, maxMinutes, maxSeconds]
	);

	// MARK: - Actions

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

	// MARK: - UI

	return (
		<ScrollView
			className="bg-base-0 flex-1"
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			{/* Duration wheel */}
			<DurationPickerView
				key={activeTimer}
				style={{ height: 216, backgroundColor: 'transparent' }}
				hours={hours}
				minutes={minutes}
				seconds={seconds}
				onDurationChange={handleDurationChange}
			/>

			{/* Controls row */}
			<View className="flex-row items-center gap-3 px-4 pb-1">
				<SegmentControl
					value={activeTimer}
					onValueChange={handleActiveTimerChange}
					items={timerItems}
					className="flex-1"
				/>

				<Pressable className="h-24 w-24 items-center justify-center rounded-full bg-[#E3F5E9] dark:bg-[#1C3620]">
					<RNText className="text-[18px] text-[#248A3D] dark:text-[#30D158]">Start</RNText>
				</Pressable>
			</View>

			{/* Native options */}
			<Host matchContents useViewportSizeMeasurement>
				<Form modifiers={[listSectionSpacing('compact')]}>
					<Section>
						<LabeledContent label="Label">
							<TextField
								defaultValue={timerLabel}
								placeholder="Timer"
								onChangeText={setTimerLabel}
								modifiers={[
									textFieldStyle('plain'),
									frame({ width: 140, alignment: 'trailing' }),
									multilineTextAlignment('trailing')
								]}
							/>
						</LabeledContent>

						<Picker
							label="When Timer Ends"
							selection={whenTimerEnds}
							onSelectionChange={(value) => setWhenTimerEnds(value as TWhenTimerEnds)}
							modifiers={[disabled(true)]}
						>
							<Text modifiers={[tag('radar')]}>Radar</Text>
							<Text modifiers={[tag('bell')]}>Bell</Text>
						</Picker>

						<Toggle isOn={hideTimer} label="Hide Timers" onIsOnChange={setHideTimer} />

						<Picker
							label="Interval"
							selection={interval}
							onSelectionChange={(value) => setInterval(value as TInterval)}
							modifiers={[disabled(true)]}
						>
							<Text modifiers={[tag('off')]}>Off</Text>
							<Text modifiers={[tag('every-minute')]}>Every Minute</Text>
						</Picker>
					</Section>
				</Form>
			</Host>
		</ScrollView>
	);
};

export default Screen;

type TActiveTimer = 'min' | 'max';
type TWhenTimerEnds = 'radar' | 'bell';
type TInterval = 'off' | 'every-minute';

function formatDuration(h: number, m: number, s: number): string {
	if (h > 0) return `${h}h ${m}m ${s}s`;
	if (m > 0 && s === 0) return `${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	if (s > 0) return `${s}s`;
	return '0s';
}
