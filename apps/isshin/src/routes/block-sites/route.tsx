import { confirm, message } from '@tauri-apps/plugin-dialog';
import { ArrowLeftIcon, PlusIcon, TrashIcon, XIcon } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';
import { specta } from '@/environment';

const Page: React.FC = () => {
	const navigate = useNavigate();
	const [blockedSites, setBlockedSites] = React.useState<string[]>([]);
	const [pendingSites, setPendingSites] = React.useState<string[]>([]);
	const [newSite, setNewSite] = React.useState('');
	const [isLoading, setIsLoading] = React.useState(false);

	async function loadBlockedSites() {
		const result = await specta.commands.getBlockedWebsites();
		if (result.status === 'ok') {
			setBlockedSites(result.data);
		} else {
			console.error('Failed to load blocked sites:', result.error);
			await message(`Failed to load blocked sites: ${result.error}`, {
				title: 'Error',
				kind: 'error'
			});
		}
	}

	function normalizeDomain(input: string): string {
		const trimmed = input.trim();
		if (!trimmed) return '';
		const cleaned = trimmed.toLowerCase().replace(/^https?:\/\//, '');
		const parts = cleaned.split('/');
		return parts[0] ?? '';
	}

	async function handleAddToPending() {
		if (!newSite.trim()) {
			return;
		}

		const domain = normalizeDomain(newSite);
		if (!domain) {
			return;
		}

		if (blockedSites.includes(domain)) {
			await message(`${domain} is already blocked`, {
				title: 'Info',
				kind: 'info'
			});
			return;
		}

		if (pendingSites.includes(domain)) {
			await message(`${domain} is already in the pending list`, {
				title: 'Info',
				kind: 'info'
			});
			return;
		}

		setPendingSites([...pendingSites, domain]);
		setNewSite('');
	}

	function handleRemoveFromPending(domain: string) {
		setPendingSites(pendingSites.filter((site) => site !== domain));
	}

	async function handleBlockAll() {
		if (pendingSites.length === 0) {
			return;
		}

		const confirmed = await confirm(
			`Are you sure you want to block ${pendingSites.length} website${pendingSites.length === 1 ? '' : 's'}?`,
			{
				title: 'Block Websites',
				kind: 'warning'
			}
		);

		if (!confirmed) {
			return;
		}

		setIsLoading(true);
		const result = await specta.commands.blockWebsites(pendingSites);
		if (result.status === 'ok') {
			setPendingSites([]);
			await loadBlockedSites();
			await message(`Successfully blocked ${result.data} website${result.data === 1 ? '' : 's'}`, {
				title: 'Success',
				kind: 'info'
			});
		} else {
			await message(`Failed to block websites: ${result.error}`, {
				title: 'Error',
				kind: 'error'
			});
		}
		setIsLoading(false);
	}

	async function handleRemoveSite(domain: string) {
		const confirmed = await confirm(`Are you sure you want to unblock "${domain}"?`, {
			title: 'Unblock Website',
			kind: 'warning'
		});

		if (!confirmed) {
			return;
		}

		setIsLoading(true);
		const result = await specta.commands.unblockWebsite(domain);
		if (result.status === 'ok') {
			if (result.data) {
				await loadBlockedSites();
				await message(`Successfully unblocked ${domain}`, {
					title: 'Success',
					kind: 'info'
				});
			} else {
				await message(`${domain} is not currently blocked`, {
					title: 'Info',
					kind: 'info'
				});
			}
		} else {
			await message(`Failed to unblock ${domain}: ${result.error}`, {
				title: 'Error',
				kind: 'error'
			});
		}
		setIsLoading(false);
	}

	async function handleUnblockAll() {
		if (blockedSites.length === 0) {
			return;
		}

		const confirmed = await confirm(
			`Are you sure you want to unblock all ${blockedSites.length} website${blockedSites.length === 1 ? '' : 's'}?`,
			{
				title: 'Unblock All Websites',
				kind: 'warning'
			}
		);

		if (!confirmed) {
			return;
		}

		setIsLoading(true);
		let successCount = 0;
		let failCount = 0;

		for (const domain of blockedSites) {
			const result = await specta.commands.unblockWebsite(domain);
			if (result.status === 'ok' && result.data) {
				successCount++;
			} else {
				failCount++;
				console.error(
					`Failed to unblock ${domain}:`,
					result.status === 'error' ? result.error : 'Not blocked'
				);
			}
		}

		await loadBlockedSites();

		if (failCount === 0) {
			await message(
				`Successfully unblocked all ${successCount} website${successCount === 1 ? '' : 's'}`,
				{
					title: 'Success',
					kind: 'info'
				}
			);
		} else {
			await message(
				`Unblocked ${successCount} website${successCount === 1 ? '' : 's'}, ${failCount} failed`,
				{
					title: 'Partial Success',
					kind: 'warning'
				}
			);
		}
		setIsLoading(false);
	}

	async function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			await handleAddToPending();
		}
	}

	React.useEffect(() => {
		void loadBlockedSites();
	}, []);

	return (
		<main className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-4xl">
				<header className="mb-8">
					<button
						onClick={() => navigate(-1)}
						className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
					>
						<ArrowLeftIcon className="h-5 w-5" />
						Back
					</button>
					<h1 className="mb-2 text-3xl font-bold text-gray-900">Block Websites</h1>
					<p className="text-gray-600">
						Block distracting websites by modifying your hosts file. Similar to SelfControl.
					</p>
				</header>

				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h2 className="mb-4 text-lg font-semibold text-gray-900">Add Websites to Block</h2>
					<div className="flex gap-2">
						<input
							type="text"
							value={newSite}
							onChange={(e) => setNewSite(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="Enter domain (e.g., twitter.com or facebook.com)"
							className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							disabled={isLoading}
						/>
						<button
							onClick={() => handleAddToPending()}
							disabled={isLoading || !newSite.trim()}
							className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<PlusIcon className="h-4 w-4" />
							Add
						</button>
					</div>
					<p className="mt-2 text-xs text-gray-500">
						Add websites to the list below, then click &quot;Block All&quot; to block them at once.
					</p>
				</div>

				{pendingSites.length > 0 && (
					<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
						<div className="mb-4 flex items-center justify-between">
							<div>
								<h2 className="text-lg font-semibold text-gray-900">Pending Websites</h2>
								<p className="mt-1 text-sm text-gray-500">
									{pendingSites.length} website{pendingSites.length === 1 ? '' : 's'} ready to block
								</p>
							</div>
							<button
								onClick={handleBlockAll}
								disabled={isLoading}
								className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Block All
							</button>
						</div>
						<div className="flex flex-wrap gap-2">
							{pendingSites.map((site) => (
								<div
									key={site}
									className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-sm"
								>
									<span className="font-medium text-blue-900">{site}</span>
									<button
										onClick={() => handleRemoveFromPending(site)}
										disabled={isLoading}
										className="text-blue-600 transition-colors hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
										title={`Remove ${site}`}
									>
										<XIcon className="h-4 w-4" />
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				<div className="rounded-lg border border-gray-200 bg-white shadow-sm">
					<div className="border-b border-gray-200 px-6 py-4">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-xl font-semibold text-gray-900">Blocked Websites</h2>
								<p className="mt-1 text-sm text-gray-500">
									{blockedSites.length} {blockedSites.length === 1 ? 'website' : 'websites'} blocked
								</p>
							</div>
							{blockedSites.length > 0 && (
								<button
									onClick={handleUnblockAll}
									disabled={isLoading}
									className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									<TrashIcon className="h-4 w-4" />
									Unblock All
								</button>
							)}
						</div>
					</div>
					<div className="divide-y divide-gray-200">
						{blockedSites.length === 0 ? (
							<div className="px-6 py-12 text-center">
								<p className="text-gray-500">No websites are currently blocked.</p>
								<p className="mt-1 text-sm text-gray-400">Add a website above to get started.</p>
							</div>
						) : (
							blockedSites.map((site) => (
								<div
									key={site}
									className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50"
								>
									<div>
										<p className="font-medium text-gray-900">{site}</p>
										<p className="text-xs text-gray-400">Blocked via /etc/hosts</p>
									</div>
									<button
										onClick={() => handleRemoveSite(site)}
										disabled={isLoading}
										className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
										title={`Unblock ${site}`}
									>
										<TrashIcon className="h-4 w-4" />
										Unblock
									</button>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</main>
	);
};

export default Page;
