import React from 'react';
import { PongCanvas } from '@/features/pong';

const Page: React.FC = () => {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gray-900">
			<div className="mb-4 text-center text-white">
				<h1 className="mb-2 text-4xl font-bold">Pong</h1>
				<p className="text-gray-400">W/S for left paddle, ↑/↓ for right paddle</p>
			</div>
			<PongCanvas />
		</div>
	);
};

export default Page;
