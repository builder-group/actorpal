import {
	Entity,
	type TApp,
	type TComponentDataTuple,
	type TComponentRef,
	type TEntity,
	type TQuery,
	type TQueryFilter
} from 'ecsify';
import React from 'react';

export function useQueryComponents<GComponents extends readonly (TComponentRef | TEntity)[]>(
	app: TApp,
	options: TUseQueryComponentsFactoryValue<GComponents>,
	deps: React.DependencyList = []
): TComponentDataTuple<GComponents>[] {
	const { components, queryOrFilter, watchComponents } = options;
	const [values, setValues] = React.useState<TComponentDataTuple<GComponents>[]>(() =>
		app.queryComponents(components, queryOrFilter)
	);

	React.useEffect(() => {
		const watched =
			watchComponents ??
			(components.filter((component) => component !== Entity) as TComponentRef[]);

		const sync = () => {
			setValues(app.queryComponents(components, queryOrFilter));
		};

		const unbinds: Array<() => void> = [];
		for (const component of watched) {
			unbinds.push(
				app._componentRegistry.onAdd(component, sync),
				app._componentRegistry.onChange(component, sync),
				app._componentRegistry.onRemove(component, sync)
			);
		}

		sync();

		return () => {
			for (const unbind of unbinds) {
				unbind();
			}
		};
	}, [app, ...deps]);

	return values;
}

interface TUseQueryComponentsFactoryValue<
	GComponents extends readonly (TComponentRef | TEntity)[]
> {
	components: GComponents;
	queryOrFilter?: TQuery | TQueryFilter;
	watchComponents?: TComponentRef[];
}
