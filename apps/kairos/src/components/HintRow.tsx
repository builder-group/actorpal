import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Spacing } from '@/environment';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export const HintRow: React.FC<THintRowProps> = (props) => {
	const { title = 'Try editing', hint = 'app/index.tsx' } = props;

	return (
		<View style={styles.stepRow}>
			<ThemedText type="small">{title}</ThemedText>
			<ThemedView type="backgroundSelected" style={styles.codeSnippet}>
				<ThemedText themeColor="textSecondary">{hint}</ThemedText>
			</ThemedView>
		</View>
	);
};

interface THintRowProps {
	title?: string;
	hint?: React.ReactNode;
}

const styles = StyleSheet.create({
	stepRow: {
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	codeSnippet: {
		borderRadius: Spacing.two,
		paddingVertical: Spacing.half,
		paddingHorizontal: Spacing.two
	}
});
