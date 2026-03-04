import { useCompute } from 'feature-react/state';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { TimerCx } from '../TimerCx';

export const TimerControls: React.FC<TTimerControlsProps> = ({ cx }) => {
	const status = useCompute(cx.$status, ({ value }) => value);

	const canPause = status === 'running' || status === 'paused';

	// MARK: - Actions

	const handleCancel = React.useCallback(() => {
		cx.cancel();
	}, [cx]);

	const handlePrimaryAction = React.useCallback(() => {
		if (status === 'paused') {
			cx.resume();
			return;
		}
		cx.pause();
	}, [cx, status]);

	// MARK: - UI

	return (
		<View className="w-full flex-row items-center justify-between px-4">
			<Pressable
				className="h-24 w-24 items-center justify-center rounded-full bg-[#ECECF2] dark:bg-[#171723]"
				onPress={handleCancel}
			>
				<Text className="text-base-900 text-[18px]">Cancel</Text>
			</Pressable>

			{canPause && (
				<Pressable
					className="h-24 w-24 items-center justify-center rounded-full bg-[#DDEBFF] dark:bg-[#0A2A57]"
					onPress={handlePrimaryAction}
				>
					<Text className="text-[18px] text-[#0A66D6] dark:text-[#69AEFF]">
						{status === 'paused' ? 'Resume' : 'Pause'}
					</Text>
				</Pressable>
			)}
		</View>
	);
};

interface TTimerControlsProps {
	cx: TimerCx;
}
