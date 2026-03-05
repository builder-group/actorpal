import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '@/components';
import { hexToRgba } from '@/lib';

export const TimerActionButton: React.FC<TTimerActionButtonProps> = (props) => {
	const { label, tone = 'action', onPress, disabled = false } = props;
	const { tokens } = useTheme();

	const { backgroundColor, textColor } = React.useMemo(() => {
		switch (tone) {
			case 'start':
				return { backgroundColor: hexToRgba('#00D042', 0.14), textColor: '#00D042' };
			case 'pause':
				return { backgroundColor: hexToRgba('#FF8B00', 0.14), textColor: '#FF8B00' };
			case 'cancel':
				return {
					backgroundColor: hexToRgba(tokens.base700, 0.1),
					textColor: tokens.base800
				};
			case 'action':
			default:
				return {
					backgroundColor: hexToRgba(tokens.primary, 0.12),
					textColor: tokens.primary
				};
		}
	}, [tone, tokens.base700, tokens.base800, tokens.primary]);

	return (
		<Pressable
			className="h-24 w-24 items-center justify-center rounded-full"
			style={{ backgroundColor, opacity: disabled ? 0.45 : 1 }}
			onPress={onPress}
			disabled={disabled}
		>
			<Text className="text-[18px]" style={{ color: textColor }}>
				{label}
			</Text>
		</Pressable>
	);
};

interface TTimerActionButtonProps {
	label: string;
	tone?: TTimerActionButtonTone;
	onPress: () => void;
	disabled?: boolean;
}

type TTimerActionButtonTone = 'start' | 'action' | 'pause' | 'cancel';
