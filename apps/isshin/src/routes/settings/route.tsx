import { ArrowLeftIcon, FolderOpenIcon } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate, useRevalidator } from 'react-router';
import { Err, Ok } from 'tuple-result';
import { specta } from '@/environment';
import { resultLoader, toTuple, withResultLoader } from '@/lib';

const Page = withResultLoader<TSuccessLoaderData, TErrorLoaderData>({
	Success: ({ data }) => {
		const { databasePath, settings } = data;
		const navigate = useNavigate();
		const location = useLocation();
		const revalidator = useRevalidator();
		const state = location.state as TLocationState;
		const showBackButton = state?.source === 'main';
		const isLoading = revalidator.state === 'loading';

		const handleToggleTrackWindow = React.useCallback(async () => {
			const newValue = !settings.trackWindow;
			const result = await specta.commands.updateTrackWindow(newValue);
			const [ok] = toTuple(result);
			if (ok) {
				revalidator.revalidate();
			}
		}, [settings.trackWindow, revalidator]);

		const handleToggleTrackBrowser = React.useCallback(async () => {
			const newValue = !settings.trackBrowser;
			const result = await specta.commands.updateTrackBrowser(newValue);
			const [ok] = toTuple(result);
			if (ok) {
				revalidator.revalidate();
			}
		}, [settings.trackBrowser, revalidator]);

		const handleOpenDatabaseDirectory = React.useCallback(async () => {
			await specta.commands.openDatabaseDirectory();
		}, []);

		return (
			<main className="min-h-screen bg-gray-50 p-8">
				<div className="mx-auto max-w-2xl">
					{showBackButton && (
						<button
							type="button"
							onClick={() => navigate(-1)}
							className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
						>
							<ArrowLeftIcon className="h-4 w-4" />
							Back
						</button>
					)}
					<h1 className="mb-2 text-3xl font-bold text-gray-900">Settings</h1>
					<p className="mb-8 text-gray-600">Configure activity tracking preferences</p>

					<div className="space-y-4">
						<div className="rounded-lg border border-gray-200 bg-white">
							<div className="border-b border-gray-200 px-6 py-4">
								<h2 className="text-lg font-semibold">Activity Tracking</h2>
							</div>
							<div className="divide-y divide-gray-200">
								<div className="px-6 py-4">
									<div className="flex items-center justify-between">
										<div>
											<label htmlFor="track-window" className="text-sm font-medium">
												Track Window Changes
											</label>
											<p className="mt-1 text-sm text-gray-500">
												Monitor tab switches and window switches within applications
											</p>
										</div>
										<button
											type="button"
											id="track-window"
											onClick={handleToggleTrackWindow}
											disabled={isLoading}
											className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
												settings.trackWindow ? 'bg-blue-600' : 'bg-gray-300'
											}`}
											role="switch"
											aria-checked={settings.trackWindow}
										>
											<span
												className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
													settings.trackWindow ? 'left-[22px]' : 'left-0.5'
												}`}
											/>
										</button>
									</div>
								</div>
								<div className="px-6 py-4">
									<div className="flex items-center justify-between">
										<div>
											<label htmlFor="track-browser" className="text-sm font-medium">
												Track Browser URLs
											</label>
											<p className="mt-1 text-sm text-gray-500">
												Monitor browser URLs and tabs (requires Automation permission on macOS)
											</p>
										</div>
										<button
											type="button"
											id="track-browser"
											onClick={handleToggleTrackBrowser}
											disabled={isLoading}
											className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
												settings.trackBrowser ? 'bg-blue-600' : 'bg-gray-300'
											}`}
											role="switch"
											aria-checked={settings.trackBrowser}
										>
											<span
												className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
													settings.trackBrowser ? 'left-[22px]' : 'left-0.5'
												}`}
											/>
										</button>
									</div>
								</div>
							</div>
						</div>

						<div className="rounded-lg border border-gray-200 bg-white">
							<div className="border-b border-gray-200 px-6 py-4">
								<h2 className="text-lg font-semibold">Storage</h2>
							</div>
							<div className="px-6 py-4">
								<label className="mb-2 block text-sm font-medium">Database Location</label>
								<div className="group relative rounded border border-gray-200 bg-gray-50 px-4 py-3">
									<code className="block font-mono text-xs break-all text-gray-700">
										{databasePath || 'Not available'}
									</code>
									<button
										type="button"
										onClick={handleOpenDatabaseDirectory}
										className="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-white px-2 py-1.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-gray-50"
										title="Open in Finder"
									>
										<FolderOpenIcon className="h-4 w-4 text-gray-600" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>
		);
	},
	Error: ({ error }) => (
		<main className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-2xl">
				<div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
					<p className="text-gray-600">Failed to load settings: {String(error)}</p>
				</div>
			</div>
		</main>
	)
});

export default Page;

interface TLocationState {
	source?: 'main' | 'tray';
}

export const clientLoader = resultLoader<TSuccessLoaderData, TErrorLoaderData>(async () => {
	const [[isDbPathOk, isDbPathError, dbPath], [areSettingsOk, areSettingsError, settings]] =
		await Promise.all([
			toTuple(await specta.commands.getDatabasePath()),
			toTuple(await specta.commands.getActivityWindowSettings())
		]);
	if (!isDbPathOk || !areSettingsOk) {
		return Err(`Failed to load settings: ${areSettingsError || isDbPathError}`);
	}

	return Ok({
		databasePath: dbPath,
		settings
	});
});

interface TSuccessLoaderData {
	databasePath: string;
	settings: {
		trackWindow: boolean;
		trackBrowser: boolean;
	};
}

type TErrorLoaderData = string;
