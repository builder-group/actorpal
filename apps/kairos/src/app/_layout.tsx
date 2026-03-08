import React from 'react';
import { AppTabs, ThemeProvider } from '@/components';
import { AudioCxProvider } from '@/features/audio';
import { SettingsCxProvider } from '@/features/settings';
import { TimerCxProvider } from '@/features/timer';
import '../global.css';

const Layout: React.FC = () => {
	return (
		<SettingsCxProvider>
			<ThemeProvider>
				<AudioCxProvider>
					<TimerCxProvider>
						<AppTabs />
					</TimerCxProvider>
				</AudioCxProvider>
			</ThemeProvider>
		</SettingsCxProvider>
	);
};

export default Layout;
