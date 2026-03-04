import Feather from '@expo/vector-icons/Feather';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/components';
import { cn } from '@/lib';
import { useTimerCx } from '../TimerCx';
import { RingProgress } from './RingProgress';
import { RingProgressHidden } from './RingProgressHidden';

export const TimerActive: React.FC<TTimerActiveProps> = (props) => {
	const { className } = props;
	const cx = useTimerCx();
	const { tokens } = useTheme();

	const status = useCompute(cx.$status, ({ value }) => value);
	const hideTimer = useCompute(cx.$config, ({ value }) => value.hideTimer);
	const drawnSeconds = useCompute(cx.$drawnSeconds, ({ value }) => value);
	const endTime = useCompute(cx.$endTime, ({ value }) => value);
	const remainingSeconds = useFeatureState(cx.$remainingSeconds);

	const progress = React.useMemo(() => {
		if (status === 'done') {
			return 1;
		}
		if (drawnSeconds == null || drawnSeconds <= 0) {
			return 0;
		}

		const elapsed = 1 - Math.max(0, remainingSeconds) / drawnSeconds;
		return Math.min(Math.max(elapsed, 0), 1);
	}, [status, drawnSeconds, remainingSeconds]);

	// MARK: - Actions

	const handleCancel = React.useCallback(() => {
		cx.cancel();
	}, [cx]);

	const handlePrimaryAction = React.useCallback(() => {
		if (status === 'paused') {
			cx.resume();
			return;
		}
		cx.pause();
	}, [cx, status]);

	// MARK: - UI

	return (
		<>
			<View className={cn('relative h-[216px] w-full', className)}>
				{hideTimer ? (
					<RingProgressHidden
						className="absolute inset-0 top-0 left-1/2 -translate-x-1/2"
						size={235}
						animated={status === 'running'}
						activeColor={tokens.primary}
						inactiveColor={tokens.base300}
					/>
				) : (
					<RingProgress
						className="absolute inset-0 top-0 left-1/2 -translate-x-1/2"
						progress={progress}
						size={235}
						thickness={10}
						progressColor={tokens.primary}
					>
						<View className="items-center justify-center gap-2">
							<View className="flex-row items-center gap-1">
								<Feather name="bell" size={14} color={tokens.base500} />
								<Text className="text-base-500 text-sm">
									{endTime != null ? formatEndTime(endTime) : '--:--'}
								</Text>
							</View>

							<Text
								className="text-base-900 min-w-[190px] text-center text-[72px] leading-[80px] font-thin"
								adjustsFontSizeToFit
								numberOfLines={1}
							>
								{formatRemaining(Math.max(0, remainingSeconds))}
							</Text>
						</View>
					</RingProgress>
				)}
			</View>

			<View className="w-full flex-row items-center justify-between px-4">
				<Pressable
					className="h-24 w-24 items-center justify-center rounded-full bg-[#ECECF2] dark:bg-[#171723]"
					onPress={handleCancel}
				>
					<Text className="text-base-900 text-[18px]">Cancel</Text>
				</Pressable>

				{status !== 'done' && (
					<Pressable
						className="h-24 w-24 items-center justify-center rounded-full bg-[#DDEBFF] dark:bg-[#0A2A57]"
						onPress={handlePrimaryAction}
					>
						<Text className="text-[18px] text-[#0A66D6] dark:text-[#69AEFF]">
							{status === 'paused' ? 'Resume' : 'Pause'}
						</Text>
					</Pressable>
				)}
			</View>
		</>
	);
};

function formatRemaining(seconds: number): string {
	const total = Math.ceil(seconds);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;

	if (h > 0) {
		return `${h}:${pad(m)}:${pad(s)}`;
	}
	return `${m}:${pad(s)}`;
}

function formatEndTime(epochMs: number): string {
	const date = new Date(epochMs);
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number): string {
	return value.toString().padStart(2, '0');
}

interface TTimerActiveProps {
	className?: string;
}
