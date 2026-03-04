import { Stack } from 'expo-router';
import { useTheme } from '@/components';

export default function TimerLayout() {
	const { tokens } = useTheme();

	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					title: 'Timers',
					headerLargeTitle: true,
					headerTintColor: tokens.base900
				}}
			/>
		</Stack>
	);
}
