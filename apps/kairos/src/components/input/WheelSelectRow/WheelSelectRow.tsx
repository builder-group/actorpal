import React from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/lib';
import { SettingsRow } from '../../layout/SettingsRow';
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
		compactSeparator = ':',
		className,
		testID
	} = props;
	const compactSegments = React.useMemo(
		() =>
			columns.map((column) => {
				const selectedItem =
					column.items.find((item) => item.value === column.value) ?? column.items[0];
				return selectedItem?.label ?? '—';
			}),
		[columns]
	);

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
								<React.Fragment key={`compact-segment-${index}`}>
									<View className="bg-base-200 rounded-xl border-2 border-transparent px-3 py-1.5">
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

			{expanded ? (
				<View className="mt-4 rounded-2xl p-3">
					<Text className="text-base-500 text-sm">Wheel selector is currently iOS-only.</Text>
				</View>
			) : null}
		</View>
	);
};
