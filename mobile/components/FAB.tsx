import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing } from '../theme';
import { hapticLight } from '../utils/haptics';

interface FABProps {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: ViewStyle;
}

export function FAB({ icon = 'add', onPress, style }: FABProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    hapticLight();
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.primary }, style]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={28} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
