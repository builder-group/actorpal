import type { ReactNode } from 'react';
import type { TDurationPickerChangeEvent } from '@/modules/duration-picker';

export interface TDurationSelectRowProps {
	title?: string;
	subtitle?: string;
	children?: ReactNode;
	hours: number;
	minutes: number;
	seconds: number;
	onDurationChange: (event: { nativeEvent: TDurationPickerChangeEvent }) => void;
	expanded: boolean;
	onToggle: () => void;
	disabled?: boolean;
	groupSpacing?: number;
	valueToUnitSpacing?: number;
	wheelHeight?: number;
	className?: string;
	testID?: string;
}
