import { createFileRoute } from '@tanstack/react-router';
import { MidiViewerV3 } from '@/modules/midi-v3';

export const Route = createFileRoute('/midi-v3')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="h-screen w-screen overflow-hidden">
			<MidiViewerV3 />
		</div>
	);
}
