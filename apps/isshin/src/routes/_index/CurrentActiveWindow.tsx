import React from 'react';
import { specta } from '@/environment';

export const CurrentActiveWindow: React.FC<TCurrentActiveWindowProps> = (props) => {
	const { initialWindow } = props;
	const [currentWindow, setCurrentWindow] = React.useState<specta.ActiveWindowInfo | null>(
		initialWindow
	);
	const unlistenRef = React.useRef<(() => void) | null>(null);

	React.useEffect(() => {
		setCurrentWindow(initialWindow);

		(async () => {
			unlistenRef.current = await specta.events.activeWindowChangedEvent.listen((event) => {
				setCurrentWindow(event.payload.data);
			});
		})();

		return () => {
			if (unlistenRef.current != null) {
				unlistenRef.current();
				unlistenRef.current = null;
			}
		};
	}, [initialWindow]);

	if (currentWindow == null) {
		return (
			<div className="rounded-lg border border-gray-200 bg-white p-4">
				<p className="text-sm text-gray-500">Loading...</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					<h3 className="truncate text-lg font-semibold text-gray-900">
						{currentWindow.application}
					</h3>
					{currentWindow.windowTitle != null &&
						currentWindow.windowTitle !== currentWindow.application && (
							<p className="mt-1 truncate text-sm text-gray-600">{currentWindow.windowTitle}</p>
						)}
					{currentWindow.bundleId != null && (
						<p className="mt-1 truncate text-xs text-gray-500">{currentWindow.bundleId}</p>
					)}
				</div>
				{(currentWindow.windowWidth != null || currentWindow.windowHeight != null) && (
					<div className="shrink-0 text-right">
						<p className="text-xs font-medium text-gray-500">Size</p>
						<p className="mt-0.5 text-sm font-semibold text-gray-900">
							{Math.round(currentWindow.windowWidth ?? 0)} ×{' '}
							{Math.round(currentWindow.windowHeight ?? 0)}
						</p>
					</div>
				)}
			</div>

			{currentWindow.browserUrl != null && (
				<div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
					{currentWindow.browserIsPrivate === true && (
						<span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
							Private
						</span>
					)}
					<p className="min-w-0 flex-1 truncate text-xs text-blue-900">
						{currentWindow.browserUrl}
					</p>
				</div>
			)}
		</div>
	);
};

interface TCurrentActiveWindowProps {
	initialWindow: specta.ActiveWindowInfo | null;
}
