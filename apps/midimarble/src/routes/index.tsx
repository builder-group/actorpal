import { createFileRoute } from '@tanstack/react-router';
import { Editor } from '@/modules/editor';

export const Route = createFileRoute('/')({ component: RouteComponent });

function RouteComponent() {
	return <Editor />;
}
