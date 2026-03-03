import React from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/lib';
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
		expanded,
		onToggle,
		disabled = false,
		className,
		testID
	} = props;

	const compactSegments = [pad(hours), pad(minutes), pad(seconds)];

	return (
		<View testID={testID} className={cn(className)}>
			<SettingsRow
				title={title}
				subtitle={subtitle}
				onPress={onToggle}
				disabled={disabled}
				rightAccessory={
					<View className="rounded-2xl px-3 py-2">
						<View className="flex-row items-center">
							{compactSegments.map((segment, index) => (
								<React.Fragment key={`segment-${index}`}>
									<View className="bg-base-200 rounded-xl border-2 border-transparent px-3 py-1.5">
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

			{expanded ? (
				<View className="mt-4 rounded-2xl p-3">
					<Text className="text-base-500 text-sm">Duration picker is currently iOS-only.</Text>
				</View>
			) : null}
		</View>
	);
};
