import { RefreshCwIcon, TrashIcon } from 'lucide-react';
import React from 'react';
import { useRevalidator } from 'react-router';
import { Ok } from 'tuple-result';
import { specta } from '@/environment';
import { formatDuration, resultLoader, toTuple, withResultLoader } from '@/lib';
import { ActivityTimeline } from './ActivityTimeline';
import { CurrentActiveWindow } from './CurrentActiveWindow';

const Page = withResultLoader<TSuccessLoaderData, TErrorLoaderData>({
	Success: ({ data }) => {
		const { windowActivities, appActivities, currentWindow, currentApp } = data;
		const revalidator = useRevalidator();

		const totalTime = React.useMemo(() => {
			const windowTime = windowActivities.reduce(
				(sum, activity) => sum + (activity.endTime - activity.startTime),
				0
			);
			const appTime = appActivities.reduce(
				(sum, activity) => sum + (activity.endTime - activity.startTime),
				0
			);
			return windowTime + appTime;
		}, [windowActivities, appActivities]);

		const handleClear = React.useCallback(async () => {
			const [windowOk] = toTuple(await specta.commands.clearWindowActivities());
			const [appOk] = toTuple(await specta.commands.clearAppActivities());
			if (windowOk && appOk) {
				revalidator.revalidate();
			}
		}, [revalidator]);

		if (!windowActivities.length && !appActivities.length) {
			return (
				<div className="min-h-screen bg-gray-50 p-8">
					<div className="mx-auto max-w-4xl">
						<header className="mb-8">
							<h1 className="mb-2 text-3xl font-bold text-gray-900">Activity Tracker</h1>
							<p className="text-gray-600">Visualize your application usage</p>
						</header>
						<div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
							<p className="text-lg font-medium text-gray-900">No activity tracked yet</p>
							<p className="mt-2 text-sm text-gray-500">
								Start using your computer and the tracker will automatically record your activity
							</p>
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className="min-h-screen bg-gray-50 p-8">
				<div className="mx-auto max-w-4xl">
					<header className="mb-8 flex items-center justify-between">
						<div>
							<h1 className="mb-2 text-3xl font-bold text-gray-900">Activity Tracker</h1>
							<p className="text-gray-600">Visualize your application usage</p>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={() => revalidator.revalidate()}
								disabled={revalidator.state === 'loading'}
								className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<RefreshCwIcon
									className={`h-4 w-4 ${revalidator.state === 'loading' ? 'animate-spin' : ''}`}
								/>
								Refresh
							</button>
							<button
								onClick={handleClear}
								disabled={revalidator.state === 'loading'}
								className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<TrashIcon className="h-4 w-4" />
								{revalidator.state === 'loading' ? 'Clearing...' : 'Clear Data'}
							</button>
						</div>
					</header>

					<div className="space-y-6">
						<div className="rounded-lg border border-gray-200 bg-white p-6">
							<h2 className="mb-4 text-lg font-semibold">Total Time</h2>
							<p className="text-3xl font-bold">{formatDuration(totalTime)}</p>
						</div>

						<CurrentActiveWindow initialWindow={currentWindow} initialApp={currentApp} />

						<ActivityTimeline
							windowActivities={windowActivities}
							appActivities={appActivities}
							width={1000}
						/>

						<div className="rounded-lg border border-gray-200 bg-white">
							<div className="border-b border-gray-200 px-6 py-4">
								<h2 className="text-xl font-semibold text-gray-900">Activity Summary</h2>
							</div>
							<div className="divide-y divide-gray-200 px-6 py-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<p className="text-sm font-medium text-gray-500">Window Activities</p>
										<p className="mt-1 text-2xl font-bold text-gray-900">
											{windowActivities.length}
										</p>
									</div>
									<div>
										<p className="text-sm font-medium text-gray-500">App Activities</p>
										<p className="mt-1 text-2xl font-bold text-gray-900">{appActivities.length}</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
	Error: ({ error }) => (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-4xl">
				<header className="mb-8">
					<h1 className="mb-2 text-3xl font-bold text-gray-900">Activity Tracker</h1>
					<p className="text-gray-600">Visualize your application usage</p>
				</header>
				<div className="rounded-lg border border-red-200 bg-red-50 px-6 py-12 text-center shadow-sm">
					<p className="text-lg font-medium text-red-900">Failed to load activity data</p>
					<p className="mt-2 text-sm text-red-700">{String(error)}</p>
				</div>
			</div>
		</div>
	)
});

export default Page;

export const clientLoader = resultLoader<TSuccessLoaderData, TErrorLoaderData>(async () => {
	const [
		[isWindowActivitiesOk, , windowActivities],
		[isAppActivitiesOk, , appActivities],
		[isCurrentWindowOk, , currentWindow],
		[isCurrentAppOk, , currentApp]
	] = await Promise.all([
		toTuple(await specta.commands.getWindowActivities()),
		toTuple(await specta.commands.getAppActivities()),
		toTuple(await specta.commands.getCurrentActiveWindow()),
		toTuple(await specta.commands.getCurrentActiveApp())
	]);

	return Ok({
		windowActivities: isWindowActivitiesOk ? windowActivities : [],
		appActivities: isAppActivitiesOk ? appActivities : [],
		currentWindow: isCurrentWindowOk ? currentWindow : null,
		currentApp: isCurrentAppOk ? currentApp : null
	});
});

type TSuccessLoaderData = {
	windowActivities: specta.WindowActivity[];
	appActivities: specta.AppActivity[];
	currentWindow: specta.WindowInfo | null;
	currentApp: specta.AppInfo | null;
};

type TErrorLoaderData = string;
