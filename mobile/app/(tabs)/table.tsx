import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '../../theme';
import { Card, FAB, ExpenseForm } from '../../components';
import { api } from '../../services/api';
import { useToastStore } from '../../stores/toastStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/currency';
import { formatDateShort, getMonthBounds, formatMonth } from '../../utils/dates';
import { hapticSelection, hapticWarning } from '../../utils/haptics';
import type { Expense, Config } from '../../types';

export default function TableScreen() {
  const { colors } = useTheme();
  const toast = useToastStore();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTime, setShowAllTime] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [configData, expensesData] = await Promise.all([
        api.getConfig(),
        api.getExpenses(),
      ]);
      setConfig(configData);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [isAuthenticated, loadData]);

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

  const handleDelete = (expense: Expense) => {
    hapticWarning();
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expense.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteExpense(expense.id);
              toast.success('Expense deleted');
              loadData(false);
            } catch {
              toast.error('Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const handleEditExpense = (expense: Expense) => {
    hapticSelection();
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleExpenseSaved = () => {
    loadData(false);
    setEditingExpense(null);
  };

  const handleCloseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const startDate = config?.startDate || 1;
  const currency = config?.currency || 'usd';
  const categories = config?.categories || [];

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Filter by month if not showing all time
    if (!showAllTime) {
      const { start, end } = getMonthBounds(currentDate, startDate);
      result = result.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate < end;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(exp =>
        exp.name.toLowerCase().includes(query) ||
        exp.category.toLowerCase().includes(query) ||
        exp.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter(exp => exp.category === selectedCategory);
    }

    // Sort by date descending
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, showAllTime, currentDate, startDate, searchQuery, selectedCategory]);

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const isIncome = item.amount > 0;

    return (
      <TouchableOpacity
        style={[styles.expenseItem, { backgroundColor: colors.surface }]}
        onPress={() => handleEditExpense(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.expenseMain}>
          <View style={styles.expenseInfo}>
            <Text style={[styles.expenseName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.expenseMeta}>
              <Text style={[styles.expenseCategory, { color: colors.textSecondary }]}>
                {item.category}
              </Text>
              <Text style={[styles.expenseDate, { color: colors.textTertiary }]}>
                {formatDateShort(item.date)}
              </Text>
            </View>
          </View>
          <Text style={[
            styles.expenseAmount,
            { color: isIncome ? colors.success : colors.danger }
          ]}>
            {isIncome ? '+' : ''}{formatCurrency(item.amount, currency)}
          </Text>
        </View>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map(tag => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search expenses..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        {/* Time Toggle */}
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: showAllTime ? colors.primary : colors.surface, borderColor: colors.border }
          ]}
          onPress={() => setShowAllTime(!showAllTime)}
        >
          <Text style={[styles.filterChipText, { color: showAllTime ? '#fff' : colors.textSecondary }]}>
            {showAllTime ? 'All Time' : 'This Month'}
          </Text>
        </TouchableOpacity>

        {/* Category Filter */}
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: selectedCategory ? colors.primary : colors.surface, borderColor: colors.border }
          ]}
          onPress={() => {
            if (selectedCategory) {
              setSelectedCategory(null);
            } else {
              // Show category picker (simplified - just cycle through)
              const currentIndex = categories.indexOf(selectedCategory || '');
              const nextIndex = (currentIndex + 1) % categories.length;
              setSelectedCategory(categories[nextIndex] || null);
            }
          }}
          onLongPress={() => setSelectedCategory(null)}
        >
          <Ionicons
            name="filter"
            size={14}
            color={selectedCategory ? '#fff' : colors.textSecondary}
          />
          <Text style={[styles.filterChipText, { color: selectedCategory ? '#fff' : colors.textSecondary }]}>
            {selectedCategory || 'Category'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month Navigation (only if not showing all time) */}
      {!showAllTime && (
        <Card style={styles.monthNav}>
          <View style={styles.monthNavContent}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthText, { color: colors.text }]}>
              {formatMonth(currentDate)}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Results Count */}
      <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
        {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {searchQuery ? 'No expenses match your search' : 'No expenses found'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Expenses</Text>
      </View>

      <FlatList
        data={filteredExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />

      <FAB onPress={() => setShowExpenseForm(true)} />

      <ExpenseForm
        visible={showExpenseForm}
        onClose={handleCloseForm}
        onSave={handleExpenseSaved}
        expense={editingExpense}
        config={config}
      />
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
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  listHeader: {
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: fontSize.sm,
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
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: fontSize.sm,
  },
  expenseItem: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  expenseMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  expenseName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    marginBottom: 4,
  },
  expenseMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  expenseCategory: {
    fontSize: fontSize.sm,
  },
  expenseDate: {
    fontSize: fontSize.sm,
  },
  expenseAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.base,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
