import { createFileRoute } from '@tanstack/react-router';
import { MidiViewer } from '@/modules/midi-v2';

export const Route = createFileRoute('/midi-v2')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="h-screen w-screen overflow-hidden">
			<MidiViewer />
		</div>
	);
}
