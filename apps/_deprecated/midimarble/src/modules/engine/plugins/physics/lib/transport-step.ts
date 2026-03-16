import { tickToStep } from '../../midi';
import type { TPhysicsApp } from '../types';

type TTransportStepAccess = {
	r: Pick<TPhysicsApp['r'], 'fixedTimeStepSeconds' | 'midiSong' | 'transport'>;
};

export function getTransportTargetStep(app: TTransportStepAccess): number {
	if (app.r.midiSong == null) {
		return 0;
	}

	return tickToStep(app.r.transport.playheadTick, app.r.midiSong, app.r.fixedTimeStepSeconds);
}
