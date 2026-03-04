import { Stack } from 'expo-router';
import { useTheme } from '@/components';

export default function SettingsLayout() {
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
}
