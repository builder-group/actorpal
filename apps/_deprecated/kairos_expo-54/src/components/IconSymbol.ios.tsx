import { SymbolView, type SymbolViewProps, type SymbolWeight } from 'expo-symbols';
import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

export const IconSymbol: React.FC<TIconSymbolProps> = (props) => {
	const { name, size = 24, color, style, weight = 'regular' } = props;

	return (
		<SymbolView
			weight={weight}
			tintColor={color}
			resizeMode="scaleAspectFit"
			name={name}
			style={[{ width: size, height: size }, style]}
		/>
	);
};

interface TIconSymbolProps {
	name: SymbolViewProps['name'];
	size?: number;
	color: string;
	style?: StyleProp<ViewStyle>;
	weight?: SymbolWeight;
}
