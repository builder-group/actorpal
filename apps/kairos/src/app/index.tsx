import React from 'react';
import { Text, View } from 'react-native';
import { WheelPicker } from '@/components';

const Screen: React.FC = () => {
	const [value, setValue] = React.useState(3);
	const numberItems = React.useMemo(() => {
		return Array.from({ length: 60 }, (_, index) => {
			const value = index + 1;
			return { label: `${value}`, value };
		});
	}, []);

	return (
		<View className="bg-base-0 flex-1 items-center justify-center px-6">
			<Text className="text-base-900 text-4xl font-semibold tracking-tight">Home</Text>
			<Text className="text-base-500 mt-3 text-sm">Styled with NativeWind v5 + Tailwind v4.</Text>
			<WheelPicker
				items={numberItems}
				value={value}
				onChange={(nextValue) => {
					setValue(nextValue);
					console.log('changed', nextValue);
				}}
				className="mt-6 w-28"
			/>
		</View>
	);
};

export default Screen;
