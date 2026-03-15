import { Trash2 } from 'lucide-react';
import React from 'react';
import type { TProjectListItem } from '@/modules/persistence';

interface TProjectCardProps {
	project: TProjectListItem;
	onOpen(id: string): void;
	onDelete(id: string): void;
}

export const ProjectCard: React.FC<TProjectCardProps> = ({ project, onOpen, onDelete }) => {
	const formattedDate = React.useMemo(() => {
		return new Date(project.updatedAt).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}, [project.updatedAt]);

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		onDelete(project.id);
	};

	return (
		<button
			type="button"
			className="border-base-200 bg-base-0 hover:border-base-300 hover:bg-base-50 group relative flex w-full flex-col items-start rounded-xl border p-5 text-left shadow-sm transition"
			onClick={() => onOpen(project.id)}
		>
			<p className="text-base-900 truncate text-sm font-semibold">{project.name}</p>
			<p className="text-base-500 mt-1 text-xs">Edited {formattedDate}</p>
			<button
				type="button"
				className="border-base-200 bg-base-0 text-base-500 hover:text-base-900 hover:bg-base-100 absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-md border opacity-0 transition group-hover:opacity-100"
				aria-label={`Delete ${project.name}`}
				onClick={handleDelete}
			>
				<Trash2 className="h-3.5 w-3.5" />
			</button>
		</button>
	);
};
