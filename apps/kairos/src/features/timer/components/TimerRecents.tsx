import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { Text, View } from 'react-native';
import { TimerCx } from '../TimerCx';
import { TimerRecentItem } from './TimerRecentItem';

export const TimerRecents: React.FC<TTimerRecentsProps> = (props) => {
	const { cx } = props;
	const recents = useFeatureState(cx.$recents);
	const shouldMaskLatestRecent = useCompute(
		[cx.$config, cx.$status],
		([config, status]) => config.hideTimeDisplay && status !== 'idle'
	);

	// MARK: - UI

	if (!recents.length) {
		return null;
	}

	return (
		<View className="pt-2">
			<Text className="text-base-900 px-4 text-2xl font-medium">Recents</Text>
			<View className="mt-2">
				<View className="border-base-300 mx-4 border-t" />
				{recents.map((recent, index) => (
					<React.Fragment key={recent.hash}>
						<TimerRecentItem
							recent={recent}
							cx={cx}
							shouldMaskTitle={shouldMaskLatestRecent && index === 0}
						/>
						{index < recents.length - 1 ? <View className="border-base-300 mx-4 border-t" /> : null}
					</React.Fragment>
				))}
				<View className="border-base-300 mx-4 border-t" />
			</View>
		</View>
	);
};

interface TTimerRecentsProps {
	cx: TimerCx;
}
