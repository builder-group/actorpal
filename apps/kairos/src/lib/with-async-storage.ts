import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	missingStorageValue,
	storageFeature,
	type TState,
	type TStorageFeature,
	type TStorageInterface
} from 'feature-state';

export function withAsyncStorage<GValue>(
	baseState: TState<GValue>,
	key: string
): TState<GValue, [TStorageFeature]> {
	return baseState.with(storageFeature(new AsyncStorageInterface<GValue>(), key));
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

	async load(key: string): Promise<GStorageValue | typeof missingStorageValue> {
		try {
			const raw = await AsyncStorage.getItem(key);
			return raw != null ? (JSON.parse(raw) as GStorageValue) : missingStorageValue;
		} catch {
			return missingStorageValue;
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
