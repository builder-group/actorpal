import { useCompute } from 'feature-react/state';
import React from 'react';
import { ScrollView } from 'react-native';
import { TimerActive, TimerConfiguration, TimerInput, useTimerCx } from '@/features/timer';

const Screen: React.FC = () => {
	const cx = useTimerCx();
	const isActive = useCompute(cx.$status, ({ value }) => value !== 'idle');

	return (
		<ScrollView
			className="dark:bg-base-0 bg-base-50 flex-1"
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			{isActive ? <TimerActive /> : <TimerInput />}
			<TimerConfiguration />
		</ScrollView>
	);
};

export default Screen;
