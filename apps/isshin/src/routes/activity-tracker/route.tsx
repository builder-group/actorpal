import { listen } from '@tauri-apps/api/event';
import { confirm } from '@tauri-apps/plugin-dialog';
import { ArrowLeftIcon, ClockIcon, TrashIcon } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';
import { specta } from '@/environment';
import { formatDuration, formatDurationLong } from '@/lib';

const Page: React.FC = () => {
	const navigate = useNavigate();
	const [currentActivity, setCurrentActivity] = React.useState<TActivityUpdatePayload | null>(null);
	const [todayStats, setTodayStats] = React.useState<specta.DailyStats | null>(null);
	const [isClearing, setIsClearing] = React.useState(false);

	React.useEffect(() => {
		async function loadData() {
			const result = await specta.commands.getTodayStats();
			if (result.status === 'ok') {
				setTodayStats(result.data);
			} else {
				console.error('Failed to load today stats:', result.error);
			}
		}

		loadData();
		const interval = setInterval(loadData, 10000); // Refresh every 10 seconds

		return () => clearInterval(interval);
	}, []);

	React.useEffect(() => {
		const unlistenChanged = listen<TActivityUpdatePayload>('activity_changed', (event) => {
			setCurrentActivity(event.payload);
			// Reload stats when activity changes
			specta.commands.getTodayStats().then((result) => {
				if (result.status === 'ok') {
					setTodayStats(result.data);
				}
			});
		});

		const unlistenUpdated = listen<TActivityUpdatePayload>('activity_updated', (event) => {
			setCurrentActivity(event.payload);
		});

		return () => {
			unlistenChanged.then((fn) => fn());
			unlistenUpdated.then((fn) => fn());
		};
	}, []);

	async function handleClearData() {
		const confirmed = await confirm(
			'Are you sure you want to clear all tracking data? This action cannot be undone.',
			{
				title: 'Clear Tracking Data',
				kind: 'warning'
			}
		);

		if (!confirmed) {
			return;
		}

		setIsClearing(true);
		const result = await specta.commands.clearTrackingData();
		if (result.status === 'ok') {
			setCurrentActivity(null);
			const statsResult = await specta.commands.getTodayStats();
			if (statsResult.status === 'ok') {
				setTodayStats(statsResult.data);
			}
		} else {
			console.error('Failed to clear tracking data:', result.error);
		}
		setIsClearing(false);
	}

	return (
		<main className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-7xl">
				<header className="mb-8">
					<button
						onClick={() => navigate(-1)}
						className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
					>
						<ArrowLeftIcon className="h-5 w-5" />
						Back
					</button>
					<div className="flex items-center justify-between">
						<div>
							<h1 className="mb-2 text-3xl font-bold text-gray-900">Activity Tracker</h1>
							<p className="text-gray-600">Track your application usage like RescueTime</p>
						</div>
						<button
							onClick={handleClearData}
							disabled={isClearing}
							className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<TrashIcon className="h-4 w-4" />
							{isClearing ? 'Clearing...' : 'Clear Data'}
						</button>
					</div>
				</header>

				{/* Current Activity Card */}
				{currentActivity != null && (
					<div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm">
						<div className="flex items-start gap-4">
							<div className="rounded-full bg-blue-100 p-3">
								<ClockIcon className="h-6 w-6 text-blue-600" />
							</div>
							<div className="flex-1">
								<h3 className="mb-1 text-sm font-medium tracking-wide text-blue-900 uppercase">
									Currently Active
								</h3>
								<p className="text-2xl font-bold text-blue-900">{currentActivity.application}</p>
								{currentActivity.window_title != null && (
									<p className="mt-1 text-sm text-blue-700">{currentActivity.window_title}</p>
								)}
								<p className="mt-2 text-sm font-medium text-blue-600">
									Duration: {formatDuration(currentActivity.duration_seconds)}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Today's Stats */}
				{todayStats != null && (
					<>
						<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
							<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
								<h3 className="mb-4 text-sm font-medium tracking-wide text-gray-500 uppercase">
									Total Time Today
								</h3>
								<div>
									<p className="text-3xl font-bold text-gray-900">
										{formatDuration(todayStats.total_time_seconds)}
									</p>
									<p className="mt-1 text-sm text-gray-500">
										{formatDurationLong(todayStats.total_time_seconds)}
									</p>
								</div>
							</div>

							<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
								<h3 className="mb-4 text-sm font-medium tracking-wide text-gray-500 uppercase">
									Applications Tracked
								</h3>
								<div>
									<p className="text-3xl font-bold text-gray-900">{todayStats.activities.length}</p>
									<p className="mt-1 text-sm text-gray-500">Different applications used</p>
								</div>
							</div>
						</div>

						{/* Application Breakdown */}
						<div className="rounded-lg border border-gray-200 bg-white shadow-sm">
							<div className="border-b border-gray-200 px-6 py-4">
								<h2 className="text-xl font-semibold text-gray-900">Application Breakdown</h2>
								<p className="mt-1 text-sm text-gray-500">Time spent in each application today</p>
							</div>

							{todayStats.activities.length === 0 ? (
								<div className="px-6 py-12 text-center">
									<ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
									<p className="mt-4 text-lg font-medium text-gray-900">No activity tracked yet</p>
									<p className="mt-2 text-sm text-gray-500">
										Start using your computer and the tracker will automatically record your
										activity
									</p>
								</div>
							) : (
								<div className="divide-y divide-gray-200">
									{todayStats.activities.map((activity) => (
										<div key={activity.application} className="px-6 py-4">
											<div className="flex items-center justify-between">
												<div className="flex-1">
													<p className="text-sm font-medium text-gray-900">
														{activity.application}
													</p>
													<p className="mt-1 text-xs text-gray-500">
														{formatDurationLong(activity.total_duration_seconds)}
													</p>
												</div>
												<div className="ml-4 flex items-center gap-4">
													<div className="text-right">
														<p className="text-sm font-semibold text-gray-900">
															{formatDuration(activity.total_duration_seconds)}
														</p>
														<p className="text-xs text-gray-500">
															{activity.percentage.toFixed(1)}%
														</p>
													</div>
												</div>
											</div>
											{/* Progress bar */}
											<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
												<div
													className="h-full rounded-full bg-blue-600 transition-all"
													style={{ width: `${activity.percentage}%` }}
												/>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</>
				)}

				{todayStats == null && (
					<div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
						<ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
						<p className="mt-4 text-lg font-medium text-gray-900">Loading...</p>
					</div>
				)}
			</div>
		</main>
	);
};

export default Page;

interface TActivityUpdatePayload {
	application: string;
	window_title: string | null;
	duration_seconds: number;
}
