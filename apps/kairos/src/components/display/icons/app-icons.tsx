import React from 'react';
import { AppIcon, type TNamedAppIconProps } from './AppIcon';

export const BellIcon: React.FC<TNamedAppIconProps> = (props) => {
	return <AppIcon ios="bell.fill" fallback="notifications" {...props} />;
};

export const ClockIcon: React.FC<TNamedAppIconProps> = (props) => {
	return <AppIcon ios="clock.fill" fallback="schedule" {...props} />;
};

export const SmartphoneIcon: React.FC<TNamedAppIconProps> = (props) => {
	return <AppIcon ios="iphone" fallback="smartphone" {...props} />;
};

export const SunIcon: React.FC<TNamedAppIconProps> = (props) => {
	return <AppIcon ios="sun.max.fill" fallback="light-mode" {...props} />;
};

export const MoonIcon: React.FC<TNamedAppIconProps> = (props) => {
	return <AppIcon ios="moon.fill" fallback="dark-mode" {...props} />;
};

export const PlayIcon: React.FC<TNamedAppIconProps> = (props) => {
	return <AppIcon ios="play.fill" fallback="play-arrow" {...props} />;
};
