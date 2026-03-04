import { type TEnforceFeatureConstraint, type TFeatureDefinition } from '@blgc/types/features';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER,
	withStorage,
	type TPersistFeature,
	type TState,
	type TStorageInterface
} from 'feature-state';

export function withAsyncStorage<GValue, GFeatures extends TFeatureDefinition[]>(
	baseState: TEnforceFeatureConstraint<TState<GValue, GFeatures>, TState<GValue, GFeatures>, []>,
	key: string
): TState<GValue, [TPersistFeature, ...GFeatures]> {
	return withStorage(baseState, new AsyncStorageInterface<GValue>(), key);
}

class AsyncStorageInterface<GStorageValue> implements TStorageInterface<GStorageValue> {
	async save(key: string, value: GStorageValue): Promise<boolean> {
		try {
			await AsyncStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch {
			return false;
		}
	}

	async load(key: string): Promise<GStorageValue | typeof FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER> {
		try {
			const raw = await AsyncStorage.getItem(key);
			return raw != null
				? (JSON.parse(raw) as GStorageValue)
				: FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		} catch {
			return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		}
	}

	async delete(key: string): Promise<boolean> {
		try {
			await AsyncStorage.removeItem(key);
			return true;
		} catch {
			return false;
		}
	}
}
