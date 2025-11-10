import React from 'react';
import { specta } from '@/environment';
import { formatBytes } from '@/lib';

export const ProcessCard: React.FC<TProcessCardProps> = (props) => {
	const { title, process } = props;

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<h3 className="mb-4 text-sm font-medium tracking-wide text-gray-500 uppercase">{title}</h3>
			<div className="space-y-3">
				<div>
					<p className="text-lg font-semibold text-gray-900">{process.nume}</p>
					<p className="mt-1 text-xs text-gray-400">ID: {process.id}</p>
				</div>
				<div className="flex items-center gap-4 border-t border-gray-100 pt-2">
					<div>
						<p className="mb-1 text-xs text-gray-500">Running Time</p>
						<p className="text-sm font-medium text-gray-900">{process.running_time_formatted}</p>
					</div>
					<div>
						<p className="mb-1 text-xs text-gray-500">Memory</p>
						<p className="text-sm font-medium text-gray-900">
							{formatBytes(process.memory_in_bytes)}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

interface TProcessCardProps {
	title: string;
	process: specta.ProcessInfo;
}
