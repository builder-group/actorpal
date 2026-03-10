import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { Runtime } from '@/modules/engine';

export class EditorCx {
	public readonly runtime: Runtime;
	private _container: HTMLDivElement | null = null;

	constructor() {
		this.runtime = new Runtime();
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

export const EditorCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const editorCx = new EditorCx();
		return [editorCx, () => editorCx.unmount()];
	}, []);

	return <ReactEditorCx.Provider value={cx}>{children}</ReactEditorCx.Provider>;
};

export function useEditorCx(): EditorCx {
	const cx = React.useContext(ReactEditorCx);
	if (cx == null) {
		throw new Error('useEditorCx must be used within EditorCxProvider');
	}
	return cx;
}
