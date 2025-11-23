import {
	ArrowLeftIcon,
	BanIcon,
	ClockIcon,
	FolderOpenIcon,
	HardDriveIcon,
	MonitorIcon,
	PlusIcon,
	SaveIcon,
	XIcon
} from 'lucide-react';
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
		const showBackButton = React.useMemo(() => location.state?.source === 'main', [location.state]);

		const [localSettings, setLocalSettings] = React.useState<specta.AppSettings>(settings);
		const [newSite, setNewSite] = React.useState('');
		const [newApp, setNewApp] = React.useState('');
		const [isDirty, setIsDirty] = React.useState(false);
		const [activeApp, setActiveApp] = React.useState<specta.AppInfo | null>(null);
		const [activeWindow, setActiveWindow] = React.useState<specta.WindowInfo | null>(null);

		const currentUrl = React.useMemo(() => {
			if (activeWindow?.browser?.url == null) return null;
			try {
				const url = new URL(activeWindow.browser.url);
				return url.hostname;
			} catch {
				return null;
			}
		}, [activeWindow?.browser?.url]);
		const currentBundleId = React.useMemo(() => {
			return activeApp?.bundleId ?? null;
		}, [activeApp?.bundleId]);
		const currentAppName = React.useMemo(() => {
			return activeApp?.name ?? null;
		}, [activeApp?.name]);

		// =============================================================================
		// Events
		// =============================================================================

		const handleToggleTrackWindow = React.useCallback(() => {
			setLocalSettings((prev) => ({
				...prev,
				tracking: { ...prev.tracking, trackWindow: !prev.tracking.trackWindow }
			}));
			setIsDirty(true);
		}, []);

		const handleToggleTrackBrowser = React.useCallback(() => {
			setLocalSettings((prev) => ({
				...prev,
				tracking: { ...prev.tracking, trackBrowser: !prev.tracking.trackBrowser }
			}));
			setIsDirty(true);
		}, []);

		const handleOpenDatabaseDirectory = React.useCallback(async () => {
			await specta.commands.openDatabaseDirectory();
		}, []);

		const handlePomodoroChange = React.useCallback(
			(
				key: keyof specta.PomodoroSettings,
				value: specta.PomodoroSettings[keyof specta.PomodoroSettings]
			) => {
				setLocalSettings((prev) => ({
					...prev,
					pomodoro: { ...prev.pomodoro, [key]: value }
				}));
				setIsDirty(true);
			},
			[]
		);

		const handleAddSite = React.useCallback(() => {
			if (newSite && !localSettings.pomodoro.blockedSites.includes(newSite)) {
				setLocalSettings((prev) => ({
					...prev,
					pomodoro: {
						...prev.pomodoro,
						blockedSites: [...prev.pomodoro.blockedSites, newSite]
					}
				}));
				setNewSite('');
				setIsDirty(true);
			}
		}, [newSite, localSettings.pomodoro.blockedSites]);

		const handleRemoveSite = React.useCallback((site: string) => {
			setLocalSettings((prev) => ({
				...prev,
				pomodoro: {
					...prev.pomodoro,
					blockedSites: prev.pomodoro.blockedSites.filter((s) => s !== site)
				}
			}));
			setIsDirty(true);
		}, []);

		const handleAddApp = React.useCallback(() => {
			if (newApp.trim() && !localSettings.pomodoro.blockedApps.includes(newApp.trim())) {
				setLocalSettings((prev) => ({
					...prev,
					pomodoro: {
						...prev.pomodoro,
						blockedApps: [...prev.pomodoro.blockedApps, newApp.trim()]
					}
				}));
				setNewApp('');
				setIsDirty(true);
			}
		}, [newApp, localSettings.pomodoro.blockedApps]);

		const handleRemoveApp = React.useCallback((app: string) => {
			setLocalSettings((prev) => ({
				...prev,
				pomodoro: {
					...prev.pomodoro,
					blockedApps: prev.pomodoro.blockedApps.filter((a) => a !== app)
				}
			}));
			setIsDirty(true);
		}, []);

		const handleSaveSettings = React.useCallback(async () => {
			const [isOk] = toTuple(await specta.commands.setSettings(localSettings));
			if (isOk) {
				setIsDirty(false);
				revalidator.revalidate();
			}
		}, [localSettings, revalidator]);

		const isIsshinApp = React.useCallback((app: specta.AppInfo | null) => {
			if (app == null) return false;
			const bundleIdMatch = app.bundleId?.toLowerCase().includes('isshin') ?? false;
			const nameMatch = app.name?.toLowerCase().includes('isshin') ?? false;
			return bundleIdMatch || nameMatch;
		}, []);

		// =============================================================================
		// Effects
		// =============================================================================

		// Sync local settings when loaded settings change (e.g. after save/revalidation)
		React.useEffect(() => {
			setLocalSettings(settings);
			setIsDirty(false);
		}, [settings]);

		// Track active app/window (skip if Isshin)
		React.useEffect(() => {
			let unlistenApp: (() => void) | null = null;
			let unlistenWindow: (() => void) | null = null;

			(async () => {
				const [appOk, , currentApp] = toTuple(await specta.commands.getCurrentActiveApp());
				const [windowOk, , currentWindow] = toTuple(await specta.commands.getCurrentActiveWindow());

				if (appOk && currentApp != null) {
					if (!isIsshinApp(currentApp)) {
						setActiveApp(currentApp);
					}
				}
				if (windowOk && currentWindow != null) {
					if (!isIsshinApp(currentWindow.app)) {
						setActiveWindow(currentWindow);
					}
				}

				unlistenApp = await specta.events.activeAppChangedEvent.listen((event) => {
					if (!isIsshinApp(event.payload.data)) {
						setActiveApp(event.payload.data);
					}
				});

				unlistenWindow = await specta.events.activeWindowChangedEvent.listen((event) => {
					if (!isIsshinApp(event.payload.data.app)) {
						setActiveWindow(event.payload.data);
					}
				});
			})();

			return () => {
				if (unlistenApp != null) {
					unlistenApp();
				}
				if (unlistenWindow != null) {
					unlistenWindow();
				}
			};
		}, [isIsshinApp]);

		// =============================================================================
		// UI
		// =============================================================================

		return (
			<main className="min-h-screen bg-gray-50 pb-20">
				{/* Header */}
				<header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-8 py-6 shadow-sm">
					<div className="mx-auto max-w-4xl">
						{showBackButton && (
							<button
								type="button"
								onClick={() => navigate(-1)}
								className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
							>
								<ArrowLeftIcon className="h-4 w-4" />
								Back
							</button>
						)}
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
								<p className="mt-1 text-gray-500">Configure Isshin preferences</p>
							</div>
							{isDirty && (
								<button
									onClick={handleSaveSettings}
									className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
								>
									<SaveIcon className="h-4 w-4" />
									Save Changes
								</button>
							)}
						</div>
					</div>
				</header>

				<div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
					{/* Section: Focus Timer */}
					<section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
						<div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
									<ClockIcon className="h-5 w-5" />
								</div>
								<div>
									<h2 className="text-lg font-semibold text-gray-900">Focus Timer</h2>
									<p className="text-sm text-gray-500">Customize your Pomodoro sessions</p>
								</div>
							</div>
						</div>

						<div className="p-6">
							<div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700">
										Focus Duration (min)
									</label>
									<input
										type="number"
										min="1"
										value={localSettings.pomodoro.focusDuration}
										onChange={(e) =>
											handlePomodoroChange('focusDuration', parseInt(e.target.value) || 0)
										}
										className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
									/>
								</div>
								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700">
										Short Break (min)
									</label>
									<input
										type="number"
										min="1"
										value={localSettings.pomodoro.shortBreakDuration}
										onChange={(e) =>
											handlePomodoroChange('shortBreakDuration', parseInt(e.target.value) || 0)
										}
										className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
									/>
								</div>
								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700">
										Long Break (min)
									</label>
									<input
										type="number"
										min="1"
										value={localSettings.pomodoro.longBreakDuration}
										onChange={(e) =>
											handlePomodoroChange('longBreakDuration', parseInt(e.target.value) || 0)
										}
										className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
									/>
								</div>
							</div>
							<div className="mt-6">
								<label className="mb-2 block text-sm font-medium text-gray-700">
									Rounds per Session
								</label>
								<div className="flex items-center gap-4">
									<input
										type="range"
										min="1"
										max="12"
										value={localSettings.pomodoro.rounds}
										onChange={(e) => handlePomodoroChange('rounds', parseInt(e.target.value) || 1)}
										className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
									/>
									<span className="w-12 text-center text-lg font-semibold text-gray-900">
										{localSettings.pomodoro.rounds}
									</span>
								</div>
							</div>
						</div>
					</section>

					{/* Section: Blocked Sites */}
					<section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
						<div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-red-100 p-2 text-red-600">
									<BanIcon className="h-5 w-5" />
								</div>
								<div className="flex-1">
									<h2 className="text-lg font-semibold text-gray-900">Blocked Sites</h2>
									<p className="text-sm text-gray-500">
										Websites to restrict during focus sessions
									</p>
									{currentUrl != null && (
										<div className="mt-1 flex items-center gap-2">
											<p className="font-mono text-xs text-indigo-600">Current: {currentUrl}</p>
											{!localSettings.pomodoro.blockedSites.includes(currentUrl) && (
												<button
													onClick={() => {
														setLocalSettings((prev) => ({
															...prev,
															pomodoro: {
																...prev.pomodoro,
																blockedSites: [...prev.pomodoro.blockedSites, currentUrl]
															}
														}));
														setIsDirty(true);
													}}
													className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
												>
													Add
												</button>
											)}
										</div>
									)}
								</div>
							</div>
						</div>

						<div className="p-6">
							<div className="mb-6 flex gap-2">
								<input
									type="text"
									placeholder="e.g. facebook.com"
									value={newSite}
									onChange={(e) => setNewSite(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
									className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
								/>
								<button
									onClick={handleAddSite}
									className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
								>
									<PlusIcon className="h-4 w-4" />
									Add
								</button>
							</div>

							<div className="flex flex-wrap gap-2">
								{localSettings.pomodoro.blockedSites.map((site) => (
									<div
										key={site}
										className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200"
									>
										<span>{site}</span>
										<button
											onClick={() => handleRemoveSite(site)}
											className="ml-1 rounded-full p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-600"
										>
											<XIcon className="h-3 w-3" />
										</button>
									</div>
								))}
								{localSettings.pomodoro.blockedSites.length === 0 && (
									<p className="text-sm text-gray-500 italic">No sites blocked</p>
								)}
							</div>
						</div>
					</section>

					{/* Section: Blocked Apps */}
					<section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
						<div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-red-100 p-2 text-red-600">
									<BanIcon className="h-5 w-5" />
								</div>
								<div className="flex-1">
									<h2 className="text-lg font-semibold text-gray-900">Blocked Apps</h2>
									<p className="text-sm text-gray-500">
										Applications to block during focus sessions (by bundle ID)
									</p>
									{currentBundleId != null && (
										<div className="mt-1 flex items-center gap-2">
											<p className="font-mono text-xs text-indigo-600">
												Current: {currentBundleId}
												{currentAppName != null && ` (${currentAppName})`}
											</p>
											{!localSettings.pomodoro.blockedApps.includes(currentBundleId) && (
												<button
													onClick={() => {
														setLocalSettings((prev) => ({
															...prev,
															pomodoro: {
																...prev.pomodoro,
																blockedApps: [...prev.pomodoro.blockedApps, currentBundleId]
															}
														}));
														setIsDirty(true);
													}}
													className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
												>
													Add
												</button>
											)}
										</div>
									)}
								</div>
							</div>
						</div>

						<div className="p-6">
							<div className="mb-6 flex gap-2">
								<input
									type="text"
									placeholder="e.g. com.google.Chrome"
									value={newApp}
									onChange={(e) => setNewApp(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && handleAddApp()}
									className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
								/>
								<button
									onClick={handleAddApp}
									className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
								>
									<PlusIcon className="h-4 w-4" />
									Add
								</button>
							</div>

							<div className="flex flex-wrap gap-2">
								{localSettings.pomodoro.blockedApps.map((app) => (
									<div
										key={app}
										className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200"
									>
										<span>{app}</span>
										<button
											onClick={() => handleRemoveApp(app)}
											className="ml-1 rounded-full p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-600"
										>
											<XIcon className="h-3 w-3" />
										</button>
									</div>
								))}
								{localSettings.pomodoro.blockedApps.length === 0 && (
									<p className="text-sm text-gray-500 italic">No apps blocked</p>
								)}
							</div>
						</div>
					</section>

					{/* Section: Tracking & Storage */}
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
						{/* Tracking */}
						<section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
							<div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
								<div className="flex items-center gap-3">
									<div className="rounded-lg bg-blue-100 p-2 text-blue-600">
										<MonitorIcon className="h-5 w-5" />
									</div>
									<div>
										<h2 className="text-lg font-semibold text-gray-900">Activity Tracking</h2>
									</div>
								</div>
							</div>
							<div className="divide-y divide-gray-100 p-0">
								<div className="flex items-center justify-between px-6 py-4">
									<div>
										<label className="text-sm font-medium text-gray-900">
											Track Window Changes
										</label>
										<p className="text-xs text-gray-500">Monitor app and window switching</p>
									</div>
									<button
										onClick={handleToggleTrackWindow}
										className={`relative h-6 w-11 rounded-full transition-colors ${
											localSettings.tracking.trackWindow ? 'bg-blue-600' : 'bg-gray-300'
										}`}
									>
										<span
											className={`absolute top-0.5 left-0.5 h-5 w-5 transform rounded-full bg-white shadow transition-transform ${localSettings.tracking.trackWindow ? 'translate-x-5' : 'translate-x-0'}`}
										/>
									</button>
								</div>
								<div className="flex items-center justify-between px-6 py-4">
									<div>
										<label className="text-sm font-medium text-gray-900">Track Browser URLs</label>
										<p className="text-xs text-gray-500">Monitor visited websites (macOS)</p>
									</div>
									<button
										onClick={handleToggleTrackBrowser}
										className={`relative h-6 w-11 rounded-full transition-colors ${
											localSettings.tracking.trackBrowser ? 'bg-blue-600' : 'bg-gray-300'
										}`}
									>
										<span
											className={`absolute top-0.5 left-0.5 h-5 w-5 transform rounded-full bg-white shadow transition-transform ${localSettings.tracking.trackBrowser ? 'translate-x-5' : 'translate-x-0'}`}
										/>
									</button>
								</div>
							</div>
						</section>

						{/* Storage */}
						<section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
							<div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
								<div className="flex items-center gap-3">
									<div className="rounded-lg bg-amber-100 p-2 text-amber-600">
										<HardDriveIcon className="h-5 w-5" />
									</div>
									<div>
										<h2 className="text-lg font-semibold text-gray-900">Data Storage</h2>
									</div>
								</div>
							</div>
							<div className="p-6">
								<label className="mb-2 block text-sm font-medium text-gray-700">
									Database Location
								</label>
								<div className="group relative flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
									<code
										className="block flex-1 truncate font-mono text-xs text-gray-600"
										title={databasePath}
									>
										{databasePath || 'Not available'}
									</code>
									<button
										onClick={handleOpenDatabaseDirectory}
										className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 hover:shadow-sm"
										title="Open in Finder"
									>
										<FolderOpenIcon className="h-4 w-4" />
									</button>
								</div>
								<p className="mt-2 text-xs text-gray-500">
									All your activity data is stored locally on your device.
								</p>
							</div>
						</section>
					</div>
				</div>
			</main>
		);
	},
	Error: ({ error }) => (
		<main className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-2xl">
				<div className="rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center shadow-sm">
					<p className="font-medium text-red-900">Failed to load settings</p>
					<p className="mt-1 text-sm text-red-700">{String(error)}</p>
				</div>
			</div>
		</main>
	)
});

export default Page;

export const clientLoader = resultLoader<TSuccessLoaderData, TErrorLoaderData>(async () => {
	const [[isDbPathOk, isDbPathError, dbPath], [areSettingsOk, areSettingsError, settings]] =
		await Promise.all([
			toTuple(await specta.commands.getDatabasePath()),
			toTuple(await specta.commands.getSettings())
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
	settings: specta.AppSettings;
}

type TErrorLoaderData = string;
