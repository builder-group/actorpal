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
import { useAudioCx } from '@/features/audio';
import { TimerCx, type TTimerEndMode } from '../TimerCx';

export const TimerConfiguration: React.FC<TTimerConfigurationProps> = (props) => {
	const { cx } = props;
	const audioCx = useAudioCx();

	const label = useCompute(cx.$config, ({ value }) => value.label);
	const sound = useCompute(cx.$config, ({ value }) => value.sound);
	const hideTimer = useCompute(cx.$config, ({ value }) => value.hideTimer);
	const endMode = useCompute(cx.$config, ({ value }) => value.endMode);
	const endAfterSeconds = useCompute(cx.$config, ({ value }) => value.endAfterSeconds);
	const availableSounds = useCompute(audioCx.$sounds, ({ value }) => value);

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
						label="Alarm Sound"
						selection={sound}
						onSelectionChange={(v) => {
							const name = v as string;
							cx.$config.set((c) => ({ ...c, sound: name }));
							audioCx.play(name);
						}}
					>
						{availableSounds.map((name) => (
							<Text key={name} modifiers={[tag(name)]}>
								{name}
							</Text>
						))}
					</Picker>

					<Picker
						label="After Timer Ends"
						selection={endMode}
						onSelectionChange={(v) => {
							cx.$config.set((c) => ({ ...c, endMode: v as TTimerEndMode }));
						}}
					>
						<Text modifiers={[tag('overtime')]}>Overtime</Text>
						<Text modifiers={[tag('stop')]}>Auto Stop</Text>
						<Text modifiers={[tag('loop')]}>Auto Repeat</Text>
					</Picker>

					{(endMode === 'loop' || endMode === 'stop') && (
						<LabeledContent label={endMode === 'loop' ? 'Repeat after (s)' : 'Stop after (s)'}>
							<TextField
								defaultValue={String(endAfterSeconds)}
								placeholder="5"
								onChangeText={(v) => {
									const n = parseInt(v, 10);
									if (!isNaN(n) && n >= 0) {
										cx.$config.set((c) => ({ ...c, endAfterSeconds: n }));
									}
								}}
								modifiers={[
									textFieldStyle('plain'),
									frame({ width: 60, alignment: 'trailing' }),
									multilineTextAlignment('trailing')
								]}
							/>
						</LabeledContent>
					)}

					<Toggle
						isOn={hideTimer}
						label="Hide Timer"
						onIsOnChange={(v) => {
							cx.$config.set((c) => ({ ...c, hideTimer: v }));
						}}
					/>
				</Section>
			</Form>
		</Host>
	);
};

interface TTimerConfigurationProps {
	cx: TimerCx;
}
