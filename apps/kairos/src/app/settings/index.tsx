import { Form, Host, Picker, Section, Text } from '@expo/ui/swift-ui';
import { tag } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { ScrollView } from 'react-native';
import { useTheme, type TThemePreference } from '@/components';

const Screen: React.FC = () => {
	const { themePreference, setThemePreference } = useTheme();

	return (
		<ScrollView
			className="dark:bg-base-0 bg-base-50 flex-1"
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			<Host matchContents useViewportSizeMeasurement style={{ width: '100%' }}>
				<Form>
					<Section title="Appearance">
						<Picker
							label="Theme"
							selection={themePreference}
							onSelectionChange={(value) => setThemePreference(value as TThemePreference)}
						>
							<Text modifiers={[tag('system')]}>System</Text>
							<Text modifiers={[tag('light')]}>Light</Text>
							<Text modifiers={[tag('dark')]}>Dark</Text>
						</Picker>
					</Section>
				</Form>
			</Host>
		</ScrollView>
	);
};

export default Screen;
