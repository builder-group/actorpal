import type { StyleProp, ViewStyle } from 'react-native';

export type TWheelValue = string | number;

export interface TWheelPickerItem<TValue extends TWheelValue = TWheelValue> {
	label: string;
	value: TValue;
}

export interface TWheelPickerProps<TValue extends TWheelValue = TWheelValue> {
	items: TWheelPickerItem<TValue>[];
	value: TValue;
	onChange: (value: TValue, item: TWheelPickerItem<TValue>) => void;
	height?: number;
	disabled?: boolean;
	className?: string;
	style?: StyleProp<ViewStyle>;
	testID?: string;
}
