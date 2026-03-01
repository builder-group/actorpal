import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import { Animated, Pressable } from 'react-native';
import { useTheme } from '../provider';

export const ThemeToggle: React.FC<TThemeToggleProps> = (props) => {
	const {
		value,
		onChange,
		trackWidth = 80,
		trackHeight = 40,
		trackInset,
		trackBorderWidth = 1,
		thumbBorderWidth = 1,
		thumbSize = 32
	} = props;
	const { theme, toggleTheme, tokens } = useTheme();
	const progress = React.useRef(new Animated.Value(theme === 'dark' ? 1 : 0)).current;
	const rotate = React.useRef(new Animated.Value(0)).current;

	const isActive = value ?? theme === 'dark';
	const resolvedTrackBorderWidth = Math.max(trackBorderWidth, 0);
	const resolvedThumbBorderWidth = Math.max(thumbBorderWidth, 0);
	const resolvedThumbSize = Math.max(thumbSize, 16);
	const resolvedTrackHeight = Math.max(
		trackHeight,
		resolvedThumbSize + resolvedTrackBorderWidth * 2
	);
	const resolvedTrackWidth = Math.max(trackWidth, resolvedThumbSize + resolvedTrackBorderWidth * 2);
	const trackInnerHeight = Math.max(resolvedTrackHeight - resolvedTrackBorderWidth * 2, 0);
	const trackInnerWidth = Math.max(resolvedTrackWidth - resolvedTrackBorderWidth * 2, 0);
	const maxInset = Math.max(
		Math.min((trackInnerHeight - resolvedThumbSize) / 2, (trackInnerWidth - resolvedThumbSize) / 2),
		0
	);
	const resolvedTrackInset = Math.max(Math.min(trackInset ?? maxInset, maxInset), 0);
	const thumbTravel = Math.max(trackInnerWidth - resolvedTrackInset * 2 - resolvedThumbSize, 0);
	const iconSize = Math.max(Math.floor(resolvedThumbSize * 0.5), 14);

	// MARK: - Actions

	const animateIcon = React.useCallback(() => {
		Animated.sequence([
			Animated.timing(rotate, {
				toValue: 45,
				duration: 120,
				useNativeDriver: true
			}),
			Animated.timing(rotate, {
				toValue: 0,
				duration: 120,
				useNativeDriver: true
			})
		]).start();
	}, [rotate]);

	const handlePress = React.useCallback(() => {
		if (onChange != null) {
			onChange(!isActive);
		} else {
			toggleTheme();
		}

		animateIcon();
	}, [animateIcon, isActive, onChange, toggleTheme]);

	// MARK: - Effects

	React.useEffect(() => {
		Animated.spring(progress, {
			toValue: isActive ? 1 : 0,
			damping: 16,
			stiffness: 190,
			mass: 0.5,
			useNativeDriver: true
		}).start();
	}, [isActive, progress]);

	// MARK: - UI

	return (
		<Pressable
			onPress={handlePress}
			accessibilityRole="switch"
			accessibilityState={{ checked: isActive }}
			style={{
				width: resolvedTrackWidth,
				height: resolvedTrackHeight,
				borderWidth: resolvedTrackBorderWidth
			}}
			className="border-base-200 bg-base-100 relative rounded-full"
		>
			<Animated.View
				style={{
					position: 'absolute',
					top: resolvedTrackInset,
					bottom: resolvedTrackInset,
					left: resolvedTrackInset,
					right: resolvedTrackInset
				}}
				className="flex-row items-center justify-between"
			>
				<Animated.View
					style={{ width: resolvedThumbSize, height: resolvedThumbSize }}
					className="items-center justify-center"
				>
					<Feather name="sun" size={iconSize} color={tokens.base500} />
				</Animated.View>
				<Animated.View
					style={{ width: resolvedThumbSize, height: resolvedThumbSize }}
					className="items-center justify-center"
				>
					<Feather name="moon" size={iconSize} color={tokens.base500} />
				</Animated.View>
			</Animated.View>

			<Animated.View
				style={[
					{
						position: 'absolute',
						top: resolvedTrackInset,
						left: resolvedTrackInset,
						width: resolvedThumbSize,
						height: resolvedThumbSize,
						borderWidth: resolvedThumbBorderWidth
					},
					{
						transform: [
							{
								translateX: progress.interpolate({
									inputRange: [0, 1],
									outputRange: [0, thumbTravel]
								})
							}
						]
					}
				]}
				className="border-base-200 bg-base-0 items-center justify-center rounded-full"
			>
				<Animated.View
					style={{
						transform: [
							{
								rotate: rotate.interpolate({
									inputRange: [0, 45],
									outputRange: ['0deg', '45deg']
								})
							},
							{
								scale: progress.interpolate({
									inputRange: [0, 1],
									outputRange: [0.96, 1]
								})
							}
						]
					}}
				>
					<Feather name={isActive ? 'moon' : 'sun'} size={iconSize} color={tokens.base900} />
				</Animated.View>
			</Animated.View>
		</Pressable>
	);
};

interface TThemeToggleProps {
	value?: boolean;
	onChange?: (value: boolean) => void;
	trackWidth?: number;
	trackHeight?: number;
	trackInset?: number;
	trackBorderWidth?: number;
	thumbBorderWidth?: number;
	thumbSize?: number;
}
