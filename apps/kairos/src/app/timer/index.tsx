import React from 'react';
import { Text, View } from 'react-native';

const Screen: React.FC = () => {
	return (
		<View className="bg-base-0 flex-1 items-center justify-center px-6">
			<Text className="text-base-900 text-center text-[17px] leading-[22px]">
				Timer screen is currently supported on iOS only.
			</Text>
		</View>
	);
};

export default Screen;
