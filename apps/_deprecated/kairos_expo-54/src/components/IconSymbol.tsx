// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type SymbolViewProps, type SymbolWeight } from 'expo-symbols';
import React, { type ComponentProps } from 'react';
import { type OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
	'house.fill': 'home',
	'paperplane.fill': 'send',
	'chevron.left.forwardslash.chevron.right': 'code',
	'chevron.right': 'chevron-right'
} as TIconMapping;

export const IconSymbol: React.FC<TIconSymbolProps> = (props) => {
	const { name, size = 24, color, style } = props;
	return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
};

interface TIconSymbolProps {
	name: TIconSymbolName;
	size?: number;
	color: string | OpaqueColorValue;
	style?: StyleProp<TextStyle>;
	weight?: SymbolWeight;
}

type TIconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type TIconSymbolName = keyof typeof MAPPING;
