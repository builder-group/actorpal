import type { TComponentRef, TComponentValue } from 'ecsify';

export type TBundle<
	GApp extends TBundleApp = TBundleApp,
	GKey extends TBundleKey<GApp> = TBundleKey<GApp>
> = readonly (TBundleEntry<GApp, GKey> | TBundle<GApp, GKey>)[];

export interface TBundleEntry<
	GApp extends TBundleApp = TBundleApp,
	GKey extends TBundleKey<GApp> = TBundleKey<GApp>
> {
	component: GApp['c'][GKey];
	value?: TComponentValue<GApp['c'][GKey]>;
}

type TBundleApp = { c: Record<string, TComponentRef> };
type TBundleKey<GApp extends TBundleApp = TBundleApp> = keyof GApp['c'];

// MARK: - Helpers

export function defineBundle<
	GApp extends { c: Record<string, TComponentRef> },
	GKey extends keyof GApp['c'] = keyof GApp['c']
>(...parts: readonly (TBundleEntry<GApp, GKey> | TBundle<GApp, GKey>)[]): TBundle<GApp, GKey> {
	return flattenBundle(parts);
}

export function bundleEntry<
	GApp extends { c: Record<string, TComponentRef> },
	GKey extends keyof GApp['c'] = keyof GApp['c']
>(component: GApp['c'][GKey], value?: TComponentValue<GApp['c'][GKey]>): TBundleEntry<GApp, GKey> {
	return { component, value };
}

export function flattenBundle<
	GApp extends { c: Record<string, TComponentRef> },
	GKey extends keyof GApp['c'] = keyof GApp['c']
>(bundle: TBundle<GApp, GKey>): TBundleEntry<GApp, GKey>[] {
	const entries: TBundleEntry<GApp, GKey>[] = [];

	for (const part of bundle) {
		if (isBundleEntry(part)) {
			entries.push(part);
			continue;
		}

		entries.push(...flattenBundle(part));
	}

	return entries;
}

function isBundleEntry<
	GApp extends { c: Record<string, TComponentRef> },
	GKey extends keyof GApp['c'] = keyof GApp['c']
>(part: TBundleEntry<GApp, GKey> | TBundle<GApp, GKey>): part is TBundleEntry<GApp, GKey> {
	return typeof part === 'object' && part !== null && 'component' in part;
}
