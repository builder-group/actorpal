import React from 'react';
import { Runtime } from '@/modules/engine';
import { projectRepository, type TProjectRecord } from '@/modules/persistence';

export class EditorCx {
	public readonly runtime: Runtime;
	private _container: HTMLDivElement | null = null;

	constructor(record: TProjectRecord | null) {
		this.runtime = new Runtime(record);
	}

	public readonly setContainer = (container: HTMLDivElement | null): void => {
		if (this._container === container) {
			return;
		}
		this._container = container;
		this.runtime.setContainer(container);
	};

	public unmount(): void {
		this.runtime.unmount();
		this._container = null;
	}
}

// MARK: - React Context

const ReactEditorCx = React.createContext<EditorCx | null>(null);

export const EditorCxProvider: React.FC<{
	children: React.ReactNode;
	projectId?: string;
}> = ({ children, projectId }) => {
	const [cx, setCx] = React.useState<EditorCx | null>(null);

	React.useEffect(() => {
		let createdCx: EditorCx | null = null;
		let active = true;

		void (async () => {
			let record: TProjectRecord | null = null;
			if (projectId != null) {
				record = (await projectRepository.getProject(projectId)) ?? null;
			}
			if (!active) return;
			createdCx = new EditorCx(record);
			setCx(createdCx);
		})();

		return () => {
			active = false;
			createdCx?.unmount();
			setCx(null);
		};
	}, [projectId]);

	if (cx == null) {
		return (
			<main className="bg-base-100 flex h-screen items-center justify-center">
				<p className="text-base-500 text-sm tracking-wide">Loading…</p>
			</main>
		);
	}

	return <ReactEditorCx.Provider value={cx}>{children}</ReactEditorCx.Provider>;
};

export function useEditorCx(): EditorCx {
	const cx = React.useContext(ReactEditorCx);
	if (cx == null) {
		throw new Error('useEditorCx must be used within EditorCxProvider');
	}
	return cx;
}
