import { Button, Form, Host, HStack, Image, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
	background,
	buttonStyle,
	clipShape,
	contentShape,
	foregroundStyle,
	frame,
	shapes
} from '@expo/ui/swift-ui/modifiers';
import { Image as ExpoImage } from 'expo-image';
import { Link } from 'expo-router';
import React from 'react';
import { Text as RNText, ScrollView, View } from 'react-native';
import { useTheme } from '@/components';
import { appConfig } from '@/environment';

const FeedbackSubject = {
	general: 'Feedback',
	feature: 'Feature Request',
	bug: 'Bug Report'
} as const;

const Screen: React.FC = () => {
	const { tokens } = useTheme();
	const appStoreURL = appConfig.links.appStore;

	return (
		<ScrollView
			className="dark:bg-base-0 bg-base-50 flex-1"
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			<View className="items-center px-6 pt-8 pb-6">
				<ExpoImage
					source={require('@/assets/images/icon.png')}
					style={{ width: 96, height: 96, borderRadius: 22 }}
				/>
				<RNText
					className="mt-5 text-center text-3xl font-semibold"
					style={{ color: tokens.base900 }}
				>
					{appConfig.name}
				</RNText>
				<RNText
					className="mt-3 text-center"
					style={{ color: tokens.base900, fontSize: 16, lineHeight: 22 }}
				>
					Random Interval Timer
				</RNText>
				<RNText
					className="mt-1 text-center"
					style={{ color: tokens.base500, fontSize: 16, lineHeight: 22 }}
				>
					We&apos;d love to hear your feedback!
				</RNText>
			</View>

			<Host matchContents useViewportSizeMeasurement style={{ width: '100%' }}>
				<Form>
					<Section>
						<Link href={appConfig.support.mailto(FeedbackSubject.general) as any} asChild>
							<Button modifiers={[buttonStyle('plain')]}>
								<HStack
									spacing={8}
									alignment="center"
									modifiers={[contentShape(shapes.rectangle())]}
								>
									<Image
										systemName="envelope.fill"
										color="white"
										size={18}
										modifiers={[
											frame({ width: 28, height: 28 }),
											background(tokens.primary, shapes.roundedRectangle({ cornerRadius: 8 })),
											clipShape('roundedRectangle', 8)
										]}
									/>
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										Feedback
									</Text>
									<Spacer />
									<Image systemName="chevron.right" size={14} color={tokens.base500} />
								</HStack>
							</Button>
						</Link>

						<Link href={appConfig.support.mailto(FeedbackSubject.feature) as any} asChild>
							<Button modifiers={[buttonStyle('plain')]}>
								<HStack
									spacing={8}
									alignment="center"
									modifiers={[contentShape(shapes.rectangle())]}
								>
									<Image
										systemName="gift.fill"
										color="white"
										size={18}
										modifiers={[
											frame({ width: 28, height: 28 }),
											background('#FF2D55', shapes.roundedRectangle({ cornerRadius: 8 })),
											clipShape('roundedRectangle', 8)
										]}
									/>
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										Request a Feature
									</Text>
									<Spacer />
									<Image systemName="chevron.right" size={14} color={tokens.base500} />
								</HStack>
							</Button>
						</Link>

						<Link href={appConfig.support.mailto(FeedbackSubject.bug) as any} asChild>
							<Button modifiers={[buttonStyle('plain')]}>
								<HStack
									spacing={8}
									alignment="center"
									modifiers={[contentShape(shapes.rectangle())]}
								>
									<Image
										systemName="ladybug.fill"
										color="white"
										size={18}
										modifiers={[
											frame({ width: 28, height: 28 }),
											background(tokens.danger, shapes.roundedRectangle({ cornerRadius: 8 })),
											clipShape('roundedRectangle', 8)
										]}
									/>
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										Report a Bug
									</Text>
									<Spacer />
									<Image systemName="chevron.right" size={14} color={tokens.base500} />
								</HStack>
							</Button>
						</Link>
					</Section>

					<Section>
						{appStoreURL != null ? (
							<Link href={appStoreURL as any} asChild>
								<Button modifiers={[buttonStyle('plain')]}>
									<HStack
										spacing={8}
										alignment="center"
										modifiers={[contentShape(shapes.rectangle())]}
									>
										<Image
											systemName="apple.logo"
											color="white"
											size={18}
											modifiers={[
												frame({ width: 28, height: 28 }),
												background(tokens.base800, shapes.roundedRectangle({ cornerRadius: 8 })),
												clipShape('roundedRectangle', 8)
											]}
										/>
										<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
											App Store
										</Text>
										<Spacer />
										<Image systemName="arrow.up.forward" size={14} color={tokens.base500} />
									</HStack>
								</Button>
							</Link>
						) : null}

						<Link href={appConfig.links.website as any} asChild>
							<Button modifiers={[buttonStyle('plain')]}>
								<HStack
									spacing={8}
									alignment="center"
									modifiers={[contentShape(shapes.rectangle())]}
								>
									<Image
										systemName="safari.fill"
										color="white"
										size={18}
										modifiers={[
											frame({ width: 28, height: 28 }),
											background(tokens.primary, shapes.roundedRectangle({ cornerRadius: 8 })),
											clipShape('roundedRectangle', 8)
										]}
									/>
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										Website
									</Text>
									<Spacer />
									<Image systemName="arrow.up.forward" size={14} color={tokens.base500} />
								</HStack>
							</Button>
						</Link>

						<Link href={appConfig.links.github as any} asChild>
							<Button modifiers={[buttonStyle('plain')]}>
								<HStack
									spacing={8}
									alignment="center"
									modifiers={[contentShape(shapes.rectangle())]}
								>
									<Image
										systemName="chevron.left.slash.chevron.right"
										color="white"
										size={14}
										modifiers={[
											frame({ width: 28, height: 28 }),
											background(tokens.base600, shapes.roundedRectangle({ cornerRadius: 8 })),
											clipShape('roundedRectangle', 8)
										]}
									/>
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										GitHub
									</Text>
									<Spacer />
									<Image systemName="arrow.up.forward" size={14} color={tokens.base500} />
								</HStack>
							</Button>
						</Link>
					</Section>

					<Section>
						<Link href={appConfig.links.privacyPolicy as any} asChild>
							<Button modifiers={[buttonStyle('plain')]}>
								<HStack
									spacing={8}
									alignment="center"
									modifiers={[contentShape(shapes.rectangle())]}
								>
									<Image
										systemName="hand.raised.fill"
										color="white"
										size={18}
										modifiers={[
											frame({ width: 28, height: 28 }),
											background(tokens.primary, shapes.roundedRectangle({ cornerRadius: 8 })),
											clipShape('roundedRectangle', 8)
										]}
									/>
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										Privacy Policy
									</Text>
									<Spacer />
									<Image systemName="arrow.up.forward" size={14} color={tokens.base500} />
								</HStack>
							</Button>
						</Link>
					</Section>
				</Form>
			</Host>

			<View className="items-center px-6 pt-2 pb-6">
				<RNText className="text-base-400 dark:text-base-500 text-base">
					Version {appConfig.version}
				</RNText>
				<RNText className="text-base-300 dark:text-base-600 mt-1 text-base">
					© 2025 builder.group
				</RNText>
			</View>
		</ScrollView>
	);
};

export default Screen;
