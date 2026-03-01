import React from 'react';
import { AppTabs, ThemeProvider } from '@/components';
import '../global.css';

const Layout: React.FC = () => {
	return (
		<ThemeProvider>
			<AppTabs />
		</ThemeProvider>
	);
};

export default Layout;
