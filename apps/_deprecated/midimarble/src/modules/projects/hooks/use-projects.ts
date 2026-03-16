import { useNavigate } from '@tanstack/react-router';
import React from 'react';
import { audioConfig } from '@/modules/engine/plugins/audio/config';
import type { TAudioInstrumentId } from '@/modules/engine/plugins/audio/types';
import { parseMidi } from '@/modules/engine/plugins/midi/lib/midi-parser';
import { sceneConfig } from '@/modules/engine/plugins/scene/config';
import { trajectoryConfig } from '@/modules/engine/plugins/trajectory/config';
import { projectRepository, type TProjectListItem } from '@/modules/persistence';

export interface TUseProjects {
	projects: TProjectListItem[];
	isLoading: boolean;
	createProject(file: File): Promise<void>;
	createBlankProject(): Promise<void>;
	deleteProject(id: string): Promise<void>;
	openProject(id: string): void;
}

export function useProjects(): TUseProjects {
	const navigate = useNavigate();
	const [projects, setProjects] = React.useState<TProjectListItem[]>([]);
	const [isLoading, setIsLoading] = React.useState(true);

	React.useEffect(() => {
		void (async () => {
			const list = await projectRepository.listProjects();
			setProjects(list);
			setIsLoading(false);
		})();
	}, []);

	const createProject = React.useCallback(
		async (file: File) => {
			const bytes = await file.arrayBuffer();
			const song = parseMidi(bytes, file.name);
			const firstTrack = song.tracks.find((t) => t.notes.length > 0);
			const id = crypto.randomUUID();
			const now = Date.now();

			const record = {
				id,
				name: song.name,
				createdAt: now,
				updatedAt: now,
				midiFileName: file.name,
				midiSong: song,
				selectedTrackId: firstTrack?.id ?? null,
				playheadTick: 0,
				audioSettings: {
					enabled: audioConfig.defaults.enabled,
					masterVolume: audioConfig.defaults.masterVolume,
					trackInstrumentIds: {} as Record<number, TAudioInstrumentId>
				},
				trajectoryConfig: {
					enabled: trajectoryConfig.defaults.enabled,
					futureColor: trajectoryConfig.defaults.futureColor,
					pastColor: trajectoryConfig.defaults.pastColor
				},
				marble: {
					position: { ...sceneConfig.marble.spawn.position },
					rotation: { ...sceneConfig.marble.spawn.rotation },
					bounce: sceneConfig.marble.physics.defaults.bounce
				},
				notePlatforms: [],
				straightTracks: []
			};

			await projectRepository.saveProject(record);
			await projectRepository.saveMidiBytes(id, bytes);
			setProjects((prev) => [{ id, name: song.name, updatedAt: now }, ...prev]);
			void navigate({ to: '/editor/$projectId', params: { projectId: id } });
		},
		[navigate]
	);

	const createBlankProject = React.useCallback(async () => {
		const id = crypto.randomUUID();
		const now = Date.now();
		const name = 'Untitled Project';

		const record = {
			id,
			name,
			createdAt: now,
			updatedAt: now,
			midiFileName: null,
			midiSong: {
				name,
				bpm: 120,
				ticksPerBeat: 480,
				totalTicks: 1920,
				tracks: [{ id: 0, name: 'Track 1', notes: [] }]
			},
			selectedTrackId: 0,
			playheadTick: 0,
			audioSettings: {
				enabled: audioConfig.defaults.enabled,
				masterVolume: audioConfig.defaults.masterVolume,
				trackInstrumentIds: {} as Record<number, TAudioInstrumentId>
			},
			trajectoryConfig: {
				enabled: trajectoryConfig.defaults.enabled,
				futureColor: trajectoryConfig.defaults.futureColor,
				pastColor: trajectoryConfig.defaults.pastColor
			},
			marble: {
				position: { ...sceneConfig.marble.spawn.position },
				rotation: { ...sceneConfig.marble.spawn.rotation },
				bounce: sceneConfig.marble.physics.defaults.bounce
			},
			notePlatforms: [],
			straightTracks: []
		};

		await projectRepository.saveProject(record);
		setProjects((prev) => [{ id, name, updatedAt: now }, ...prev]);
		void navigate({ to: '/editor/$projectId', params: { projectId: id } });
	}, [navigate]);

	const deleteProject = React.useCallback(async (id: string) => {
		await projectRepository.deleteProject(id);
		setProjects((prev) => prev.filter((p) => p.id !== id));
	}, []);

	const openProject = React.useCallback(
		(id: string) => {
			void navigate({ to: '/editor/$projectId', params: { projectId: id } });
		},
		[navigate]
	);

	return { projects, isLoading, createProject, createBlankProject, deleteProject, openProject };
}
