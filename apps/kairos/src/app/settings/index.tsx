import React from 'react';
import { ScrollView, Text } from 'react-native';

const Screen: React.FC = () => {
	return (
		<ScrollView
			className="dark:bg-base-0 bg-base-50 flex-1"
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			<Text className="text-base-900 dark:text-base-50 text-center text-2xl font-semibold">
				Settings is currently iOS only.
			</Text>
		</ScrollView>
	);
};

export default Screen;
