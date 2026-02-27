import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import React, { type ComponentProps, type MouseEvent } from 'react';
import { GestureResponderEvent } from 'react-native';

export const ExternalLink: React.FC<TExternalLinkProps> = (props) => {
	const { href, ...rest } = props;

	const handlePress = React.useCallback(
		async (event: MouseEvent | GestureResponderEvent) => {
			if (process.env.EXPO_OS !== 'web') {
				// Prevent the default behavior of linking to the default browser on native.
				event.preventDefault();
				// Open the link in an in-app browser.
				await openBrowserAsync(href, {
					presentationStyle: WebBrowserPresentationStyle.AUTOMATIC
				});
			}
		},
		[href]
	);

	return <Link target="_blank" {...rest} href={href} onPress={handlePress} />;
};

type TExternalLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };
