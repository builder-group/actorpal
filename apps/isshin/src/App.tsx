import { invoke } from '@tauri-apps/api/core';
import React from 'react';
import { ProcessCard } from '@/components';
import { formatBytes } from '@/lib';
import { TProcessInfo } from '@/types';
import './styles.css';

const App: React.FC = () => {
	const [processes, setProcesses] = React.useState<TProcessInfo[]>([]);
	const [maxMemoryProcess, setMaxMemoryProcess] = React.useState<TProcessInfo | null>(null);
	const [maxRunningProcess, setMaxRunningProcess] = React.useState<TProcessInfo | null>(null);

	React.useEffect(() => {
		async function loadData() {
			const processList = await invoke<TProcessInfo[]>('list_process');
			const maxMemoryProcess = await invoke<TProcessInfo>('max_memory');
			const maxRunningProcess = await invoke<TProcessInfo>('max_running_process');
			setMaxMemoryProcess(maxMemoryProcess);
			setMaxRunningProcess(maxRunningProcess);
			setProcesses(processList);
		}

		const interval = setInterval(loadData, 1000);
		return () => clearInterval(interval);
	}, []);

	return (
		<main className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-7xl">
				<header className="mb-8">
					<h1 className="mb-2 text-3xl font-bold text-gray-900">Process Monitor</h1>
					<p className="text-gray-600">Real-time system process information</p>
				</header>

				<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
					{maxMemoryProcess != null && (
						<ProcessCard title="Max Memory Process" process={maxMemoryProcess} />
					)}
					{maxRunningProcess != null && (
						<ProcessCard title="Max Running Process" process={maxRunningProcess} />
					)}
				</div>

				<div className="rounded-lg border border-gray-200 bg-white shadow-sm">
					<div className="border-b border-gray-200 px-6 py-4">
						<h2 className="text-xl font-semibold text-gray-900">All Processes</h2>
						<p className="mt-1 text-sm text-gray-500">
							{processes.length} {processes.length === 1 ? 'process' : 'processes'}
						</p>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
										Process Name
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
										Running Time
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
										Memory
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white">
								{processes.map((process) => (
									<tr key={process.id} className="transition-colors hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap">
											<div>
												<p className="text-sm font-medium text-gray-900">{process.nume}</p>
												<p className="text-xs text-gray-400">ID: {process.id}</p>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<p className="text-sm text-gray-900">{process.running_time_formatted}</p>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<p className="text-sm text-gray-900">
												{formatBytes(process.memory_in_bytes)}
											</p>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</main>
	);
};

export default App;
