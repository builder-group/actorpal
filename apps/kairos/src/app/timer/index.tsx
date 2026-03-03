import { Form, Host, Section, Toggle } from '@expo/ui/swift-ui';
import { listSectionSpacing } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { Animated, Pressable, Text as RNText, ScrollView, View } from 'react-native';
import { DurationPickerView } from '../../../modules/duration-picker';

const Screen: React.FC = () => {
	const [activeTimer, setActiveTimer] = React.useState<TActiveTimer>('min');
	const [pillWidth, setPillWidth] = React.useState(0);
	const slideAnim = React.useRef(new Animated.Value(0)).current;

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

	const setActive = (side: TActiveTimer) => {
		setActiveTimer(side);
		Animated.spring(slideAnim, {
			toValue: side === 'min' ? 0 : 1,
			useNativeDriver: true,
			speed: 15,
			bounciness: 4
		}).start();
	};

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

	// MARK: - UI

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

			{/* Controls row: [MIN | MAX pill] [Start circle] */}
			<View className="flex-row items-center gap-[10px] px-4 pb-5">
				{/* MIN | MAX pill */}
				<View
					className="bg-base-50 h-16 flex-2 flex-row rounded-[32px]"
					onLayout={(e) => setPillWidth(e.nativeEvent.layout.width)}
				>
					{/* Sliding indicator */}
					{pillWidth > 0 && (
						<Animated.View
							className="bg-base-0 dark:bg-base-300 absolute rounded-[29px]"
							style={{
								top: 3,
								bottom: 3,
								left: 3,
								width: pillWidth / 2 - 6,
								shadowColor: '#000',
								shadowOpacity: 0.12,
								shadowRadius: 3,
								shadowOffset: { width: 0, height: 1 },
								transform: [
									{
										translateX: slideAnim.interpolate({
											inputRange: [0, 1],
											outputRange: [0, pillWidth / 2]
										})
									}
								]
							}}
						/>
					)}

					<Pressable
						className="flex-1 items-center justify-center gap-[3px]"
						onPress={() => setActive('min')}
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

					<Pressable
						className="flex-1 items-center justify-center gap-[3px]"
						onPress={() => setActive('max')}
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
				<Pressable className="h-24 w-24 items-center justify-center rounded-full bg-[#E3F5E9] dark:bg-[#1C3620]">
					<RNText className="text-[18px] text-[#248A3D] dark:text-[#30D158]">Start</RNText>
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

type TActiveTimer = 'min' | 'max';

function formatDuration(h: number, m: number, s: number): string {
	if (h > 0) return `${h}h ${m}m ${s}s`;
	if (m > 0 && s === 0) return `${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	if (s > 0) return `${s}s`;
	return '0s';
}
