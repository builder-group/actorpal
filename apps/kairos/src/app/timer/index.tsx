import { Form, Host, Section, Toggle } from '@expo/ui/swift-ui';
import { listSectionSpacing } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { Pressable, Text as RNText, ScrollView, useColorScheme, View } from 'react-native';
import { DurationPickerView } from '../../../modules/duration-picker';

type TActiveTimer = 'min' | 'max';

function formatDuration(h: number, m: number, s: number): string {
	if (h > 0) return `${h}h ${m}m ${s}s`;
	if (m > 0 && s === 0) return `${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	if (s > 0) return `${s}s`;
	return '0s';
}

const Screen: React.FC = () => {
	const colorScheme = useColorScheme();
	const startBg = colorScheme === 'dark' ? '#1C3620' : '#E3F5E9';
	const startText = colorScheme === 'dark' ? '#30D158' : '#248A3D';

	const [activeTimer, setActiveTimer] = React.useState<TActiveTimer>('min');
	const [minHours, setMinHours] = React.useState(0);
	const [minMinutes, setMinMinutes] = React.useState(1);
	const [minSeconds, setMinSeconds] = React.useState(0);
	const [maxHours, setMaxHours] = React.useState(0);
	const [maxMinutes, setMaxMinutes] = React.useState(5);
	const [maxSeconds, setMaxSeconds] = React.useState(0);
	const [hideTimer, setHideTimer] = React.useState(false);

	const hours = activeTimer === 'min' ? minHours : maxHours;
	const minutes = activeTimer === 'min' ? minMinutes : maxMinutes;
	const seconds = activeTimer === 'min' ? minSeconds : maxSeconds;

	const handleDurationChange = React.useCallback(
		({ nativeEvent }: { nativeEvent: { hours: number; minutes: number; seconds: number } }) => {
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

	return (
		<ScrollView
			className="bg-base-0 flex-1"
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			{/* Duration wheel — floating on background */}
			<DurationPickerView
				key={activeTimer}
				style={{ height: 216, backgroundColor: 'transparent' }}
				hours={hours}
				minutes={minutes}
				seconds={seconds}
				onDurationChange={handleDurationChange}
			/>

			{/* Controls row: [MIN | MAX] [Start] */}
			<View className="flex-row items-center gap-[10px] px-4 pb-5">
				{/* MIN | MAX pill */}
				<View className="bg-base-50 h-16 flex-2 flex-row rounded-[32px]">
					<Pressable
						className="flex-1 items-center justify-center gap-[3px]"
						onPress={() => setActiveTimer('min')}
					>
						<RNText
							className={`text-[11px] font-semibold tracking-[0.6px] ${activeTimer === 'min' ? 'text-primary' : 'text-base-500'}`}
						>
							MIN
						</RNText>
						<RNText
							className={`text-[20px] font-light ${activeTimer === 'min' ? 'text-base-900' : 'text-base-500'}`}
							adjustsFontSizeToFit
							numberOfLines={1}
						>
							{formatDuration(minHours, minMinutes, minSeconds)}
						</RNText>
					</Pressable>

					<View className="bg-base-300 my-3 w-px" />

					<Pressable
						className="flex-1 items-center justify-center gap-[3px]"
						onPress={() => setActiveTimer('max')}
					>
						<RNText
							className={`text-[11px] font-semibold tracking-[0.6px] ${activeTimer === 'max' ? 'text-primary' : 'text-base-500'}`}
						>
							MAX
						</RNText>
						<RNText
							className={`text-[20px] font-light ${activeTimer === 'max' ? 'text-base-900' : 'text-base-500'}`}
							adjustsFontSizeToFit
							numberOfLines={1}
						>
							{formatDuration(maxHours, maxMinutes, maxSeconds)}
						</RNText>
					</Pressable>
				</View>

				{/* Start button */}
				<Pressable
					className="h-24 w-24 items-center justify-center rounded-full"
					style={{ backgroundColor: startBg }}
				>
					<RNText style={{ color: startText, fontSize: 18 }}>Start</RNText>
				</Pressable>
			</View>

			{/* Options */}
			<Host matchContents useViewportSizeMeasurement style={{ width: '100%' }}>
				<Form modifiers={[listSectionSpacing('compact')]}>
					<Section>
						<Toggle isOn={hideTimer} label="Hide Timer" onIsOnChange={setHideTimer} />
					</Section>
				</Form>
			</Host>
		</ScrollView>
	);
};

export default Screen;
