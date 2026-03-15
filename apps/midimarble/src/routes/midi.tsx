import { createFileRoute } from '@tanstack/react-router';
import { MidiViewer } from '@/modules/midi';

export const Route = createFileRoute('/midi')({ component: RouteComponent });

function RouteComponent() {
	return (
		<div className="h-screen w-screen overflow-hidden">
			<MidiViewer />
		</div>
	);
}
