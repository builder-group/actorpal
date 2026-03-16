import type { TProjectListItem, TProjectRecord } from './types';

const DB_NAME = 'midimarble-db';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const MIDI_FILES_STORE = 'midi-files';

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export class ProjectRepository {
	private _dbPromise: Promise<IDBDatabase> | null = null;

	private _getDb(): Promise<IDBDatabase> {
		if (this._dbPromise == null) {
			this._dbPromise = new Promise((resolve, reject) => {
				const request = indexedDB.open(DB_NAME, DB_VERSION);
				request.onupgradeneeded = (event) => {
					const db = (event.target as IDBOpenDBRequest).result;
					if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
						db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
					}
					if (!db.objectStoreNames.contains(MIDI_FILES_STORE)) {
						db.createObjectStore(MIDI_FILES_STORE);
					}
				};
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		}
		return this._dbPromise;
	}

	async listProjects(): Promise<TProjectListItem[]> {
		const db = await this._getDb();
		const tx = db.transaction(PROJECTS_STORE, 'readonly');
		const store = tx.objectStore(PROJECTS_STORE);
		const records = await idbReq<TProjectRecord[]>(store.getAll());
		return records
			.map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
			.sort((a, b) => b.updatedAt - a.updatedAt);
	}

	async getProject(id: string): Promise<TProjectRecord | undefined> {
		const db = await this._getDb();
		const tx = db.transaction(PROJECTS_STORE, 'readonly');
		const store = tx.objectStore(PROJECTS_STORE);
		return idbReq<TProjectRecord | undefined>(store.get(id));
	}

	async saveProject(record: TProjectRecord): Promise<void> {
		const db = await this._getDb();
		const tx = db.transaction(PROJECTS_STORE, 'readwrite');
		const store = tx.objectStore(PROJECTS_STORE);
		await idbReq(store.put(record));
	}

	async saveMidiBytes(projectId: string, bytes: ArrayBuffer): Promise<void> {
		const db = await this._getDb();
		const tx = db.transaction(MIDI_FILES_STORE, 'readwrite');
		const store = tx.objectStore(MIDI_FILES_STORE);
		await idbReq(store.put(bytes, projectId));
	}

	async deleteProject(id: string): Promise<void> {
		const db = await this._getDb();
		const tx = db.transaction([PROJECTS_STORE, MIDI_FILES_STORE], 'readwrite');
		await Promise.all([
			idbReq(tx.objectStore(PROJECTS_STORE).delete(id)),
			idbReq(tx.objectStore(MIDI_FILES_STORE).delete(id))
		]);
	}
}

export const projectRepository = new ProjectRepository();
