import React from 'react';
import { ScrollView } from 'react-native';
import { TimerConfiguration, TimerInput } from '@/features/timer';

const Screen: React.FC = () => {
	return (
		<ScrollView
			className="dark:bg-base-0 bg-base-50 flex-1"
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			<TimerInput />
			<TimerConfiguration />
		</ScrollView>
	);
};

export default Screen;
