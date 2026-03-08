import type { ReactNode } from 'react';
import type { TWheelPickerItem, TWheelValue } from '../WheelPicker';

export interface TWheelSelectColumn {
	id: string;
	items: TWheelPickerItem[];
	value: TWheelValue;
	onChange: (value: TWheelValue, item: TWheelPickerItem) => void;
	width?: number;
	suffix?: string;
}

export interface TWheelSelectRowProps {
	title?: string;
	subtitle?: string;
	children?: ReactNode;
	columns: [TWheelSelectColumn, ...TWheelSelectColumn[]];
	expanded: boolean;
	onToggle: () => void;
	disabled?: boolean;
	separator?: string;
	compactSeparator?: string;
	wheelHeight?: number;
	className?: string;
	testID?: string;
}
