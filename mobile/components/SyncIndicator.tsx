import { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize } from '../theme';
import { useSyncStore } from '../stores/syncStore';
import { hapticLight } from '../utils/haptics';

interface SyncIndicatorProps {
  onPress?: () => void;
  showLabel?: boolean;
}

export function SyncIndicator({ onPress, showLabel = false }: SyncIndicatorProps) {
  const { colors } = useTheme();
  const { status, pendingChanges, sync } = useSyncStore();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'syncing') {
      const animation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => animation.stop();
    }
    spinValue.setValue(0);
  }, [status, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'syncing':
        return 'sync';
      case 'synced':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'offline':
        return 'cloud-offline';
      default:
        return pendingChanges.length > 0 ? 'cloud-upload' : 'cloud-done';
    }
  };

  const getIconColor = () => {
    switch (status) {
      case 'synced':
        return colors.success;
      case 'error':
        return colors.danger;
      case 'offline':
        return colors.textTertiary;
      case 'syncing':
        return colors.primary;
      default:
        return pendingChanges.length > 0 ? colors.warning : colors.textSecondary;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Synced';
      case 'error':
        return 'Sync failed';
      case 'offline':
        return 'Offline';
      default:
        return pendingChanges.length > 0 ? `${pendingChanges.length} pending` : 'Up to date';
    }
  };

  const handlePress = async () => {
    hapticLight();
    if (onPress) {
      onPress();
    } else if (status !== 'syncing') {
      await sync();
    }
  };

  const iconColor = getIconColor();
  const iconName = getIconName();

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={status === 'syncing'}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        {status === 'syncing' ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name={iconName} size={20} color={iconColor} />
          </Animated.View>
        ) : (
          <Ionicons name={iconName} size={20} color={iconColor} />
        )}
        {pendingChanges.length > 0 && status !== 'syncing' && (
          <View style={[styles.badge, { backgroundColor: colors.warning }]}>
            <Text style={styles.badgeText}>{pendingChanges.length}</Text>
          </View>
        )}
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: iconColor }]}>{getLabel()}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});
