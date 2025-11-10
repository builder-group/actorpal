import { confirm } from '@tauri-apps/plugin-dialog';
import { ArrowLeftIcon, XIcon } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';
import { ProcessCard } from '@/components';
import { specta } from '@/environment';
import { formatBytes } from '@/lib';

const Page: React.FC = () => {
	const navigate = useNavigate();
	const [processes, setProcesses] = React.useState<specta.ProcessInfo[]>([]);
	const [maxMemoryProcess, setMaxMemoryProcess] = React.useState<specta.ProcessInfo | null>(null);
	const [maxRunningProcess, setMaxRunningProcess] = React.useState<specta.ProcessInfo | null>(null);
	const [killingProcessId, setKillingProcessId] = React.useState<string | null>(null);
	const [focusedApp, setFocusedApp] = React.useState<string | null>(null);

	React.useEffect(() => {
		async function loadData() {
			const processList = await specta.commands.listProcess();
			const maxMemoryProcess = await specta.commands.maxMemory();
			const maxRunningProcess = await specta.commands.maxRunningProcess();
			const focused = await specta.commands.getFocusedApplication();
			setMaxMemoryProcess(maxMemoryProcess);
			setMaxRunningProcess(maxRunningProcess);
			setProcesses(processList);
			setFocusedApp(focused);
		}

		const interval = setInterval(loadData, 1000);
		return () => clearInterval(interval);
	}, []);

	async function handleKillProcess(processId: string, processName: string) {
		const confirmed = await confirm(
			`Are you sure you want to kill "${processName}" (PID: ${processId})?`,
			{
				title: 'Kill Process',
				kind: 'warning'
			}
		);
		if (!confirmed) {
			return;
		}

		setKillingProcessId(processId);
		await specta.commands.killProcess(processId);
		setKillingProcessId(null);
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
					<h1 className="mb-2 text-3xl font-bold text-gray-900">Process Monitor</h1>
					<p className="text-gray-600">Real-time system process information</p>
				</header>

				<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{focusedApp != null && (
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
							<h3 className="mb-4 text-sm font-medium tracking-wide text-gray-500 uppercase">
								Active Application
							</h3>
							<div>
								<p className="text-lg font-semibold text-gray-900">{focusedApp}</p>
								<p className="mt-1 text-xs text-gray-400">Currently in focus</p>
							</div>
						</div>
					)}
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
									<th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
										Actions
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
										<td className="px-6 py-4 text-right whitespace-nowrap">
											<button
												onClick={() => handleKillProcess(process.id, process.nume)}
												disabled={killingProcessId === process.id}
												className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
												title={`Kill ${process.nume}`}
											>
												<XIcon className="h-4 w-4" />
												{killingProcessId === process.id ? 'Killing...' : 'Kill'}
											</button>
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

export default Page;
