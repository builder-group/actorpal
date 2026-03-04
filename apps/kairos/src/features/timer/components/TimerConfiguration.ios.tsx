import {
	Form,
	Host,
	LabeledContent,
	Picker,
	Section,
	Text,
	TextField,
	Toggle
} from '@expo/ui/swift-ui';
import {
	frame,
	listSectionSpacing,
	multilineTextAlignment,
	tag,
	textFieldStyle
} from '@expo/ui/swift-ui/modifiers';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { useTimerCx } from '../TimerCx';

export const TimerConfiguration: React.FC = () => {
	const cx = useTimerCx();
	const label = useCompute(cx.$config, ({ value }) => value.label);
	const sound = useCompute(cx.$config, ({ value }) => value.sound);
	const hideTimer = useCompute(cx.$config, ({ value }) => value.hideTimer);

	return (
		<Host matchContents useViewportSizeMeasurement>
			<Form modifiers={[listSectionSpacing('compact')]}>
				<Section>
					<LabeledContent label="Label">
						<TextField
							defaultValue={label}
							placeholder="Timer"
							onChangeText={(v) => {
								cx.$config.set((c) => ({ ...c, label: v }));
							}}
							modifiers={[
								textFieldStyle('plain'),
								frame({ width: 140, alignment: 'trailing' }),
								multilineTextAlignment('trailing')
							]}
						/>
					</LabeledContent>

					<Picker
						label="When Timer Ends"
						selection={sound}
						onSelectionChange={(v) => {
							cx.$config.set((c) => ({ ...c, sound: v as 'radar' | 'bell' }));
						}}
					>
						<Text modifiers={[tag('radar')]}>Radar</Text>
						<Text modifiers={[tag('bell')]}>Bell</Text>
					</Picker>

					<Toggle
						isOn={hideTimer}
						label="Hide Timers"
						onIsOnChange={(v) => {
							cx.$config.set((c) => ({ ...c, hideTimer: v }));
						}}
					/>
				</Section>
			</Form>
		</Host>
	);
};
