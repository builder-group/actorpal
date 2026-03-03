import React from 'react';
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { cn } from '@/lib';

export const SegmentControl: React.FC<TSegmentControlProps> = (props) => {
	const { value, onValueChange, items, className, style, thumbInset = 3 } = props;

	const [width, setWidth] = React.useState(0);

	const selectedIndex = React.useMemo(
		() =>
			Math.max(
				0,
				items.findIndex((item) => item.key === value)
			),
		[items, value]
	);

	const slideAnimation = React.useRef(new Animated.Value(selectedIndex)).current;

	// MARK: - Effects

	React.useEffect(() => {
		Animated.spring(slideAnimation, {
			toValue: selectedIndex,
			useNativeDriver: true,
			speed: 18,
			bounciness: 0,
			overshootClamping: true
		}).start();
	}, [selectedIndex, slideAnimation]);

	// MARK: - UI

	if (!items.length) {
		return null;
	}

	const borderWidth = 1;
	const contentWidth = Math.max(0, width - borderWidth * 2); // Note: `onLayout` width includes border width on both horizontal edges
	const segmentWidth = contentWidth > 0 ? contentWidth / items.length : 0;
	const thumbWidth = Math.max(0, segmentWidth - thumbInset * 2);
	const thumbRadius = Math.max(0, 32 - thumbInset);
	const maxIndex = Math.max(0, items.length - 1);
	const maxTranslate = Math.max(0, contentWidth - thumbWidth - thumbInset * 2);

	const translateX = slideAnimation.interpolate({
		inputRange: [0, maxIndex === 0 ? 1 : maxIndex],
		outputRange: [0, maxTranslate],
		extrapolate: 'clamp'
	});

	return (
		<View
			className={cn(
				'bg-base-100 dark:bg-base-400/35 border-base-200 dark:border-base-300/40 h-16 flex-row overflow-hidden rounded-4xl border',
				className
			)}
			style={style}
			onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
		>
			{segmentWidth > 0 ? (
				<Animated.View
					className="bg-base-0 dark:bg-base-300 absolute"
					style={{
						top: thumbInset,
						bottom: thumbInset,
						left: thumbInset,
						width: thumbWidth,
						borderRadius: thumbRadius,
						transform: [{ translateX }]
					}}
				/>
			) : null}

			{items.map((item) => (
				<Pressable
					key={item.key}
					testID={item.testID}
					className="flex-1 items-center justify-center gap-0.5"
					disabled={item.disabled}
					onPress={() => onValueChange(item.key)}
				>
					{item.render({ isSelected: item.key === value })}
				</Pressable>
			))}
		</View>
	);
};

interface TSegmentControlItem {
	key: string;
	render: (params: { isSelected: boolean }) => React.ReactNode;
	disabled?: boolean;
	testID?: string;
}

interface TSegmentControlProps {
	value: string;
	onValueChange: (value: string) => void;
	items: readonly TSegmentControlItem[];
	className?: string;
	style?: StyleProp<ViewStyle>;
	thumbInset?: number;
}
