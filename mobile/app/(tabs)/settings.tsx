import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme, spacing, fontSize, borderRadius } from '../../theme';
import { Card, Button } from '../../components';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';
import { hapticSuccess, hapticWarning, hapticSelection, hapticLight } from '../../utils/haptics';
import type { Config } from '../../types';

type ThemePreference = 'system' | 'light' | 'dark';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

function ThemeSection() {
  const { colors, themePreference, setThemePreference } = useTheme();

  const handleThemeChange = (value: ThemePreference) => {
    hapticSelection();
    setThemePreference(value);
  };

  return (
    <Card title="Appearance">
      <View style={styles.themeOptions}>
        {THEME_OPTIONS.map(({ value, label, icon }) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.themeOption,
              { backgroundColor: colors.surfaceSecondary },
              themePreference === value && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1 },
            ]}
            onPress={() => handleThemeChange(value)}
          >
            <Ionicons
              name={icon}
              size={20}
              color={themePreference === value ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.themeOptionText,
                { color: themePreference === value ? colors.primary : colors.text },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuthStore();
  const toast = useToastStore();

  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  const loadConfig = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const configData = await api.getConfig();
      setConfig(configData);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConfig(false);
    setRefreshing(false);
  }, [loadConfig]);

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !config) return;

    const trimmed = newCategory.trim();
    if (config.categories.includes(trimmed)) {
      hapticWarning();
      toast.warning('Category already exists');
      return;
    }

    try {
      const updated = [...config.categories, trimmed];
      await api.updateCategories(updated);
      setConfig({ ...config, categories: updated });
      setNewCategory('');
      hapticSuccess();
      toast.success('Category added');
    } catch {
      toast.error('Failed to add category');
    }
  };

  const handleDeleteCategory = (category: string) => {
    hapticWarning();
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!config) return;
            try {
              const updated = config.categories.filter(c => c !== category);
              await api.updateCategories(updated);
              setConfig({ ...config, categories: updated });
              hapticSuccess();
              toast.success('Category deleted');
            } catch {
              toast.error('Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const handleCurrencyChange = async (currency: string) => {
    if (!config) return;
    hapticSelection();
    try {
      await api.updateCurrency(currency);
      setConfig({ ...config, currency });
      setShowCurrencyPicker(false);
      hapticSuccess();
      toast.success('Currency updated');
    } catch {
      toast.error('Failed to update currency');
    }
  };

  const handleStartDateChange = async (day: number) => {
    if (!config) return;
    hapticSelection();
    try {
      await api.updateStartDate(day);
      setConfig({ ...config, startDate: day });
      setShowStartDatePicker(false);
      hapticSuccess();
      toast.success('Start date updated');
    } catch {
      toast.error('Failed to update start date');
    }
  };

  const handleLogout = () => {
    hapticWarning();
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const currentCurrency = SUPPORTED_CURRENCIES.find(c => c.code === config?.currency);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* User Info */}
        {user && (
          <Card>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>{user.full_name}</Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Categories */}
        <Card title="Categories">
          <View style={styles.addCategoryRow}>
            <TextInput
              style={[styles.categoryInput, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
              placeholder="New category"
              placeholderTextColor={colors.textTertiary}
              value={newCategory}
              onChangeText={setNewCategory}
              onSubmitEditing={handleAddCategory}
            />
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAddCategory}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.categoriesList}>
            {config?.categories.map((category) => (
              <View key={category} style={[styles.categoryItem, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.categoryText, { color: colors.text }]}>{category}</Text>
                <TouchableOpacity onPress={() => handleDeleteCategory(category)}>
                  <Ionicons name="close" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </Card>

        {/* Currency */}
        <Card title="Currency">
          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
          >
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {currentCurrency ? `${currentCurrency.symbol} (${currentCurrency.code.toUpperCase()})` : 'Select currency'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {showCurrencyPicker && (
            <View style={styles.pickerList}>
              {SUPPORTED_CURRENCIES.map(({ code, symbol }) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.pickerItem,
                    config?.currency === code ? { backgroundColor: colors.primary + '20' } : undefined
                  ]}
                  onPress={() => handleCurrencyChange(code)}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>
                    {symbol} ({code.toUpperCase()})
                  </Text>
                  {config?.currency === code && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Start Date */}
        <Card title="Billing Cycle Start">
          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => setShowStartDatePicker(!showStartDatePicker)}
          >
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Day {config?.startDate || 1} of each month
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {showStartDatePicker && (
            <View style={styles.datePickerGrid}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.datePickerItem,
                    { backgroundColor: colors.surfaceSecondary },
                    config?.startDate === day ? { backgroundColor: colors.primary } : undefined
                  ]}
                  onPress={() => handleStartDateChange(day)}
                >
                  <Text style={[
                    styles.datePickerText,
                    { color: config?.startDate === day ? '#fff' : colors.text }
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Theme */}
        <ThemeSection />

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button variant="danger" onPress={handleLogout} fullWidth>
            Logout
          </Button>
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: colors.textTertiary }]}>
          Xpense v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: fontSize.sm,
  },
  addCategoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryInput: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: fontSize.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  settingLabel: {
    fontSize: fontSize.base,
  },
  pickerList: {
    marginTop: spacing.sm,
    maxHeight: 200,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  pickerItemText: {
    fontSize: fontSize.base,
  },
  datePickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  datePickerItem: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  logoutSection: {
    marginTop: spacing.lg,
  },
  version: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  themeOptionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
