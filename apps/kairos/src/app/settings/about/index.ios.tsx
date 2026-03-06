import { Button, Divider, Host, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
	background,
	buttonStyle,
	foregroundStyle,
	padding,
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
				<RNText className="text-base-900 dark:text-base-50 mt-5 text-center text-3xl font-semibold">
					{appConfig.name}
				</RNText>
				<RNText className="text-base-900 dark:text-base-50 mt-3 text-center text-lg">
					A reason to look up from your phone
				</RNText>
				<RNText className="text-base-400 dark:text-base-500 mt-1 text-center text-lg">
					We&apos;d love to hear your feedback!
				</RNText>
			</View>

			<Host matchContents useViewportSizeMeasurement style={{ width: '100%' }}>
				<VStack spacing={20} modifiers={[padding({ bottom: 24 })]}>
					<SectionCard>
							<Link href={appConfig.support.mailto(FeedbackSubject.general) as any} asChild>
								<Button modifiers={[buttonStyle('plain')]}>
									<HStack
										spacing={12}
										alignment="center"
										modifiers={[padding({ horizontal: 16, vertical: 12 })]}
									>
									<Image systemName="envelope.fill" size={22} color={tokens.primary} />
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										Feedback
									</Text>
									<Spacer />
									<Image systemName="chevron.right" size={14} color="#C7C7CC" />
								</HStack>
							</Button>
						</Link>
						<Divider modifiers={[padding({ leading: 56 })]} />

							<Link href={appConfig.support.mailto(FeedbackSubject.feature) as any} asChild>
								<Button modifiers={[buttonStyle('plain')]}>
									<HStack
										spacing={12}
										alignment="center"
										modifiers={[padding({ horizontal: 16, vertical: 12 })]}
									>
									<Image systemName="gift.fill" size={22} color="#FF2D55" />
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										Request a Feature
									</Text>
									<Spacer />
									<Image systemName="chevron.right" size={14} color="#C7C7CC" />
								</HStack>
							</Button>
						</Link>
						<Divider modifiers={[padding({ leading: 56 })]} />

							<Link href={appConfig.support.mailto(FeedbackSubject.bug) as any} asChild>
								<Button modifiers={[buttonStyle('plain')]}>
									<HStack
										spacing={12}
										alignment="center"
										modifiers={[padding({ horizontal: 16, vertical: 12 })]}
									>
									<Image systemName="ladybug.fill" size={22} color={tokens.danger} />
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										Report a Bug
									</Text>
									<Spacer />
									<Image systemName="chevron.right" size={14} color="#C7C7CC" />
								</HStack>
							</Button>
						</Link>
					</SectionCard>

					<SectionCard>
						{appStoreURL != null ? (
							<>
									<Link href={appStoreURL as any} asChild>
										<Button modifiers={[buttonStyle('plain')]}>
											<HStack
												spacing={12}
												alignment="center"
												modifiers={[padding({ horizontal: 16, vertical: 12 })]}
											>
											<Image systemName="apple.logo" size={22} color={tokens.base900} />
											<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
												App Store
											</Text>
											<Spacer />
											<Image systemName="arrow.up.forward" size={14} color="#C7C7CC" />
										</HStack>
									</Button>
								</Link>
								<Divider modifiers={[padding({ leading: 56 })]} />
							</>
						) : null}

							<Link href={appConfig.links.website as any} asChild>
								<Button modifiers={[buttonStyle('plain')]}>
									<HStack
										spacing={12}
										alignment="center"
										modifiers={[padding({ horizontal: 16, vertical: 12 })]}
									>
									<Image systemName="safari.fill" size={22} color={tokens.primary} />
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										Website
									</Text>
									<Spacer />
									<Image systemName="arrow.up.forward" size={14} color="#C7C7CC" />
								</HStack>
							</Button>
						</Link>
						<Divider modifiers={[padding({ leading: 56 })]} />

							<Link href={appConfig.links.github as any} asChild>
								<Button modifiers={[buttonStyle('plain')]}>
									<HStack
										spacing={12}
										alignment="center"
										modifiers={[padding({ horizontal: 16, vertical: 12 })]}
									>
									<Image
										systemName="chevron.left.forwardslash.chevron.right"
										size={22}
										color={tokens.base900}
									/>
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										GitHub
									</Text>
									<Spacer />
									<Image systemName="arrow.up.forward" size={14} color="#C7C7CC" />
								</HStack>
							</Button>
						</Link>
					</SectionCard>

					<SectionCard>
							<Link href={appConfig.links.privacyPolicy as any} asChild>
								<Button modifiers={[buttonStyle('plain')]}>
									<HStack
										spacing={12}
										alignment="center"
										modifiers={[padding({ horizontal: 16, vertical: 12 })]}
									>
									<Image systemName="hand.raised.fill" size={22} color={tokens.primary} />
									<Text modifiers={[foregroundStyle({ type: 'color', color: tokens.base900 })]}>
										Privacy Policy
									</Text>
									<Spacer />
									<Image systemName="arrow.up.forward" size={14} color="#C7C7CC" />
								</HStack>
							</Button>
						</Link>
					</SectionCard>
				</VStack>
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

const SectionCard: React.FC<TSectionCardProps> = (props) => {
	const { children } = props;
	const { tokens } = useTheme();

	return (
		<VStack
			spacing={0}
			modifiers={[
				background(tokens.base0, shapes.roundedRectangle({ cornerRadius: 26 })),
				padding({ horizontal: 16 })
			]}
		>
			{children}
		</VStack>
	);
};

interface TSectionCardProps {
	children: React.ReactNode;
}

export default Screen;
