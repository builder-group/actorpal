import { ArrowLeftIcon } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { specta } from '@/environment';

const Page: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const state = location.state as TLocationState;
	const showBackButton = state?.source === 'main';
	const [databasePath, setDatabasePath] = React.useState<string>('');
	const [isLoading, setIsLoading] = React.useState(true);

	React.useEffect(() => {
		async function loadDatabasePath() {
			setIsLoading(true);
			try {
				const result = await specta.commands.getDatabasePath();
				if (result.status === 'ok') {
					setDatabasePath(result.data);
				}
			} catch (error) {
				console.error('Failed to load database path:', error);
			} finally {
				setIsLoading(false);
			}
		}
		loadDatabasePath();
	}, []);

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
					<p className="text-gray-600">View application information</p>
				</header>

				<div className="space-y-6">
					<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
						<h2 className="mb-4 text-lg font-semibold text-gray-900">Storage</h2>
						<div className="space-y-4">
							<div>
								<p className="mb-2 text-sm font-medium text-gray-900">Database Location</p>
								<p className="mb-2 text-sm text-gray-500">Where activity tracking data is stored</p>
								{isLoading ? (
									<span className="inline-block rounded-md bg-gray-100 px-3 py-1 font-mono text-sm text-gray-500">
										Loading...
									</span>
								) : (
									<span className="inline-block rounded-md bg-gray-100 px-3 py-1 font-mono text-sm text-gray-700">
										{databasePath || 'Not available'}
									</span>
								)}
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
