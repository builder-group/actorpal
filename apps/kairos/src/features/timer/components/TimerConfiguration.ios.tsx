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
import { Alert, Linking, View } from 'react-native';
import { useTheme } from '@/components';
import { useAudioCx } from '@/features/audio';
import { useNotificationPermission } from '@/features/settings';
import { previewEndSound, previewSessionSound } from '@/modules/alarm';
import { timerConfig } from '../config';
import { TimerCx, type TTimerBackgroundAlert } from '../TimerCx';

export const TimerConfiguration: React.FC<TTimerConfigurationProps> = (props) => {
	const { cx } = props;
	const { theme, tokens } = useTheme();
	const audioCx = useAudioCx();

	const labelRef = React.useRef<TextFieldRef | null>(null);
	const endAfterRef = React.useRef<TextFieldRef | null>(null);
	const [isLabelFocused, setIsLabelFocused] = React.useState(false);
	const [isEndAfterFocused, setIsEndAfterFocused] = React.useState(false);

	const label = useCompute(cx.$config, ({ value }) => value.label);
	const endSound = useCompute(cx.$config, ({ value }) => value.endSound);
	const countdownSound = useCompute(cx.$config, ({ value }) => value.countdownSound);
	const backgroundAlert = useCompute(cx.$config, ({ value }) => value.backgroundAlert);
	const hideTimeDisplay = useCompute(cx.$config, ({ value }) => value.hideTimeDisplay);
	const endMode = useCompute(cx.$config, ({ value }) => value.endMode);
	const endModeDelay = useCompute(cx.$config, ({ value }) =>
		value.endMode.type !== 'overtime' ? value.endMode.delaySeconds : 5
	);
	const availableSounds = useCompute(audioCx.$sounds, ({ value }) => value);
	const canClearLabel = label.length > 0 && isLabelFocused;
	const { isAllowed: notificationsAllowed } = useNotificationPermission();
	const hasNotificationWarning = backgroundAlert === 'notification' && !notificationsAllowed;

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

	const handleDelaySecondsChange = React.useCallback(
		(value: string) => {
			const digitsOnly = value.replace(/\D+/g, '');
			if (digitsOnly !== value) {
				setEndAfterInputText(digitsOnly);
			}
			if (!digitsOnly.length) {
				return;
			}
			const n = Number(digitsOnly);
			if (!Number.isNaN(n)) {
				cx.$config.set((c) => {
					if (c.endMode.type === 'overtime') return c;
					return { ...c, endMode: { ...c.endMode, delaySeconds: Math.max(1, n) } };
				});
			}
		},
		[cx, setEndAfterInputText]
	);

	const handleEndAfterFocusChange = React.useCallback(
		(focused: boolean) => {
			setIsEndAfterFocused(focused);
			if (focused) {
				const cursorIndex = String(endModeDelay).length;
				requestAnimationFrame(() => {
					void endAfterRef.current?.setSelection(cursorIndex, cursorIndex).catch(() => undefined);
				});
				return;
			}
			setEndAfterInputText(String(endModeDelay));
		},
		[endModeDelay, setEndAfterInputText]
	);

	const handleEndAfterSubmit = React.useCallback(() => {
		void endAfterRef.current?.blur();
	}, []);

	const showBackgroundAlertInfo = React.useCallback(() => {
		Alert.alert(
			'Background Alert',
			'Notification alerts you when done. Alarm plays your chosen sound even on silent, but keeps the app active and may use more battery.',
			[{ text: 'Got it', style: 'default' }]
		);
	}, []);

	const showNotificationWarning = React.useCallback(() => {
		Alert.alert(
			'Notifications Off',
			"Kairos won't be able to alert you when the timer ends. Enable notifications in Settings to fix this.",
			[
				{ text: 'Not Now', style: 'cancel' },
				{
					text: 'Open Settings',
					onPress: () => {
						void Linking.openSettings().catch(() => {});
					}
				}
			]
		);
	}, []);

	const showCountdownSoundInfo = React.useCallback(() => {
		Alert.alert('Countdown Sound', 'What you hear while the timer counts down.', [
			{ text: 'Got it', style: 'default' }
		]);
	}, []);

	const showAfterTimerEndsInfo = React.useCallback(() => {
		Alert.alert(
			'After Timer Ends',
			'Overtime counts up past zero. Auto Stop and Auto Repeat wait for the delay before stopping or restarting.',
			[{ text: 'Got it', style: 'default' }]
		);
	}, []);

	// MARK: - Effects

	React.useEffect(() => {
		if (!isEndAfterFocused) {
			setEndAfterInputText(String(endModeDelay));
		}
	}, [endModeDelay, isEndAfterFocused, setEndAfterInputText]);

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
							selection={endSound}
							onSelectionChange={(v) => {
								const name = v as string;
								cx.$config.set((c) => ({ ...c, endSound: name }));
								previewEndSound(name).catch(() => {});
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

					<LabeledContent
						label={
							<HStack spacing={6} alignment="center">
								<Text>Countdown Sound</Text>
								<Image
									systemName="info.circle"
									size={16}
									color={tokens.base400}
									onPress={showCountdownSoundInfo}
								/>
							</HStack>
						}
						modifiers={[pickerRowPadding, rowHeight]}
					>
						<Picker
							selection={countdownSound === null ? 'none' : countdownSound}
							onSelectionChange={(v) => {
								if (v === 'none') {
									cx.$config.set((c) => ({ ...c, countdownSound: null }));
								} else {
									const file = v as string;
									cx.$config.set((c) => ({ ...c, countdownSound: file }));
									previewSessionSound(file).catch(() => {});
								}
							}}
							modifiers={[
								pickerStyle('menu'),
								multilineTextAlignment('trailing'),
								foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
								tint(tokens.base500)
							]}
						>
							<Text modifiers={[tag('none')]}>None</Text>
							{timerConfig.countdownSounds.map(({ name, file }) => (
								<Text key={file} modifiers={[tag(file)]}>
									{name}
								</Text>
							))}
						</Picker>
					</LabeledContent>

					<Divider modifiers={[dividerInsets]} />

					<LabeledContent
						label={
							<HStack spacing={6} alignment="center">
								<Text>After Timer Ends</Text>
								<Image
									systemName="info.circle"
									size={16}
									color={tokens.base400}
									onPress={showAfterTimerEndsInfo}
								/>
							</HStack>
						}
						modifiers={[pickerRowPadding, rowHeight]}
					>
						<Picker
							selection={endMode.type}
							onSelectionChange={(v) => {
								const type = v as 'overtime' | 'stop' | 'loop';
								cx.$config.set((c) => ({
									...c,
									endMode:
										type === 'overtime'
											? { type: 'overtime' }
											: {
													type,
													delaySeconds: c.endMode.type !== 'overtime' ? c.endMode.delaySeconds : 5
												}
								}));
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

					{(endMode.type === 'loop' || endMode.type === 'stop') && (
						<>
							<Divider modifiers={[dividerInsets]} />
							<LabeledContent label={endMode.type === 'loop' ? 'Repeat Delay (s)' : 'Stop Delay (s)'} modifiers={[baseRowPadding, rowHeight]}>
								<TextField
									ref={endAfterRef}
									defaultValue={String(endModeDelay)}
									placeholder="5"
									onChangeText={handleDelaySecondsChange}
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

					<LabeledContent
						label={
							<HStack spacing={6} alignment="center">
								<Text>Background Alert</Text>
								<Image
									systemName="info.circle"
									size={16}
									color={tokens.base400}
									onPress={showBackgroundAlertInfo}
								/>
								{hasNotificationWarning && (
									<Image
										systemName="exclamationmark.triangle"
										size={16}
										color={tokens.warning}
										onPress={showNotificationWarning}
									/>
								)}
							</HStack>
						}
						modifiers={[pickerRowPadding, rowHeight]}
					>
						<Picker
							selection={backgroundAlert}
							onSelectionChange={(v) => {
								cx.$config.set((c) => ({ ...c, backgroundAlert: v as TTimerBackgroundAlert }));
							}}
							modifiers={[
								pickerStyle('menu'),
								multilineTextAlignment('trailing'),
								foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
								tint(tokens.base500)
							]}
						>
							<Text modifiers={[tag('notification')]}>Notification</Text>
							<Text modifiers={[tag('alarm')]}>Alarm</Text>
						</Picker>
					</LabeledContent>

					<Divider modifiers={[dividerInsets]} />

					<Toggle
						isOn={hideTimeDisplay}
						label="Hide Timer"
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
