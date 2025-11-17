import { RefreshCwIcon, TrashIcon } from 'lucide-react';
import React from 'react';
import { useRevalidator } from 'react-router';
import { Err, Ok } from 'tuple-result';
import { specta } from '@/environment';
import { formatDuration, resultLoader, toTuple, withResultLoader } from '@/lib';
import { SankeyDiagram } from './SankeyDiagram';

const Page = withResultLoader<TSuccessLoaderData, TErrorLoaderData>({
	Success: ({ data }) => {
		const { entries } = data;
		const revalidator = useRevalidator();

		const appStats = React.useMemo(() => {
			const stats = new Map<string, number>();
			for (const entry of entries) {
				const duration = entry.endTime - entry.startTime;
				stats.set(entry.application, (stats.get(entry.application) || 0) + duration);
			}
			return Array.from(stats.entries())
				.map(([app, total]) => ({ app, total }))
				.sort((a, b) => b.total - a.total);
		}, [entries]);

		const totalTime = React.useMemo(
			() => appStats.reduce((sum, stat) => sum + stat.total, 0),
			[appStats]
		);

		const handleClear = React.useCallback(async () => {
			const result = await specta.commands.clearActivityEntries();
			const [ok] = toTuple(result);
			if (ok) {
				revalidator.revalidate();
			}
		}, [revalidator]);

		if (!entries.length) {
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

						<SankeyDiagram entries={entries} />

						<div className="rounded-lg border border-gray-200 bg-white">
							<div className="border-b border-gray-200 px-6 py-4">
								<h2 className="text-xl font-semibold text-gray-900">Application Breakdown</h2>
							</div>
							<div className="divide-y divide-gray-200">
								{appStats.map((stat) => {
									const percentage = totalTime > 0 ? (stat.total / totalTime) * 100 : 0;
									return (
										<div key={stat.app} className="px-6 py-4">
											<div className="flex items-center justify-between">
												<div className="flex-1">
													<p className="text-sm font-medium text-gray-900">{stat.app}</p>
													<p className="mt-1 text-xs text-gray-500">{formatDuration(stat.total)}</p>
												</div>
												<div className="ml-4 text-right">
													<p className="text-sm font-semibold text-gray-900">
														{percentage.toFixed(1)}%
													</p>
												</div>
											</div>
											<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
												<div
													className="h-full rounded-full bg-blue-600 transition-all"
													style={{ width: `${percentage}%` }}
												/>
											</div>
										</div>
									);
								})}
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
	const [isActivityEntriesOk, isActivityEntriesError, activityEntries] = toTuple(
		await specta.commands.getActivityEntries()
	);
	if (!isActivityEntriesOk) {
		return Err(`Failed to load activity entries: ${isActivityEntriesError}`);
	}

	return Ok({ entries: activityEntries });
});

type TSuccessLoaderData = { entries: specta.ActivityEntry[] };

type TErrorLoaderData = string;
