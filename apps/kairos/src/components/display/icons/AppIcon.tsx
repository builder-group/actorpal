import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, type SymbolViewProps, type SymbolWeight } from 'expo-symbols';
import React, { type ComponentProps } from 'react';
import {
	Platform,
	View,
	type OpaqueColorValue,
	type StyleProp,
	type ViewStyle
} from 'react-native';

export const AppIcon: React.FC<TAppIconProps> = (props) => {
	const { ios, fallback, size = 18, color, style, weight = 'regular' } = props;

	if (Platform.OS === 'ios') {
		return (
			<View style={style}>
				<SymbolView
					name={ios}
					tintColor={color}
					weight={weight}
					resizeMode="scaleAspectFit"
					style={{ width: size, height: size }}
				/>
			</View>
		);
	}

	return (
		<View style={style}>
			<MaterialIcons name={fallback} size={size} color={color} />
		</View>
	);
};

export interface TAppIconProps {
	ios: SymbolViewProps['name'];
	fallback: ComponentProps<typeof MaterialIcons>['name'];
	size?: number;
	color: string | OpaqueColorValue;
	style?: StyleProp<ViewStyle>;
	weight?: SymbolWeight;
}

export interface TNamedAppIconProps {
	size?: number;
	color: string | OpaqueColorValue;
	style?: StyleProp<ViewStyle>;
	weight?: SymbolWeight;
}
