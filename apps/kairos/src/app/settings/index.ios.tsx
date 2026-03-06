import {
	Button,
	Form,
	Host,
	HStack,
	Image,
	List,
	Picker,
	Section,
	Spacer,
	Text
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
import { Link } from 'expo-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { Alert } from 'react-native';
import { useTheme } from '@/components';
import { useSettingsCx, type TThemePreference } from '@/features/settings';
import { useTimerCx } from '@/features/timer';

const Screen: React.FC = () => {
	const { tokens } = useTheme();
	const settingsCx = useSettingsCx();
	const timerCx = useTimerCx();
	const themePreference = useCompute(settingsCx.$settings, ({ value }) => value.appearance.theme);

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
					<List>
						<Link href="/settings/about" asChild>
							<Button modifiers={[buttonStyle('plain')]}>
								<HStack
									spacing={8}
									alignment="center"
									modifiers={[contentShape(shapes.rectangle())]}
								>
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
						</Link>
					</List>
				</Section>

				<Section title="APPEARANCE">
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
							modifiers={[pickerStyle('menu'), tint(tokens.base500)]}
						>
							<Text modifiers={[tag('system')]}>System</Text>
							<Text modifiers={[tag('light')]}>Light</Text>
							<Text modifiers={[tag('dark')]}>Dark</Text>
						</Picker>
					</HStack>
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
