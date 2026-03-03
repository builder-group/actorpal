import React from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { DurationSelectRow, SettingsRow } from '@/components';

const Screen: React.FC = () => {
	const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
	const [minHours, setMinHours] = React.useState(0);
	const [minMinutes, setMinMinutes] = React.useState(1);
	const [minSeconds, setMinSeconds] = React.useState(0);
	const [maxHours, setMaxHours] = React.useState(0);
	const [maxMinutes, setMaxMinutes] = React.useState(5);
	const [maxSeconds, setMaxSeconds] = React.useState(0);
	const [hideTimer, setHideTimer] = React.useState(false);
	const [loop, setLoop] = React.useState(false);

	// MARK: - Actions

	const toggleRow = React.useCallback((id: string) => {
		setExpandedRowId((current) => (current === id ? null : id));
	}, []);

	// MARK: - UI

	return (
		<ScrollView
			className="bg-base-0 flex-1"
			contentContainerClassName="px-5 py-10"
			showsVerticalScrollIndicator={false}
		>
			<View className="border-base-200 bg-base-50 overflow-hidden rounded-[32px] border p-4">
				<DurationSelectRow
					title="Minimum"
					subtitle="Earliest the timer can fire"
					hours={minHours}
					minutes={minMinutes}
					seconds={minSeconds}
					onDurationChange={({ nativeEvent }) => {
						setMinHours(nativeEvent.hours);
						setMinMinutes(nativeEvent.minutes);
						setMinSeconds(nativeEvent.seconds);
					}}
					expanded={expandedRowId === 'min'}
					onToggle={() => toggleRow('min')}
				/>

				<View className="bg-base-200 my-4 h-px" />

				<DurationSelectRow
					title="Maximum"
					subtitle="Latest the timer can fire"
					hours={maxHours}
					minutes={maxMinutes}
					seconds={maxSeconds}
					onDurationChange={({ nativeEvent }) => {
						setMaxHours(nativeEvent.hours);
						setMaxMinutes(nativeEvent.minutes);
						setMaxSeconds(nativeEvent.seconds);
					}}
					expanded={expandedRowId === 'max'}
					onToggle={() => toggleRow('max')}
				/>

				<View className="bg-base-200 my-4 h-px" />

				<SettingsRow
					title="Hide timer"
					subtitle="Show a pulse instead of the countdown"
					rightAccessory={<Switch value={hideTimer} onValueChange={setHideTimer} />}
					className="px-1"
				/>

				<View className="bg-base-200 my-4 h-px" />

				<SettingsRow
					title="Loop"
					subtitle="Restart automatically after each round"
					rightAccessory={<Switch value={loop} onValueChange={setLoop} disabled />}
					className="px-1"
					disabled
				/>
			</View>
		</ScrollView>
	);
};

export default Screen;
