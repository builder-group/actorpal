import { type CommonViewModifierProps } from '@expo/ui/swift-ui';
import { createViewModifierEventListener } from '@expo/ui/swift-ui/modifiers';
import { requireNativeView } from 'expo';

export interface TimePickerViewProps extends CommonViewModifierProps {
	title: string;
	children?: React.ReactNode;
}

const NativeTimePickerView = requireNativeView<TimePickerViewProps>('TimePicker', 'TimePickerView');

export function TimePickerView({ modifiers, ...restProps }: TimePickerViewProps) {
	return (
		<NativeTimePickerView
			modifiers={modifiers}
			{...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
			{...restProps}
		/>
	);
}
