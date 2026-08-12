import { Stack } from 'expo-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { useTheme } from '@/components';
import { formatDurationRange, useTimerCx } from '@/features/timer';

const Layout: React.FC = () => {
	const { tokens } = useTheme();
	const cx = useTimerCx();

	const { title, headerLargeTitle } = useCompute(
		[cx.$status, cx.$config],
		([status, config]) => {
			// Keep large title only while idle. Switching to inline title when active causes a small native jump,
			// but this is the most reliable cross-version behavior without brittle scroll/header animation hacks
			if (status === 'idle') {
				return { title: 'Timers', headerLargeTitle: true };
			}

			return {
				title: config != null ? formatDurationRange(config.min, config.max) : 'Timer',
				headerLargeTitle: false
			};
		},
		[],
		(a, b) => a.title === b.title && a.headerLargeTitle === b.headerLargeTitle
	);

	// MARK: - UI

	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					title,
					headerLargeTitle,
					headerTransparent: true,
					headerTintColor: tokens.base900
				}}
			/>
		</Stack>
	);
};

export default Layout;
