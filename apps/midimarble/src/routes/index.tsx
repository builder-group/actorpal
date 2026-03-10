import { createFileRoute } from '@tanstack/react-router';
import { EditorClient } from '@/modules/editor';

export const Route = createFileRoute('/')({ component: RouteComponent });

function RouteComponent() {
	return <EditorClient />;
}
