import { ArrowLeftIcon, LockIcon, UnlockIcon } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { specta } from '@/environment';

const Page: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const state = location.state as TLocationState;
	const showBackButton = state?.source === 'main';
	const [isExitBlocked, setIsExitBlocked] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);

	React.useEffect(() => {
		async function loadExitBlockState() {
			try {
				const blocked = await specta.commands.isExitBlocked();
				setIsExitBlocked(blocked);
			} catch (error) {
				console.error('Failed to load exit block state:', error);
			}
		}
		loadExitBlockState();
	}, []);

	async function handleToggleExitBlock(block: boolean) {
		setIsLoading(true);
		try {
			await specta.commands.setExitBlocked(block);
			setIsExitBlocked(block);
		} catch (error) {
			console.error('Failed to set exit block:', error);
		} finally {
			setIsLoading(false);
		}
	}

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
						<h2 className="mb-4 text-lg font-semibold text-gray-900">Application Settings</h2>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-start gap-3">
									{isExitBlocked ? (
										<LockIcon className="mt-0.5 h-5 w-5 text-green-600" />
									) : (
										<UnlockIcon className="mt-0.5 h-5 w-5 text-gray-400" />
									)}
									<div>
										<p className="font-medium text-gray-900">Prevent App from Closing</p>
										<p className="text-sm text-gray-500">
											When enabled, the app will prevent all exit attempts and keep running in the
											background
										</p>
									</div>
								</div>
								<button
									onClick={() => handleToggleExitBlock(!isExitBlocked)}
									disabled={isLoading}
									className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none ${
										isExitBlocked ? 'bg-green-600' : 'bg-gray-200'
									} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
									role="switch"
									aria-checked={isExitBlocked}
									aria-label="Toggle exit blocking"
								>
									<span
										className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
											isExitBlocked ? 'translate-x-5' : 'translate-x-0'
										}`}
									/>
								</button>
							</div>
						</div>
					</div>

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
