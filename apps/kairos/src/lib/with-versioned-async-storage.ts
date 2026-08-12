import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	missingStorageValue,
	storageFeature,
	type TState,
	type TStorageFeature,
	type TStorageInterface
} from 'feature-state';

export function withVersionedAsyncStorage<GValue extends { version: string }>(
	baseState: TState<GValue>,
	key: string,
	migrationConfig: TVersionedMigrationConfig<GValue>
): TState<GValue, [TStorageFeature]> {
	return baseState.with(storageFeature(new VersionedAsyncStorageInterface(migrationConfig), key));
}

// MARK: - VersionedAsyncStorageInterface

class VersionedAsyncStorageInterface<
	GValue extends { version: string }
> implements TStorageInterface<GValue> {
	private readonly _config: TVersionedMigrationConfig<GValue>;

	constructor(config: TVersionedMigrationConfig<GValue>) {
		this._config = config;
	}

	async save(key: string, value: GValue): Promise<boolean> {
		try {
			await AsyncStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch {
			return false;
		}
	}

	async load(key: string): Promise<GValue | typeof missingStorageValue> {
		let raw: string | null;
		try {
			raw = await AsyncStorage.getItem(key);
		} catch {
			return missingStorageValue;
		}
		if (raw == null) {
			return missingStorageValue;
		}

		// Parse loaded storage item
		let value: unknown;
		try {
			value = JSON.parse(raw);
		} catch {
			return missingStorageValue;
		}
		if (value == null || typeof value !== 'object') {
			return missingStorageValue;
		}

		// Try to extract version from parsed value
		const version = (value as { version?: string }).version ?? this._config.fallbackVersion;
		if (version == null) {
			return missingStorageValue;
		}
		let current = value as GValue;
		let currentVersion = version;

		// Run migration chain until we reach the latest version
		while (currentVersion !== this._config.latestVersion) {
			const migration = this._config.migrations[currentVersion];
			if (migration == null) {
				return missingStorageValue;
			}

			// Apply migration
			current = migration.migrate(current) as GValue;
			current.version = migration.to;

			// Save updated value
			await this.save(key, current);

			currentVersion = migration.to;
		}

		return current;
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

export interface TVersionedMigrationConfig<GValue extends { version: string }> {
	latestVersion: GValue['version'];
	fallbackVersion?: string;
	migrations: Record<string, TVersionedMigration<unknown, unknown>>;
}

export interface TVersionedMigration<GFrom, GTo> {
	to: string;
	migrate: (value: GFrom) => GTo;
}
