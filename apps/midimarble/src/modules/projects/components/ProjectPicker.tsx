import { FileUp } from 'lucide-react';
import React from 'react';
import { useProjects } from '../hooks/use-projects';
import { ProjectCard } from './ProjectCard';

export const ProjectPicker: React.FC = () => {
	const { projects, isLoading, createProject, deleteProject, openProject } = useProjects();
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const [isCreating, setIsCreating] = React.useState(false);

	const handleFileChange = React.useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			e.target.value = '';
			if (file == null) return;
			setIsCreating(true);
			try {
				await createProject(file);
			} finally {
				setIsCreating(false);
			}
		},
		[createProject]
	);

	return (
		<main className="bg-base-100 min-h-screen px-6 py-12">
			<input
				ref={fileInputRef}
				type="file"
				accept=".mid,.midi,audio/midi,audio/x-midi"
				className="hidden"
				onChange={handleFileChange}
			/>

			<div className="mx-auto max-w-4xl">
				<div className="flex items-center justify-between gap-4">
					<div>
						<p className="text-base-500 text-xs font-semibold tracking-[0.18em] uppercase">
							Midimarble
						</p>
						<h1 className="text-base-950 mt-1 text-2xl font-semibold tracking-tight">Projects</h1>
					</div>
					<button
						type="button"
						className="bg-base-900 text-base-0 hover:bg-base-800 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:opacity-60"
						disabled={isCreating}
						onClick={() => fileInputRef.current?.click()}
					>
						<FileUp className="h-4 w-4" />
						<span>{isCreating ? 'Importing…' : 'Open MIDI file'}</span>
					</button>
				</div>

				<div className="mt-10">
					{isLoading ? (
						<p className="text-base-500 text-sm">Loading projects…</p>
					) : projects.length === 0 ? (
						<div className="border-base-200 rounded-xl border border-dashed py-20 text-center">
							<p className="text-base-600 text-sm font-medium">No projects yet</p>
							<p className="text-base-400 mt-1 text-sm">
								Open a MIDI file to create your first project.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
							{projects.map((project) => (
								<ProjectCard
									key={project.id}
									project={project}
									onOpen={openProject}
									onDelete={deleteProject}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</main>
	);
};
