import React from 'react';
import { Link } from 'react-router';
import { specta } from '@/environment';

const Page: React.FC = () => {
	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-4xl">
				<h1 className="mb-8 text-3xl font-bold text-gray-900">Isshin</h1>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<Link
						to="/monitor"
						className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
					>
						<h2 className="mb-2 text-xl font-semibold text-gray-900">Process Monitor</h2>
						<p className="text-gray-600">View and manage running processes</p>
					</Link>
					<Link
						to="/block-sites"
						className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
					>
						<h2 className="mb-2 text-xl font-semibold text-gray-900">Block Websites</h2>
						<p className="text-gray-600">Block distracting websites like SelfControl</p>
					</Link>
					<Link
						to="/activity-tracker"
						className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
					>
						<h2 className="mb-2 text-xl font-semibold text-gray-900">Activity Tracker</h2>
						<p className="text-gray-600">Track your time like RescueTime</p>
					</Link>
					<Link
						to="/settings"
						state={{ source: 'main' }}
						className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
					>
						<h2 className="mb-2 text-xl font-semibold text-gray-900">Settings</h2>
						<p className="text-gray-600">Navigate to settings in this window</p>
					</Link>
					<button
						onClick={() => specta.commands.showSettingsWindow()}
						className="rounded-lg border border-gray-200 bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-md"
					>
						<h2 className="mb-2 text-xl font-semibold text-gray-900">Settings Window</h2>
						<p className="text-gray-600">Open settings in separate window</p>
					</button>
				</div>
			</div>
		</div>
	);
};

export default Page;
