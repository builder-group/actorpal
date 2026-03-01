import React from 'react';
import { Text, View } from 'react-native';

const Screen: React.FC = () => {
	return (
		<View className="bg-base-0 flex-1 items-center justify-center px-6">
			<Text className="text-base-900 text-4xl font-semibold tracking-tight">Home</Text>
			<Text className="text-base-500 mt-3 text-sm">Styled with NativeWind v5 + Tailwind v4.</Text>
		</View>
	);
};

export default Screen;
