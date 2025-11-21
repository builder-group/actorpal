import React from 'react';
import { specta } from '@/environment';

export const CurrentActiveWindow: React.FC<TCurrentActiveWindowProps> = (props) => {
	const { initialWindow, initialApp } = props;
	const [currentWindow, setCurrentWindow] = React.useState<specta.WindowInfo | null>(initialWindow);
	const [currentApp, setCurrentApp] = React.useState<specta.AppInfo | null>(initialApp);
	const unlistenWindowRef = React.useRef<(() => void) | null>(null);
	const unlistenAppRef = React.useRef<(() => void) | null>(null);

	React.useEffect(() => {
		setCurrentWindow(initialWindow);
		setCurrentApp(initialApp);

		(async () => {
			unlistenWindowRef.current = await specta.events.activeWindowChangedEvent.listen((event) => {
				setCurrentWindow(event.payload.data);
			});

			unlistenAppRef.current = await specta.events.activeAppChangedEvent.listen((event) => {
				setCurrentApp(event.payload.data);
			});
		})();

		return () => {
			if (unlistenWindowRef.current != null) {
				unlistenWindowRef.current();
				unlistenWindowRef.current = null;
			}
			if (unlistenAppRef.current != null) {
				unlistenAppRef.current();
				unlistenAppRef.current = null;
			}
		};
	}, [initialWindow, initialApp]);

	return (
		<div className="space-y-4">
			{currentApp != null && (
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<h3 className="mb-2 text-sm font-medium text-gray-500">Active App</h3>
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0 flex-1">
							<p className="truncate text-lg font-semibold text-gray-900">
								{currentApp.name ?? 'Unknown App'}
							</p>
							{currentApp.bundleId != null && (
								<p className="mt-1 truncate text-xs text-gray-500">{currentApp.bundleId}</p>
							)}
						</div>
					</div>
				</div>
			)}

			{currentWindow != null ? (
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<h3 className="mb-2 text-sm font-medium text-gray-500">Active Window</h3>
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0 flex-1">
							<p className="truncate text-lg font-semibold text-gray-900">
								{currentWindow.app.name ?? 'Unknown App'}
							</p>
							{currentWindow.title != null && currentWindow.title !== currentWindow.app.name && (
								<p className="mt-1 truncate text-sm text-gray-600">{currentWindow.title}</p>
							)}
							{currentWindow.app.bundleId != null && (
								<p className="mt-1 truncate text-xs text-gray-500">{currentWindow.app.bundleId}</p>
							)}
						</div>
						{(currentWindow.bounds?.width != null || currentWindow.bounds?.height != null) && (
							<div className="shrink-0 text-right">
								<p className="text-xs font-medium text-gray-500">Size</p>
								<p className="mt-0.5 text-sm font-semibold text-gray-900">
									{Math.round(currentWindow.bounds?.width ?? 0)} ×{' '}
									{Math.round(currentWindow.bounds?.height ?? 0)}
								</p>
							</div>
						)}
					</div>

					{currentWindow.browser?.url != null && (
						<div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
							{currentWindow.browser.isPrivate === true && (
								<span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
									Private
								</span>
							)}
							<p className="min-w-0 flex-1 truncate text-xs text-blue-900">
								{currentWindow.browser.url}
							</p>
						</div>
					)}
				</div>
			) : (
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<p className="text-sm text-gray-500">No active window</p>
				</div>
			)}
		</div>
	);
};

interface TCurrentActiveWindowProps {
	initialWindow: specta.WindowInfo | null;
	initialApp: specta.AppInfo | null;
}
