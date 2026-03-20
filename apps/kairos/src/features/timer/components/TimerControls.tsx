import { useCompute } from 'feature-react/state';
import React from 'react';
import { View } from 'react-native';
import { TimerCx } from '../TimerCx';
import { TimerActionButton } from './TimerActionButton';

export const TimerControls: React.FC<TTimerControlsProps> = ({ cx }) => {
	const status = useCompute(cx.$status, ({ value }) => value);

	const canRightAction = status === 'running' || status === 'paused' || status === 'overtime';
	const rightActionLabel =
		status === 'overtime' ? 'Repeat' : status === 'paused' ? 'Resume' : 'Pause';
	const rightActionTone = status === 'running' ? 'warning' : 'positive';

	// MARK: - Actions

	const handleCancel = React.useCallback(() => {
		cx.cancel();
	}, [cx]);

	const handlePrimaryAction = React.useCallback(() => {
		if (status === 'overtime') {
			void cx.start();
			return;
		}
		if (status === 'paused') {
			void cx.resume();
			return;
		}
		cx.pause();
	}, [cx, status]);

	// MARK: - UI

	return (
		<View className="w-full flex-row items-center justify-between px-4">
			<TimerActionButton label="Cancel" tone="neutral" onPress={handleCancel} />

			{canRightAction && (
				<TimerActionButton
					label={rightActionLabel}
					tone={rightActionTone}
					onPress={handlePrimaryAction}
				/>
			)}
		</View>
	);
};

interface TTimerControlsProps {
	cx: TimerCx;
}
