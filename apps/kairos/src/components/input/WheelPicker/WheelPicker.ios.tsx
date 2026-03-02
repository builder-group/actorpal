import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { View } from 'react-native';
import { cn } from '@/lib';
import { useTheme } from '../../provider';
import type { TWheelPickerItem, TWheelPickerProps, TWheelValue } from './types';

export const WheelPicker = <TValue extends TWheelValue>(props: TWheelPickerProps<TValue>) => {
	const {
		items,
		value,
		onChange,
		height = 216,
		disabled = false,
		className,
		style,
		testID
	} = props;
	const { theme } = useTheme();

	const itemByValue = React.useMemo(() => {
		const result = new Map<TWheelValue, TWheelPickerItem<TValue>>();
		items.forEach((item) => {
			result.set(item.value, item);
		});
		return result;
	}, [items]);

	const selectedValue = React.useMemo(() => {
		const controlled = itemByValue.get(value);
		return controlled?.value ?? items[0]?.value;
	}, [value, itemByValue, items]);

	// MARK: - Actions

	const handleSelectionChange = React.useCallback(
		(nextSelection: TWheelValue | null) => {
			if (nextSelection == null) {
				return;
			}

			const selectedItem = itemByValue.get(nextSelection);
			if (selectedItem == null) {
				return;
			}

			onChange(selectedItem.value, selectedItem);
		},
		[itemByValue, onChange]
	);

	// MARK: - UI

	if (!items.length) {
		return null;
	}

	return (
		<View testID={testID} className={cn('w-full', className)} style={style}>
			<Host style={{ height }} colorScheme={theme}>
				<Picker
					selection={selectedValue}
					onSelectionChange={handleSelectionChange}
					modifiers={[pickerStyle('wheel')]}
				>
					{items.map((item) => (
						<Text key={`${item.value}`} modifiers={[tag(item.value)]}>
							{item.label}
						</Text>
					))}
				</Picker>
			</Host>
			{disabled ? <View className="absolute inset-0" pointerEvents="auto" /> : null}
		</View>
	);
};
