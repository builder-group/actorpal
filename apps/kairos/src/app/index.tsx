import React from 'react';
import { ScrollView, Switch, View } from 'react-native';
import {
	SettingsRow,
	WheelSelectRow,
	type TWheelPickerItem,
	type TWheelSelectColumn
} from '@/components';

const Screen: React.FC = () => {
	const [expandedRowId, setExpandedRowId] = React.useState<string | null>('start-time');
	const [startHour, setStartHour] = React.useState(8);
	const [startMinute, setStartMinute] = React.useState(45);
	const [endHour, setEndHour] = React.useState(10);
	const [endMinute, setEndMinute] = React.useState(0);
	const [repeatDaily, setRepeatDaily] = React.useState(true);

	const hourItems = React.useMemo<TWheelPickerItem<number>[]>(
		() =>
			Array.from({ length: 24 }, (_, index) => ({
				label: `${index}`.padStart(2, '0'),
				value: index
			})),
		[]
	);

	const minuteItems = React.useMemo<TWheelPickerItem<number>[]>(
		() =>
			Array.from({ length: 12 }, (_, index) => {
				const value = index * 5;
				return { label: `${value}`.padStart(2, '0'), value };
			}),
		[]
	);

	const startColumns = React.useMemo<[TWheelSelectColumn, TWheelSelectColumn]>(
		() => [
			{
				id: 'start-hour',
				items: hourItems,
				value: startHour,
				onChange: (value) => setStartHour(Number(value)),
				width: 92,
				suffix: 'h'
			},
			{
				id: 'start-minute',
				items: minuteItems,
				value: startMinute,
				onChange: (value) => setStartMinute(Number(value)),
				width: 92,
				suffix: 'm'
			}
		],
		[hourItems, minuteItems, startHour, startMinute]
	);

	const endColumns = React.useMemo<[TWheelSelectColumn, TWheelSelectColumn]>(
		() => [
			{
				id: 'end-hour',
				items: hourItems,
				value: endHour,
				onChange: (value) => setEndHour(Number(value)),
				width: 92,
				suffix: 'h'
			},
			{
				id: 'end-minute',
				items: minuteItems,
				value: endMinute,
				onChange: (value) => setEndMinute(Number(value)),
				width: 92,
				suffix: 'm'
			}
		],
		[hourItems, minuteItems, endHour, endMinute]
	);

	// MARK: - Actions

	const toggleRow = React.useCallback((id: string) => {
		setExpandedRowId((current) => (current === id ? null : id));
	}, []);

	return (
		<ScrollView
			className="bg-base-0 flex-1"
			contentContainerClassName="px-5 py-10"
			showsVerticalScrollIndicator={false}
		>
			<View className="border-base-200 bg-base-50 overflow-hidden rounded-[32px] border p-4">
				<WheelSelectRow
					title="Start time"
					subtitle="Alarm begins"
					columns={startColumns}
					separator=""
					compactSeparator=":"
					expanded={expandedRowId === 'start-time'}
					onToggle={() => toggleRow('start-time')}
				/>

				<View className="bg-base-200 my-4 h-px" />

				<WheelSelectRow
					title="End time"
					subtitle="Alarm snoozes"
					columns={endColumns}
					separator=""
					compactSeparator=":"
					expanded={expandedRowId === 'end-time'}
					onToggle={() => toggleRow('end-time')}
				/>

				<View className="bg-base-200 my-4 h-px" />

				<SettingsRow
					title="Repeat"
					subtitle="Repeat alarm every day"
					rightAccessory={<Switch value={repeatDaily} onValueChange={setRepeatDaily} />}
					className="px-1"
				/>
			</View>
		</ScrollView>
	);
};

export default Screen;
