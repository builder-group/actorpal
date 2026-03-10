import React from 'react';
import { ThreeViewportApp } from '../ThreeViewportApp';

export const ThreeViewport: React.FC = () => {
	const mountRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		const mount = mountRef.current;
		if (mount == null) return;

		const app = new ThreeViewportApp(mount);
		return () => app.dispose();
	}, []);

	return <div ref={mountRef} className="h-full w-full" />;
};
