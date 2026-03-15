import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import styles from '../styles.css?url';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8'
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1'
			},
			{
				title: 'Midimarble'
			}
		],
		links: [
			{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
			{
				rel: 'preconnect',
				href: 'https://fonts.gstatic.com',
				crossOrigin: 'anonymous'
			},
			{ rel: 'preconnect', href: 'https://api.fontshare.com' },
			// https://fonts.google.com/specimen/Inter
			// https://fonts.google.com/specimen/Caveat
			{
				rel: 'stylesheet',
				href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Caveat:wght@400..700&display=swap'
			},
			// https://www.fontshare.com/fonts/erode
			{
				rel: 'stylesheet',
				href: 'https://api.fontshare.com/v2/css?f[]=erode@1,2&display=swap'
			},
			{
				rel: 'stylesheet',
				href: styles
			}
		],
		scripts: [
			// Apply theme before paint to prevent flash
			{
				children: `(function(){var mode='auto';try{var s=localStorage.getItem('focuscat-app-settings');if(s){var t=JSON.parse(s)?.appearance?.theme;if(t==='light'||t==='dark'||t==='auto')mode=t;}}catch(e){}var dark=mode==='dark'||(mode==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var root=document.documentElement;root.classList.toggle('dark',dark);root.style.colorScheme=dark?'dark':'light';})();`
			}
		]
	}),
	shellComponent: RootDocument
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="bg-base-0 text-base-950 font-sans">
				{children}
				<TanStackDevtools
					config={{
						position: 'bottom-right'
					}}
					plugins={[
						{
							name: 'Tanstack Router',
							render: <TanStackRouterDevtoolsPanel />
						}
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
