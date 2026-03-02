import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { cn } from '@/lib';

export const SettingsRow: React.FC<TSettingsRowProps> = (props) => {
	const {
		title,
		subtitle,
		children,
		rightAccessory,
		onPress,
		disabled = false,
		className,
		testID
	} = props;

	const content = (
		<View className={cn('flex-row items-center gap-4', className)}>
			<View className="min-w-0 flex-1">
				{children ?? (
					<>
						{title != null ? (
							<Text className="text-base-900 text-[17px] leading-[22px] font-semibold">
								{title}
							</Text>
						) : null}
						{subtitle != null ? (
							<Text className="text-base-500 mt-0.5 text-[13px] leading-[18px] font-medium">
								{subtitle}
							</Text>
						) : null}
					</>
				)}
			</View>
			{rightAccessory != null ? (
				<View className="shrink-0 items-center justify-center">{rightAccessory}</View>
			) : null}
		</View>
	);

	if (onPress == null) {
		return (
			<View testID={testID} className={cn(disabled && 'opacity-60')}>
				{content}
			</View>
		);
	}

	return (
		<Pressable
			testID={testID}
			onPress={onPress}
			disabled={disabled}
			className={cn(disabled && 'opacity-60')}
		>
			{content}
		</Pressable>
	);
};

interface TSettingsRowProps {
	title?: string;
	subtitle?: string;
	children?: React.ReactNode;
	rightAccessory?: React.ReactNode;
	onPress?: () => void;
	disabled?: boolean;
	className?: string;
	testID?: string;
}
