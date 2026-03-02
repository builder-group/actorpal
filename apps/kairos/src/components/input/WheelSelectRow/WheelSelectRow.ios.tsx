import React from 'react';
import { Animated, Text, View } from 'react-native';
import { cn } from '@/lib';
import { SettingsRow } from '../../layout/SettingsRow';
import { WheelPicker } from '../WheelPicker';
import type { TWheelSelectRowProps } from './types';

export const WheelSelectRow = (props: TWheelSelectRowProps) => {
	const {
		title,
		subtitle,
		children,
		columns,
		expanded,
		onToggle,
		disabled = false,
		separator = ':',
		compactSeparator = separator,
		wheelHeight = 216,
		className,
		testID
	} = props;
	const animated = React.useRef(new Animated.Value(expanded ? 1 : 0)).current;
	const columnsCount = columns.length;
	const contentHeight = wheelHeight + 28;

	const compactSegments = React.useMemo(
		() =>
			columns.map((column) => {
				const selectedItem =
					column.items.find((item) => item.value === column.value) ?? column.items[0];
				return selectedItem?.label ?? '—';
			}),
		[columns]
	);

	// MARK: - Actions

	const handlePress = React.useCallback(() => {
		if (disabled) {
			return;
		}

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
								<React.Fragment key={`compact-segment-${index}`}>
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
									{index < compactSegments.length - 1 && compactSeparator.length > 0 ? (
										<Text className="text-base-700 px-2 text-[17px] leading-[22px] font-semibold">
											{compactSeparator}
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
					<View className="flex-row items-center justify-center">
						{columns.map((column, index) => (
							<React.Fragment key={column.id}>
								<View style={column.width != null ? { width: column.width } : { flex: 1 }}>
									<WheelPicker
										items={column.items}
										value={column.value}
										onChange={column.onChange}
										height={wheelHeight}
										disabled={disabled}
									/>
								</View>
								{column.suffix != null ? (
									<Text
										className="text-base-500 px-2 text-[13px] leading-[18px] font-medium"
										style={{ opacity: 0.72 }}
									>
										{column.suffix}
									</Text>
								) : null}
								{index < columnsCount - 1 && separator.length > 0 ? (
									<Text
										className="text-base-500 px-1 text-[17px] leading-[22px] font-semibold"
										style={{ opacity: 0.78 }}
									>
										{separator}
									</Text>
								) : null}
							</React.Fragment>
						))}
					</View>
				</View>
			</Animated.View>
		</View>
	);
};
