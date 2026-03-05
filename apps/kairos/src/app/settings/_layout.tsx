import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/components';

const Layout: React.FC = () => {
	const { tokens } = useTheme();

	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					title: 'Settings',
					headerLargeTitle: true,
					headerTintColor: tokens.base900
				}}
			/>
		</Stack>
	);
};

export default Layout;
