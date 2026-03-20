import React from 'react';
import { Animated, Text, View } from 'react-native';
import { cn } from '@/lib';
import { DurationPickerView } from '@/modules/duration-picker';
import { SettingsRow } from '../../layout/SettingsRow';
import type { TDurationSelectRowProps } from './types';

const pad = (n: number) => n.toString().padStart(2, '0');

export const DurationSelectRow = (props: TDurationSelectRowProps) => {
	const {
		title,
		subtitle,
		children,
		hours,
		minutes,
		seconds,
		onDurationChange,
		expanded,
		onToggle,
		disabled = false,
		groupSpacing,
		valueToUnitSpacing,
		wheelHeight = 216,
		className,
		testID
	} = props;

	const animated = React.useRef(new Animated.Value(expanded ? 1 : 0)).current;
	const contentHeight = wheelHeight + 28;
	const compactSegments = [pad(hours), pad(minutes), pad(seconds)];

	// MARK: - Actions

	const handlePress = React.useCallback(() => {
		if (disabled) return;
		onToggle();
	}, [disabled, onToggle]);

	// MARK: - Effects

	React.useEffect(() => {
		Animated.timing(animated, {
			toValue: expanded ? 1 : 0,
			duration: expanded ? 220 : 180,
			useNativeDriver: false
		}).start();
	}, [animated, expanded]);

	// MARK: - UI

	return (
		<View testID={testID} className={cn(className)}>
			{/* Header */}
			<SettingsRow
				title={title}
				subtitle={subtitle}
				onPress={handlePress}
				disabled={disabled}
				rightAccessory={
					<View className="rounded-2xl px-3 py-2">
						<View className="flex-row items-center">
							{compactSegments.map((segment, index) => (
								<React.Fragment key={`segment-${index}`}>
									<View
										className={cn(
											'bg-base-200 rounded-xl border-2 border-transparent px-3 py-1.5',
											expanded && 'border-primary'
										)}
									>
										<Text className="text-base-900 text-[17px] leading-[22px] font-semibold">
											{segment}
										</Text>
									</View>
									{index < compactSegments.length - 1 ? (
										<Text className="text-base-700 px-2 text-[17px] leading-[22px] font-semibold">
											:
										</Text>
									) : null}
								</React.Fragment>
							))}
						</View>
					</View>
				}
			>
				{children}
			</SettingsRow>

			{/* Expanded Content */}
			<Animated.View
				style={{
					height: animated.interpolate({
						inputRange: [0, 1],
						outputRange: [0, contentHeight]
					}),
					opacity: animated,
					marginTop: animated.interpolate({
						inputRange: [0, 1],
						outputRange: [0, 14]
					})
				}}
				className="overflow-hidden"
				pointerEvents={expanded && !disabled ? 'auto' : 'none'}
			>
				<View className="bg-base-0 rounded-2xl p-3">
					<DurationPickerView
						style={{ height: wheelHeight }}
						hours={hours}
						minutes={minutes}
						seconds={seconds}
						groupSpacing={groupSpacing}
						valueToUnitSpacing={valueToUnitSpacing}
						onDurationChange={onDurationChange}
					/>
				</View>
			</Animated.View>
		</View>
	);
};
