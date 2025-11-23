import { BanIcon } from 'lucide-react';
import { Ok } from 'tuple-result';
import { resultLoader, withResultLoader } from '@/lib';

const Page = withResultLoader<TSuccessLoaderData, TErrorLoaderData>({
	Success: ({ data }) => {
		const { message } = data;

		return (
			<div className="flex min-h-screen w-full items-center justify-center bg-red-50 p-8">
				<div className="max-w-md rounded-xl border border-red-200 bg-white p-8 shadow-lg">
					<div className="mb-6 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
							<BanIcon className="h-8 w-8 text-red-600" />
						</div>
						<h1 className="text-2xl font-bold text-gray-900">Blocked</h1>
					</div>
					<div className="space-y-4">
						<p className="text-center text-gray-600">{message}</p>
						<p className="text-center text-sm text-gray-500">
							Focus time is active. This app/site is blocked to help you stay focused.
						</p>
					</div>
				</div>
			</div>
		);
	},
	Error: ({ error }) => (
		<div className="flex min-h-screen items-center justify-center bg-red-50 p-8">
			<div className="rounded-xl border border-red-200 bg-red-50 px-8 py-6 text-center shadow-sm">
				<p className="font-medium text-red-900">Failed to load blocked page</p>
				<p className="mt-1 text-sm text-red-700">{String(error)}</p>
			</div>
		</div>
	)
});

export default Page;

export const clientLoader = resultLoader<TSuccessLoaderData, TErrorLoaderData>(
	async ({ request }) => {
		const url = new URL(request.url);
		const message = url.searchParams.get('message') || 'This app/site is blocked during focus time';

		return Ok({
			message
		});
	}
);

interface TSuccessLoaderData {
	message: string;
}

type TErrorLoaderData = string;
