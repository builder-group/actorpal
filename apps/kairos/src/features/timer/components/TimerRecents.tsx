import { useCompute } from 'feature-react/state';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { PlayIcon } from '@/components';
import { hexToRgba } from '@/lib';
import { formatDurationRange, formatTimerClockRange } from '../format';
import { TimerCx, type TTimerRecent } from '../TimerCx';

export const TimerRecents: React.FC<TTimerRecentsProps> = (props) => {
	const { cx } = props;
	const recents = useCompute(cx.$recents, ({ value }) => value);

	const handleStartRecent = React.useCallback(
		(recent: TTimerRecent) => {
			cx.start({ config: recent.config });
		},
		[cx]
	);

	if (!recents.length) {
		return null;
	}

	return (
		<View className="pt-2">
			<Text className="text-base-900 px-4 text-4xl font-medium">Recents</Text>
			<View className="border-base-200 mt-1.5 border-y">
				{recents.map((recent) => {
					const { config } = recent;
					const subtitle =
						config.label.trim().length > 0
							? config.label.trim()
							: formatDurationRange(config.min, config.max);
					return (
						<View
							key={recent.hash}
							className="border-base-200 flex-row items-center justify-between gap-4 border-b px-4 py-5 last:border-b-0"
						>
							<View className="flex-1">
								<Text
									className="text-base-900 text-[64px] leading-[66px] font-thin"
									numberOfLines={1}
								>
									{formatTimerClockRange(config.min, config.max)}
								</Text>
								<Text className="text-base-500 mt-1 text-xl" numberOfLines={1}>
									{subtitle}
								</Text>
							</View>

							<Pressable
								className="h-20 w-20 items-center justify-center rounded-full"
								style={{ backgroundColor: hexToRgba('#00D042', 0.2) }}
								onPress={() => {
									handleStartRecent(recent);
								}}
							>
								<PlayIcon size={34} color="#00D042" />
							</Pressable>
						</View>
					);
				})}
			</View>
		</View>
	);
};

interface TTimerRecentsProps {
	cx: TimerCx;
}
