import type { TApp, TAppContext } from 'ecsify';
import React from 'react';

export function useResource<
	GAppContext extends TAppContext,
	GKey extends keyof GAppContext['resources']
>(app: TApp<GAppContext>, key: GKey): GAppContext['resources'][GKey] {
	const [, forceRender] = React.useReducer((count) => count + 1, 0);

	React.useEffect(() => {
		const unbinds: Array<() => void> = [
			app._resourceRegistry.onAdd(key, forceRender),
			app._resourceRegistry.onChange(key, forceRender)
		];

		return () => {
			for (const unbind of unbinds) {
				unbind();
			}
		};
	}, [app, key]);

	return app.r[key];
}
