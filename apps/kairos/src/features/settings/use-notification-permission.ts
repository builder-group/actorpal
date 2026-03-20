import React from 'react';
import { AppState } from 'react-native';
import {
	getNotificationPermissionStatus,
	type TNotificationPermissionStatus
} from '@/modules/alarm';

export function useNotificationPermission() {
	const [status, setStatus] = React.useState<TNotificationPermissionStatus>('notDetermined');

	React.useEffect(() => {
		let isActive = true;

		const refresh = async (): Promise<void> => {
			try {
				const nextStatus = await getNotificationPermissionStatus();
				if (isActive) {
					setStatus(nextStatus);
				}
			} catch {
				if (isActive) {
					setStatus('denied');
				}
			}
		};

		void refresh();

		const sub = AppState.addEventListener('change', (nextState) => {
			if (nextState === 'active') {
				void refresh();
			}
		});

		return () => {
			isActive = false;
			sub.remove();
		};
	}, []);

	return {
		status,
		isAllowed: ALLOWED_STATUSES.has(status)
	};
}

const ALLOWED_STATUSES: ReadonlySet<TNotificationPermissionStatus> = new Set([
	'authorized',
	'provisional',
	'ephemeral'
]);
