import { useCombinedCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { PlayIcon } from '@/components';
import { hexToRgba } from '@/lib';
import { formatDurationRange, formatTimerClock } from '../format';
import { TimerCx, type TTimerRecent } from '../TimerCx';

export const TimerRecents: React.FC<TTimerRecentsProps> = (props) => {
	const { cx } = props;
	const recents = useFeatureState(cx.$recents);
	const shouldMaskLatestRecent = useCombinedCompute(
		[cx.$config, cx.$status],
		([{ value: config }, { value: status }]) => config.hideTimeDisplay && status !== 'idle'
	);

	// MARK: - Actions

	const handleSelectRecent = React.useCallback(
		(recent: TTimerRecent) => {
			cx.$config.set(recent.config);
		},
		[cx]
	);

	const handleStartRecent = React.useCallback(
		(recent: TTimerRecent) => {
			cx.start({ config: recent.config });
		},
		[cx]
	);

	// MARK: - UI

	if (!recents.length) {
		return null;
	}

	return (
		<View className="pt-2">
			<Text className="text-base-900 px-4 text-2xl font-medium">Recents</Text>
			<View className="mt-2">
				<View className="border-base-300 mx-4 border-t" />
				{recents.map((recent, index) => {
					const { config } = recent;
					const shouldMaskTitle = shouldMaskLatestRecent && index === 0;
					const title = shouldMaskTitle
						? '??:??:??'
						: formatTimerClock(recent.lastUsedTotalSeconds);
					const subtitle =
						config.label.trim().length > 0
							? config.label.trim()
							: formatDurationRange(config.min, config.max);
					return (
						<React.Fragment key={recent.hash}>
							<Pressable
								className="flex-row items-center justify-between gap-4 px-4 py-2"
								onPress={() => {
									handleSelectRecent(recent);
								}}
							>
								<View className="flex-1">
									<Text
										className="text-base-900 text-[58px] leading-[64px] font-extralight"
										numberOfLines={1}
									>
										{title}
									</Text>
									<Text className="text-base-500 text-xl" numberOfLines={1}>
										{subtitle}
									</Text>
								</View>

								<Pressable
									className="h-20 w-20 items-center justify-center rounded-full"
									style={{ backgroundColor: hexToRgba('#00D042', 0.14) }}
									onPress={(e) => {
										e.stopPropagation();
										handleStartRecent(recent);
									}}
								>
									<PlayIcon size={24} color="#00D042" />
								</Pressable>
							</Pressable>
							{index < recents.length - 1 ? (
								<View className="border-base-300 mx-4 border-t" />
							) : null}
						</React.Fragment>
					);
				})}
				<View className="border-base-300 mx-4 border-t" />
			</View>
		</View>
	);
};

interface TTimerRecentsProps {
	cx: TimerCx;
}
