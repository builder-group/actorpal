import { type TEnforceFeatureConstraint, type TFeatureDefinition } from '@blgc/types/features';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER,
	withStorage,
	type TPersistFeature,
	type TState,
	type TStorageInterface
} from 'feature-state';

export function withVersionedAsyncStorage<
	GValue extends { version: string },
	GFeatures extends TFeatureDefinition[]
>(
	baseState: TEnforceFeatureConstraint<TState<GValue, GFeatures>, TState<GValue, GFeatures>, []>,
	key: string,
	migrationConfig: TVersionedMigrationConfig<GValue>
): TState<GValue, [TPersistFeature, ...GFeatures]> {
	return withStorage(baseState, new VersionedAsyncStorageInterface(migrationConfig), key);
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

	async load(key: string): Promise<GValue | typeof FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER> {
		let raw: string | null;
		try {
			raw = await AsyncStorage.getItem(key);
		} catch {
			return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		}
		if (raw == null) {
			return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		}

		// Parse loaded storage item
		let value: unknown;
		try {
			value = JSON.parse(raw);
		} catch {
			return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		}
		if (value == null || typeof value !== 'object') {
			return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		}

		// Try to extract version from parsed value
		const version = (value as { version?: string }).version ?? this._config.fallbackVersion;
		if (version == null) {
			return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		}
		let current = value as GValue;
		let currentVersion = version;

		// Run migration chain until we reach the latest version
		while (currentVersion !== this._config.latestVersion) {
			const migration = this._config.migrations[currentVersion];
			if (migration == null) {
				return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
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
