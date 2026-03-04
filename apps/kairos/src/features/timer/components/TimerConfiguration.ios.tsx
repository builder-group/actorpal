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
	disabled,
	frame,
	listSectionSpacing,
	multilineTextAlignment,
	tag,
	textFieldStyle
} from '@expo/ui/swift-ui/modifiers';
import React from 'react';

type TWhenTimerEnds = 'radar' | 'bell';
type TInterval = 'off' | 'every-minute';

export const TimerConfiguration: React.FC = () => {
	const [hideTimer, setHideTimer] = React.useState(false);
	const [timerLabel, setTimerLabel] = React.useState('Timer');
	const [whenTimerEnds, setWhenTimerEnds] = React.useState<TWhenTimerEnds>('radar');
	const [interval, setInterval] = React.useState<TInterval>('off');

	return (
		<Host matchContents useViewportSizeMeasurement>
			<Form modifiers={[listSectionSpacing('compact')]}>
				<Section>
					<LabeledContent label="Label">
						<TextField
							defaultValue={timerLabel}
							placeholder="Timer"
							onChangeText={setTimerLabel}
							modifiers={[
								textFieldStyle('plain'),
								frame({ width: 140, alignment: 'trailing' }),
								multilineTextAlignment('trailing')
							]}
						/>
					</LabeledContent>

					<Picker
						label="When Timer Ends"
						selection={whenTimerEnds}
						onSelectionChange={(value) => setWhenTimerEnds(value as TWhenTimerEnds)}
						modifiers={[disabled(true)]}
					>
						<Text modifiers={[tag('radar')]}>Radar</Text>
						<Text modifiers={[tag('bell')]}>Bell</Text>
					</Picker>

					<Toggle isOn={hideTimer} label="Hide Timers" onIsOnChange={setHideTimer} />

					<Picker
						label="Interval"
						selection={interval}
						onSelectionChange={(value) => setInterval(value as TInterval)}
						modifiers={[disabled(true)]}
					>
						<Text modifiers={[tag('off')]}>Off</Text>
						<Text modifiers={[tag('every-minute')]}>Every Minute</Text>
					</Picker>
				</Section>
			</Form>
		</Host>
	);
};
