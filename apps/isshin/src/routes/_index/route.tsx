import { TrashIcon } from 'lucide-react';
import React from 'react';
import { specta } from '@/environment';
import { formatDuration } from '@/lib';

const Page: React.FC = () => {
	const [entries, setEntries] = React.useState<specta.ActivityEntry[]>([]);
	const [isLoading, setIsLoading] = React.useState(true);
	const [isClearing, setIsClearing] = React.useState(false);

	const loadEntries = React.useCallback(async () => {
		setIsLoading(true);
		const result = await specta.commands.getActivityEntries();
		if (result.status === 'ok') {
			setEntries(result.data);
		}
		setIsLoading(false);
	}, []);

	React.useEffect(() => {
		loadEntries();
	}, [loadEntries]);

	async function handleClear() {
		setIsClearing(true);
		// Command will be available after build
		const commands = specta.commands as unknown as Record<
			string,
			() => Promise<{ status: string }>
		>;
		const result = await commands['clearActivityEntries']?.();
		if (result?.status === 'ok') {
			setEntries([]);
		}
		setIsClearing(false);
	}

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

	const totalTime = React.useMemo(() => {
		return appStats.reduce((sum, stat) => sum + stat.total, 0);
	}, [appStats]);

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-4xl">
				<header className="mb-8 flex items-center justify-between">
					<div>
						<h1 className="mb-2 text-3xl font-bold text-gray-900">Activity Tracker</h1>
						<p className="text-gray-600">Visualize your application usage</p>
					</div>
					<button
						onClick={handleClear}
						disabled={isClearing || entries.length === 0}
						className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<TrashIcon className="h-4 w-4" />
						{isClearing ? 'Clearing...' : 'Clear Data'}
					</button>
				</header>

				{isLoading ? (
					<div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
						<p className="text-gray-600">Loading activity data...</p>
					</div>
				) : entries.length === 0 ? (
					<div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
						<p className="text-lg font-medium text-gray-900">No activity tracked yet</p>
						<p className="mt-2 text-sm text-gray-500">
							Start using your computer and the tracker will automatically record your activity
						</p>
					</div>
				) : (
					<div className="space-y-6">
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
							<h2 className="mb-4 text-lg font-semibold text-gray-900">Total Time</h2>
							<p className="text-3xl font-bold text-gray-900">{formatDuration(totalTime)}</p>
						</div>

						<div className="rounded-lg border border-gray-200 bg-white shadow-sm">
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
				)}
			</div>
		</div>
	);
};

export default Page;
