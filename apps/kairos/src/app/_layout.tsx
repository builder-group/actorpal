import React from 'react';
import { AppTabs, ThemeProvider } from '@/components';
import { SettingsCxProvider } from '@/features/settings';
import { TimerCxProvider } from '@/features/timer';
import '../global.css';

const Layout: React.FC = () => {
	return (
		<SettingsCxProvider>
			<ThemeProvider>
				<TimerCxProvider>
					<AppTabs />
				</TimerCxProvider>
			</ThemeProvider>
		</SettingsCxProvider>
	);
};

export default Layout;
