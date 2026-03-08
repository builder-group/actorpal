import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText, ThemedView } from '@/components';

export default function HomeScreen() {
	return (
		<ThemedView style={styles.container}>
			{/* Greeting */}
			<ThemedText type="title">Hello World</ThemedText>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	}
});
