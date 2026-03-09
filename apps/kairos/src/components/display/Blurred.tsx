import { BlurTargetView, BlurView, type BlurTint } from 'expo-blur';
import React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib';

export const Blurred: React.FC<TBlurredProps> = (props) => {
	const {
		children,
		blurred = true,
		intensity = 22,
		tint = 'default',
		className,
		blurClassName,
		...rest
	} = props;
	const blurTargetRef = React.useRef<React.ComponentRef<typeof View> | null>(null);

	return (
		<BlurTargetView ref={blurTargetRef} className={cn('relative', className)} {...rest}>
			{children}
			{blurred && (
				<BlurView
					blurTarget={blurTargetRef}
					intensity={intensity}
					tint={tint}
					className={cn('absolute inset-0 overflow-hidden', blurClassName)}
				/>
			)}
		</BlurTargetView>
	);
};

interface TBlurredProps extends ViewProps {
	children: React.ReactNode;
	blurred?: boolean;
	intensity?: number;
	tint?: BlurTint;
	blurClassName?: string;
}
