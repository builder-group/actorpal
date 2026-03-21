import {
	Button,
	Form,
	Host,
	HStack,
	Image,
	Picker,
	Section,
	Spacer,
	Text,
	Toggle
} from '@expo/ui/swift-ui';
import {
	background,
	buttonStyle,
	clipShape,
	contentShape,
	foregroundStyle,
	frame,
	pickerStyle,
	shapes,
	tag,
	tint
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { Alert, Linking } from 'react-native';
import { useTheme } from '@/components';
import {
	useNotificationPermission,
	useSettingsCx,
	type TThemePreference
} from '@/features/settings';
import { useTimerCx } from '@/features/timer';

const Screen: React.FC = () => {
	const { tokens } = useTheme();
	const router = useRouter();
	const settingsCx = useSettingsCx();
	const timerCx = useTimerCx();
	const { isAllowed: notificationsAllowed } = useNotificationPermission();
	const themePreference = useCompute(settingsCx.$settings, ({ value }) => value.appearance.theme);
	const keepScreenAwake = useCompute(
		settingsCx.$settings,
		({ value }) => value.timer.keepScreenAwake
	);

	// MARK: - Actions

	const handleClearRecents = (): void => {
		Alert.alert('Clear Recents', 'Remove all recent timer configurations?', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Clear', style: 'destructive', onPress: () => timerCx.clearRecents() }
		]);
	};

	const handleResetApp = (): void => {
		Alert.alert(
			'Reset App',
			'This will reset all timer settings, recents, and preferences to their defaults.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Reset',
					style: 'destructive',
					onPress: () => {
						timerCx.reset();
						settingsCx.reset();
					}
				}
			]
		);
	};

	// MARK: - UI

	return (
		<Host style={{ flex: 1 }}>
			<Form>
				<Section title="APP">
					<HStack spacing={8} alignment="center" modifiers={[contentShape(shapes.rectangle())]}>
						<Image
							systemName="circle.lefthalf.filled"
							color="white"
							size={18}
							modifiers={[
								frame({ width: 28, height: 28 }),
								background(tokens.base600, shapes.roundedRectangle({ cornerRadius: 8 })),
								clipShape('roundedRectangle', 8)
							]}
						/>
						<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
							Theme
						</Text>
						<Spacer />
						<Picker
							selection={themePreference}
							onSelectionChange={(value) =>
								settingsCx.update({ appearance: { theme: value as TThemePreference } })
							}
							modifiers={[pickerStyle('menu'), frame({ height: 22 }), tint(tokens.base500)]}
						>
							<Text modifiers={[tag('system')]}>System</Text>
							<Text modifiers={[tag('light')]}>Light</Text>
							<Text modifiers={[tag('dark')]}>Dark</Text>
						</Picker>
					</HStack>
					<Button onPress={() => router.push('/settings/about')} modifiers={[buttonStyle('plain')]}>
						<HStack spacing={8} alignment="center" modifiers={[contentShape(shapes.rectangle())]}>
							<Image
								systemName="info.circle"
								color="white"
								size={18}
								modifiers={[
									frame({ width: 28, height: 28 }),
									background(tokens.base600, shapes.roundedRectangle({ cornerRadius: 8 })),
									clipShape('roundedRectangle', 8)
								]}
							/>
							<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
								About
							</Text>
							<Spacer />
							<Image systemName="chevron.right" size={14} color={tokens.base500} />
						</HStack>
					</Button>
				</Section>

				<Section
					title="PERMISSION"
					footer={
						<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base500 })]}>
							Used to alert you when a timer ends while Kairos is in the background or your phone is
							locked.
						</Text>
					}
				>
					<Button
						onPress={() => Linking.openSettings().catch(() => {})}
						modifiers={[buttonStyle('plain')]}
					>
						<HStack spacing={8} alignment="center" modifiers={[contentShape(shapes.rectangle())]}>
							<Image
								systemName="bell.fill"
								color="white"
								size={18}
								modifiers={[
									frame({ width: 28, height: 28 }),
									background(tokens.base600, shapes.roundedRectangle({ cornerRadius: 8 })),
									clipShape('roundedRectangle', 8)
								]}
							/>
							<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
								Notifications
							</Text>
							<Spacer />
							<Image
								systemName={
									notificationsAllowed ? 'checkmark.circle.fill' : 'exclamationmark.circle.fill'
								}
								size={18}
								color={notificationsAllowed ? tokens.success : tokens.warning}
							/>
							<Image systemName="chevron.right" size={14} color={tokens.base500} />
						</HStack>
					</Button>
				</Section>

				<Section
					title="TIMER"
					footer={
						<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base500 })]}>
							Keeps the screen on while a timer is running.
						</Text>
					}
				>
					<Toggle
						isOn={keepScreenAwake}
						label="Keep Screen Awake"
						onIsOnChange={(value) => settingsCx.update({ timer: { keepScreenAwake: value } })}
					/>
				</Section>

				<Section title="DATA">
					<Button onPress={handleClearRecents} modifiers={[buttonStyle('plain')]}>
						<HStack spacing={8} alignment="center" modifiers={[contentShape(shapes.rectangle())]}>
							<Image
								systemName="clock.arrow.trianglehead.counterclockwise.rotate.90"
								color="white"
								size={18}
								modifiers={[
									frame({ width: 28, height: 28 }),
									background(tokens.warning, shapes.roundedRectangle({ cornerRadius: 8 })),
									clipShape('roundedRectangle', 8)
								]}
							/>
							<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.warning })]}>
								Clear Recents
							</Text>
							<Spacer />
							<Image systemName="chevron.right" size={14} color={tokens.base500} />
						</HStack>
					</Button>

					<Button onPress={handleResetApp} modifiers={[buttonStyle('plain')]}>
						<HStack spacing={8} alignment="center" modifiers={[contentShape(shapes.rectangle())]}>
							<Image
								systemName="arrow.counterclockwise.circle.fill"
								color="white"
								size={18}
								modifiers={[
									frame({ width: 28, height: 28 }),
									background(tokens.danger, shapes.roundedRectangle({ cornerRadius: 8 })),
									clipShape('roundedRectangle', 8)
								]}
							/>
							<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.danger })]}>
								Reset App
							</Text>
							<Spacer />
							<Image systemName="chevron.right" size={14} color={tokens.base500} />
						</HStack>
					</Button>
				</Section>
			</Form>
		</Host>
	);
};

export default Screen;
