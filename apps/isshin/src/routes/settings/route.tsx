import { ArrowLeftIcon } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router';

const Page: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const state = location.state as TLocationState;
	const showBackButton = state?.source === 'main';

	return (
		<main className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-2xl">
				<header className="mb-8">
					{showBackButton && (
						<button
							onClick={() => navigate(-1)}
							className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
						>
							<ArrowLeftIcon className="h-5 w-5" />
							Back
						</button>
					)}
					<h1 className="mb-2 text-3xl font-bold text-gray-900">Settings</h1>
					<p className="text-gray-600">Configure your activity tracking preferences</p>
				</header>

				<div className="space-y-6">
					<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
						<h2 className="mb-4 text-lg font-semibold text-gray-900">Tracking Settings</h2>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium text-gray-900">Tracking Interval</p>
									<p className="text-sm text-gray-500">How often to check active window</p>
								</div>
								<span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
									5 seconds
								</span>
							</div>
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium text-gray-900">Storage Location</p>
									<p className="text-sm text-gray-500">Where tracking data is saved</p>
								</div>
								<span className="rounded-md bg-gray-100 px-3 py-1 font-mono text-sm text-gray-700">
									~/.isshin/
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
};

export default Page;

interface TLocationState {
	source?: 'main' | 'tray';
}
