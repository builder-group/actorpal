import {
	Divider,
	Host,
	HStack,
	Image,
	LabeledContent,
	Picker,
	Text,
	TextField,
	Toggle,
	VStack,
	type TextFieldRef
} from '@expo/ui/swift-ui';
import {
	background,
	clipShape,
	foregroundStyle,
	frame,
	multilineTextAlignment,
	padding,
	pickerStyle,
	shapes,
	submitLabel,
	tag,
	textFieldStyle,
	tint
} from '@expo/ui/swift-ui/modifiers';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/components';
import { useAudioCx } from '@/features/audio';
import { TimerCx, type TTimerEndMode } from '../TimerCx';

export const TimerConfiguration: React.FC<TTimerConfigurationProps> = (props) => {
	const { cx } = props;
	const { theme, tokens } = useTheme();
	const audioCx = useAudioCx();

	const labelRef = React.useRef<TextFieldRef | null>(null);
	const endAfterRef = React.useRef<TextFieldRef | null>(null);
	const [isLabelFocused, setIsLabelFocused] = React.useState(false);
	const [isEndAfterFocused, setIsEndAfterFocused] = React.useState(false);

	const label = useCompute(cx.$config, ({ value }) => value.label);
	const sound = useCompute(cx.$config, ({ value }) => value.sound);
	const hideTimeDisplay = useCompute(cx.$config, ({ value }) => value.hideTimeDisplay);
	const endMode = useCompute(cx.$config, ({ value }) => value.endMode);
	const endAfterSeconds = useCompute(cx.$config, ({ value }) => value.endAfterSeconds);
	const availableSounds = useCompute(audioCx.$sounds, ({ value }) => value);
	const canClearLabel = label.length > 0 && isLabelFocused;

	const rowHeight = frame({ minHeight: 52 });
	const baseRowPadding = padding({ leading: 16, trailing: 20 });
	const pickerRowPadding = padding({ leading: 16, trailing: 8 });
	const dividerInsets = padding({ leading: 16, trailing: 20 });

	// MARK: - Actions

	const setLabelInputText = React.useCallback((value: string) => {
		void labelRef.current?.setText(value).catch(() => undefined);
	}, []);

	const setEndAfterInputText = React.useCallback((value: string) => {
		void endAfterRef.current?.setText(value).catch(() => undefined);
	}, []);

	const handleClearLabel = React.useCallback(() => {
		cx.$config.set((c) => ({ ...c, label: '' }));
		setLabelInputText('');
	}, [cx, setLabelInputText]);

	const handleLabelFocusChange = React.useCallback(
		(focused: boolean) => {
			setIsLabelFocused(focused);
			if (!focused) {
				return;
			}
			const cursorIndex = label.length;
			requestAnimationFrame(() => {
				void labelRef.current?.setSelection(cursorIndex, cursorIndex).catch(() => undefined);
			});
		},
		[label.length]
	);

	const handleEndAfterChange = React.useCallback(
		(value: string) => {
			const digitsOnly = value.replace(/\D+/g, '');
			if (digitsOnly !== value) {
				setEndAfterInputText(digitsOnly);
			}
			if (!digitsOnly.length) {
				return;
			}
			const n = Number(digitsOnly);
			if (!Number.isNaN(n) && n >= 0) {
				cx.$config.set((c) => ({ ...c, endAfterSeconds: n }));
			}
		},
		[cx, setEndAfterInputText]
	);

	const handleEndAfterFocusChange = React.useCallback(
		(focused: boolean) => {
			setIsEndAfterFocused(focused);
			if (focused) {
				const cursorIndex = String(endAfterSeconds).length;
				requestAnimationFrame(() => {
					void endAfterRef.current?.setSelection(cursorIndex, cursorIndex).catch(() => undefined);
				});
				return;
			}
			setEndAfterInputText(String(endAfterSeconds));
		},
		[endAfterSeconds, setEndAfterInputText]
	);

	const handleEndAfterSubmit = React.useCallback(() => {
		void endAfterRef.current?.blur();
	}, []);

	// MARK: - Effects

	React.useEffect(() => {
		if (!isEndAfterFocused) {
			setEndAfterInputText(String(endAfterSeconds));
		}
	}, [endAfterSeconds, isEndAfterFocused, setEndAfterInputText]);

	React.useEffect(() => {
		if (!isLabelFocused) {
			setLabelInputText(label);
		}
	}, [label, isLabelFocused, setLabelInputText]);

	// MARK: - UI

	return (
		<View className="px-4 py-8">
			<Host matchContents>
				{/* We intentionally avoid Form here.
				    Form is list-backed and expands/collapses based on container constraints, which makes
				    embedding between TimerInput and Recents brittle. We considered:
				    1) fixed-height Form (works but rigid),
				    2) dynamic Form sizing (not reliable with list-backed layout),
				    3) custom grouped card rows (chosen: predictable sizing + form-like look). */}
				<VStack
					spacing={0}
					modifiers={[
						background(
							theme === 'dark' ? tokens.base50 : tokens.base0,
							shapes.roundedRectangle({ cornerRadius: 24 })
						),
						clipShape('roundedRectangle', 24)
					]}
				>
					<LabeledContent label="Label" modifiers={[baseRowPadding, rowHeight]}>
						<HStack spacing={8} alignment="center">
							<TextField
								ref={labelRef}
								defaultValue={label}
								placeholder="Timer"
								onChangeText={(v) => {
									cx.$config.set((c) => ({ ...c, label: v }));
								}}
								onChangeFocus={handleLabelFocusChange}
								onSubmit={() => {
									void labelRef.current?.blur();
								}}
								modifiers={[
									textFieldStyle('plain'),
									submitLabel('done'),
									frame({ width: canClearLabel ? 120 : 140, alignment: 'trailing' }),
									multilineTextAlignment('trailing')
								]}
							/>
							{canClearLabel && (
								<Image
									systemName="xmark.circle.fill"
									size={18}
									color={tokens.base500}
									onPress={handleClearLabel}
								/>
							)}
						</HStack>
					</LabeledContent>

					<Divider modifiers={[dividerInsets]} />

					<LabeledContent label="Alarm Sound" modifiers={[pickerRowPadding, rowHeight]}>
						<Picker
							selection={sound}
							onSelectionChange={(v) => {
								const name = v as string;
								cx.$config.set((c) => ({ ...c, sound: name }));
								audioCx.play(name);
							}}
							modifiers={[
								pickerStyle('menu'),
								multilineTextAlignment('trailing'),
								foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
								tint(tokens.base500)
							]}
						>
							{availableSounds.map((name) => (
								<Text key={name} modifiers={[tag(name)]}>
									{name}
								</Text>
							))}
						</Picker>
					</LabeledContent>

					<Divider modifiers={[dividerInsets]} />

					<LabeledContent label="After Timer Ends" modifiers={[pickerRowPadding, rowHeight]}>
						<Picker
							selection={endMode}
							onSelectionChange={(v) => {
								cx.$config.set((c) => ({ ...c, endMode: v as TTimerEndMode }));
							}}
							modifiers={[
								pickerStyle('menu'),
								multilineTextAlignment('trailing'),
								foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
								tint(tokens.base500)
							]}
						>
							<Text modifiers={[tag('overtime')]}>Overtime</Text>
							<Text modifiers={[tag('stop')]}>Auto Stop</Text>
							<Text modifiers={[tag('loop')]}>Auto Repeat</Text>
						</Picker>
					</LabeledContent>

					{(endMode === 'loop' || endMode === 'stop') && (
						<>
							<Divider modifiers={[dividerInsets]} />
							<LabeledContent
								label={endMode === 'loop' ? 'Repeat after (s)' : 'Stop after (s)'}
								modifiers={[baseRowPadding, rowHeight]}
							>
								<TextField
									ref={endAfterRef}
									defaultValue={String(endAfterSeconds)}
									placeholder="5"
									onChangeText={handleEndAfterChange}
									onChangeFocus={handleEndAfterFocusChange}
									onSubmit={handleEndAfterSubmit}
									keyboardType="numbers-and-punctuation"
									modifiers={[
										textFieldStyle('plain'),
										submitLabel('done'),
										frame({ width: 60, alignment: 'trailing' }),
										multilineTextAlignment('trailing')
									]}
								/>
							</LabeledContent>
						</>
					)}

					<Divider modifiers={[dividerInsets]} />

					<Toggle
						isOn={hideTimeDisplay}
						label="Hide Time Display"
						onIsOnChange={(v) => {
							cx.$config.set((c) => ({ ...c, hideTimeDisplay: v }));
						}}
						modifiers={[baseRowPadding, rowHeight]}
					/>
				</VStack>
			</Host>
		</View>
	);
};

interface TTimerConfigurationProps {
	cx: TimerCx;
}
