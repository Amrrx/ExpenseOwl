import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, AppState, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useTheme, spacing, fontSize, chartColors } from '../../theme';
import { Card, FAB, ExpenseForm, SyncIndicator, VoiceRecorder } from '../../components';
import { api } from '../../services/api';
import { useToastStore } from '../../stores/toastStore';
import { useSyncStore } from '../../stores/syncStore';
import { useOfflineStore } from '../../stores/offlineStore';
import { formatCurrency, COLOR_PALETTE } from '../../utils/currency';
import { formatMonth, getMonthBounds, formatDateForInput } from '../../utils/dates';
import { hapticSelection, hapticSuccess, hapticError, hapticLight } from '../../utils/haptics';
import type { Expense, Config } from '../../types';

// Get store state without triggering re-renders
const getOfflineState = () => useOfflineStore.getState();

interface CategoryData {
  category: string;
  total: number;
  percentage: number;
  color: string;
}

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const toast = useToastStore();
  const syncStore = useSyncStore();
  // Only subscribe to isOnline to avoid re-render loops from cached data changes
  const isOnline = useOfflineStore(state => state.isOnline);
  const offlineQueue = useOfflineStore(state => state.offlineQueue);
  const appState = useRef(AppState.currentState);
  const hasLoadedRef = useRef(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartView, setChartView] = useState(0);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [parsedExpenseData, setParsedExpenseData] = useState<Partial<Expense> | null>(null);

  useEffect(() => {
    syncStore.initialize();
    useOfflineStore.getState().initialize();
  }, []);

  // Auto-sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (isOnline && offlineQueue.length > 0) {
          syncStore.sync();
        }
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [isOnline, offlineQueue.length]);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    const store = getOfflineState();
    try {
      if (store.isOnline) {
        const [configData, expensesData] = await Promise.all([
          api.getConfig(),
          api.getExpenses(),
        ]);
        setConfig(configData);
        setAllExpenses(Array.isArray(expensesData) ? expensesData : []);
        // Cache data for offline use (fire and forget to avoid re-render loop)
        store.cacheConfig(configData);
        store.cacheExpenses(Array.isArray(expensesData) ? expensesData : []);
      } else {
        // Use cached data when offline
        setConfig(store.cachedConfig);
        setAllExpenses(store.cachedExpenses);
        toast.info('Using offline data');
      }
    } catch {
      // Fall back to cached data on error
      const fallbackStore = getOfflineState();
      if (fallbackStore.cachedConfig) {
        setConfig(fallbackStore.cachedConfig);
        setAllExpenses(fallbackStore.cachedExpenses);
        toast.error('Using cached data');
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadData();
    }
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  }, [loadData]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const handleExpenseSaved = () => {
    loadData(false);
    setParsedExpenseData(null);
  };

  const handleVoiceRecording = async (uri: string) => {
    setShowVoiceRecorder(false);
    setIsParsingVoice(true);
    try {
      const result = await api.parseVoiceExpense(uri);
      if (result.expenses && result.expenses.length > 0) {
        const parsed = result.expenses[0];
        setParsedExpenseData({
          name: parsed.name,
          amount: parsed.amount,
          category: parsed.category && config?.categories.includes(parsed.category) ? parsed.category : config?.categories[0],
          date: parsed.date || new Date().toISOString(),
        });
        hapticSuccess();
        setShowExpenseForm(true);
      } else {
        hapticError();
        toast.error('Could not parse expense. Try manual entry.');
        setShowExpenseForm(true);
      }
    } catch {
      hapticError();
      toast.error('Voice processing failed. Try manual entry.');
      setShowExpenseForm(true);
    } finally {
      setIsParsingVoice(false);
    }
  };

  const handleFabPress = () => {
    hapticLight();
    setShowVoiceRecorder(true);
  };

  const handleManualEntry = () => {
    hapticLight();
    setParsedExpenseData(null);
    setShowExpenseForm(true);
  };

  const startDate = config?.startDate || 1;
  const currency = config?.currency || 'usd';

  const getMonthExpenses = (): Expense[] => {
    const { start, end } = getMonthBounds(currentDate, startDate);
    return allExpenses.filter((e) => {
      const expenseDate = new Date(e.date);
      return expenseDate >= start && expenseDate < end;
    });
  };

  const monthExpenses = getMonthExpenses();

  const income = monthExpenses
    .filter(exp => exp.amount > 0)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const expenseTotal = monthExpenses
    .filter(exp => exp.amount < 0)
    .reduce((sum, exp) => sum + Math.abs(exp.amount), 0);

  const balance = income - expenseTotal;

  const categoryBreakdown: CategoryData[] = (() => {
    const categoryTotals: Record<string, number> = {};
    let totalAmount = 0;

    monthExpenses.forEach(exp => {
      if (exp.amount < 0) {
        const amount = Math.abs(exp.amount);
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amount;
        totalAmount += amount;
      }
    });

    return Object.entries(categoryTotals)
      .map(([category, total], index) => ({
        category,
        total,
        percentage: totalAmount > 0 ? (total / totalAmount) * 100 : 0,
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.total - a.total);
  })();

  const pieData = categoryBreakdown.map(item => ({
    value: item.total,
    color: item.color,
    text: `${item.percentage.toFixed(0)}%`,
  }));

  const getMonthlyTrend = () => {
    const result: { month: string; total: number }[] = [];
    const now = new Date(currentDate);

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const { start, end } = getMonthBounds(date, startDate);

      const monthTotal = allExpenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return exp.amount < 0 && expDate >= start && expDate < end;
        })
        .reduce((sum, exp) => sum + Math.abs(exp.amount), 0);

      result.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        total: monthTotal,
      });
    }
    return result;
  };

  const monthlyTrend = getMonthlyTrend();
  const maxTrend = Math.max(...monthlyTrend.map(m => m.total), 1);

  const barData = monthlyTrend.map((item, index) => ({
    value: item.total,
    label: item.month,
    frontColor: index === monthlyTrend.length - 1 ? colors.primary : colors.border,
  }));

  const topExpenses = monthExpenses
    .filter(exp => exp.amount < 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5);

  const hasExpenses = monthExpenses.some(e => e.amount < 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.primary }]}>Xpense</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleManualEntry} style={styles.headerButton}>
              <Ionicons name="add-circle-outline" size={26} color={colors.text} />
            </TouchableOpacity>
            <SyncIndicator />
          </View>
        </View>

        {/* Month Navigation */}
        <Card style={styles.monthNav}>
          <View style={styles.monthNavContent}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthText, { color: colors.text }]}>
              {formatMonth(currentDate)}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Cashflow Summary */}
        <View style={styles.cashflowRow}>
          <View style={[styles.cashflowCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cashflowLabel, { color: colors.textSecondary }]}>INCOME</Text>
            <Text style={[styles.cashflowValue, { color: colors.success }]}>
              {formatCurrency(income, currency)}
            </Text>
          </View>
          <View style={[styles.cashflowCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cashflowLabel, { color: colors.textSecondary }]}>EXPENSES</Text>
            <Text style={[styles.cashflowValue, { color: colors.danger }]}>
              {formatCurrency(expenseTotal, currency)}
            </Text>
          </View>
          <View style={[styles.cashflowCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cashflowLabel, { color: colors.textSecondary }]}>BALANCE</Text>
            <Text style={[styles.cashflowValue, { color: balance >= 0 ? colors.success : colors.danger }]}>
              {formatCurrency(balance, currency)}
            </Text>
          </View>
        </View>

        {/* Charts */}
        {!isLoading && hasExpenses && (
          <Card>
            {/* Chart View Toggle */}
            <View style={styles.chartTabs}>
              {['Chart', 'Trend', 'Top'].map((tab, index) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.chartTab,
                    chartView === index ? { backgroundColor: colors.primary } : undefined,
                  ]}
                  onPress={() => {
                    hapticSelection();
                    setChartView(index);
                  }}
                >
                  <Text style={[
                    styles.chartTabText,
                    { color: chartView === index ? '#fff' : colors.textSecondary },
                  ]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Donut Chart */}
            {chartView === 0 && (
              <View style={styles.chartContainer}>
                <View style={styles.pieWrapper}>
                  <PieChart
                    data={pieData}
                    donut
                    radius={100}
                    innerRadius={60}
                    innerCircleColor={colors.surface}
                    centerLabelComponent={() => (
                      <View style={styles.centerLabel}>
                        <Text style={[styles.centerLabelSmall, { color: colors.textSecondary }]}>Total</Text>
                        <Text style={[styles.centerLabelValue, { color: colors.text }]}>
                          {formatCurrency(expenseTotal, currency)}
                        </Text>
                      </View>
                    )}
                  />
                </View>
                <View style={styles.legend}>
                  {categoryBreakdown.slice(0, 6).map(item => (
                    <View key={item.category} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendText, { color: colors.text }]} numberOfLines={1}>
                        {item.category}
                      </Text>
                      <Text style={[styles.legendPercent, { color: colors.textSecondary }]}>
                        {item.percentage.toFixed(0)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Trend Chart */}
            {chartView === 1 && (
              <View style={styles.trendContainer}>
                <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>6-Month Trend</Text>
                <BarChart
                  data={barData}
                  barWidth={32}
                  spacing={20}
                  roundedTop
                  roundedBottom
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                  noOfSections={4}
                  maxValue={maxTrend * 1.2}
                  hideRules
                />
              </View>
            )}

            {/* Top Expenses */}
            {chartView === 2 && (
              <View>
                <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>Top Expenses</Text>
                {topExpenses.map((exp, index) => (
                  <View key={exp.id} style={[styles.topExpenseItem, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.topExpenseRank, { color: colors.textTertiary }]}>{index + 1}</Text>
                    <View style={styles.topExpenseInfo}>
                      <Text style={[styles.topExpenseName, { color: colors.text }]} numberOfLines={1}>
                        {exp.name}
                      </Text>
                      <Text style={[styles.topExpenseCategory, { color: colors.textSecondary }]}>
                        {exp.category}
                      </Text>
                    </View>
                    <Text style={[styles.topExpenseAmount, { color: colors.danger }]}>
                      {formatCurrency(Math.abs(exp.amount), currency)}
                    </Text>
                  </View>
                ))}
                {topExpenses.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses yet</Text>
                )}
              </View>
            )}
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !hasExpenses && (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No expenses recorded this month
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Processing Overlay */}
      {isParsingVoice && (
        <View style={styles.processingOverlay}>
          <View style={[styles.processingCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.processingText, { color: colors.text }]}>
              Processing your voice...
            </Text>
            <Text style={[styles.processingSubtext, { color: colors.textSecondary }]}>
              This may take a moment
            </Text>
          </View>
        </View>
      )}

      <FAB icon="mic" onPress={handleFabPress} />

      <VoiceRecorder
        visible={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onRecordingComplete={handleVoiceRecording}
      />

      <ExpenseForm
        visible={showExpenseForm}
        onClose={() => {
          setShowExpenseForm(false);
          setParsedExpenseData(null);
        }}
        onSave={handleExpenseSaved}
        config={config}
        initialData={parsedExpenseData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  logo: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  monthNav: {
    marginBottom: spacing.sm,
  },
  monthNavContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: spacing.xs,
  },
  monthText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  cashflowRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cashflowCard: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
  },
  cashflowLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cashflowValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  chartTabs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  chartTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  chartTabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
  },
  pieWrapper: {
    marginBottom: spacing.md,
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerLabelSmall: {
    fontSize: fontSize.xs,
  },
  centerLabelValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    gap: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: fontSize.xs,
    flex: 1,
  },
  legendPercent: {
    fontSize: fontSize.xs,
  },
  trendContainer: {
    paddingVertical: spacing.sm,
  },
  chartTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  topExpenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  topExpenseRank: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    width: 20,
  },
  topExpenseInfo: {
    flex: 1,
  },
  topExpenseName: {
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  topExpenseCategory: {
    fontSize: fontSize.xs,
  },
  topExpenseAmount: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingCard: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  processingText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  processingSubtext: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
