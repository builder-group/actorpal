import { createFileRoute } from '@tanstack/react-router';
import { ProjectPicker } from '@/modules/projects/components/ProjectPicker';

export const Route = createFileRoute('/')({ component: RouteComponent });

function RouteComponent() {
	return <ProjectPicker />;
}
