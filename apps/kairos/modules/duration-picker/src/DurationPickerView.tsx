import { requireNativeViewManager } from 'expo-modules-core';
import type { ViewProps } from 'react-native';

export interface DurationPickerChangeEvent {
	hours: number;
	minutes: number;
	seconds: number;
}

export interface DurationPickerViewProps extends ViewProps {
	hours: number;
	minutes: number;
	seconds: number;
	// Extra spacing between hour/min/sec groups, valid range 0...20 on iOS.
	groupSpacing?: number;
	onDurationChange?: (event: { nativeEvent: DurationPickerChangeEvent }) => void;
}

const NativeDurationPickerView = requireNativeViewManager<DurationPickerViewProps>('DurationPicker');

export function DurationPickerView(props: DurationPickerViewProps) {
	return <NativeDurationPickerView {...props} />;
}
