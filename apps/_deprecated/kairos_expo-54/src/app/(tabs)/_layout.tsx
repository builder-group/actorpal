import { Tabs } from 'expo-router';
import React from 'react';
import { HapticTab, IconSymbol } from '@/components';
import { Colors } from '@/environment';
import { useColorScheme } from '@/hooks';

export default function TabLayout() {
	const colorScheme = useColorScheme();

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
				headerShown: false,
				tabBarButton: HapticTab
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Home',
					tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />
				}}
			/>
		</Tabs>
	);
}
