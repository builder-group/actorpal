import { useCompute } from 'feature-react/state';
import React from 'react';
import { ScrollView } from 'react-native';
import {
	TimerConfiguration,
	TimerControls,
	TimerInput,
	TimerProgress,
	useTimerCx
} from '@/features/timer';

const Screen: React.FC = () => {
	const cx = useTimerCx();
	const isActive = useCompute(cx.$status, ({ value }) => value !== 'idle');

	return (
		<ScrollView
			className="dark:bg-base-0 bg-base-50 flex-1"
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			{isActive ? (
				<>
					<TimerProgress cx={cx} />
					<TimerControls cx={cx} />
				</>
			) : (
				<TimerInput cx={cx} />
			)}
			<TimerConfiguration cx={cx} />
		</ScrollView>
	);
};

export default Screen;
