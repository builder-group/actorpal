import React from 'react';

export function useMousePosition(): { x: number; y: number } | null {
	const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);

	React.useEffect(() => {
		function handleMouseMove(event: MouseEvent) {
			setPosition({ x: event.clientX, y: event.clientY });
		}

		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	}, []);

	return position;
}
