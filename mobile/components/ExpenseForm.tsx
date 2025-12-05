import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '../theme';
import { Button } from './Button';
import { api } from '../services/api';
import { useToastStore } from '../stores/toastStore';
import { hapticSuccess, hapticError, hapticLight, hapticSelection } from '../utils/haptics';
import { formatDateForInput } from '../utils/dates';
import type { Expense, Config } from '../types';

interface ExpenseFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  expense?: Expense | null;
  config: Config | null;
  initialData?: Partial<Expense> | null;
}

export function ExpenseForm({ visible, onClose, onSave, expense, config, initialData }: ExpenseFormProps) {
  const { colors } = useTheme();
  const toast = useToastStore();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isExpense, setIsExpense] = useState(true);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setAmount(Math.abs(expense.amount).toString());
      setIsExpense(expense.amount < 0);
      setCategory(expense.category);
      setDate(formatDateForInput(new Date(expense.date)));
      setTags(expense.tags?.join(', ') || '');
    } else if (initialData) {
      setName(initialData.name || '');
      setAmount(initialData.amount ? Math.abs(initialData.amount).toString() : '');
      setIsExpense(initialData.amount ? initialData.amount < 0 : true);
      setCategory(initialData.category || config?.categories[0] || '');
      setDate(initialData.date ? formatDateForInput(new Date(initialData.date)) : formatDateForInput(new Date()));
      setTags('');
    } else {
      resetForm();
    }
  }, [expense, initialData, visible]);

  const resetForm = () => {
    setName('');
    setAmount('');
    setIsExpense(true);
    setCategory(config?.categories[0] || '');
    setDate(formatDateForInput(new Date()));
    setTags('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      hapticError();
      toast.error('Please enter a name');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      hapticError();
      toast.error('Please enter a valid amount');
      return;
    }

    if (!category) {
      hapticError();
      toast.error('Please select a category');
      return;
    }

    setIsSubmitting(true);

    const expenseData = {
      name: name.trim(),
      amount: isExpense ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
      category,
      date: new Date(date).toISOString(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      currency: config?.currency || 'usd',
    };

    try {
      if (expense) {
        await api.updateExpense(expense.id, expenseData);
        hapticSuccess();
        toast.success('Expense updated');
      } else {
        await api.addExpense(expenseData);
        hapticSuccess();
        toast.success('Expense added');
      }
      onSave();
      onClose();
      resetForm();
    } catch {
      hapticError();
      toast.error('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    hapticLight();
    onClose();
  };

  const handleCategorySelect = (cat: string) => {
    hapticSelection();
    setCategory(cat);
    setShowCategoryPicker(false);
  };

  const toggleExpenseType = () => {
    hapticSelection();
    setIsExpense(!isExpense);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              {expense ? 'Edit Expense' : initialData ? 'Confirm Expense' : 'Add Expense'}
            </Text>
            <View style={styles.closeButton} />
          </View>

          <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
            {/* Expense/Income Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: isExpense ? colors.danger : colors.surface, borderColor: colors.border },
                ]}
                onPress={toggleExpenseType}
              >
                <Ionicons
                  name="arrow-down"
                  size={18}
                  color={isExpense ? '#fff' : colors.textSecondary}
                />
                <Text style={[styles.toggleText, { color: isExpense ? '#fff' : colors.textSecondary }]}>
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: !isExpense ? colors.success : colors.surface, borderColor: colors.border },
                ]}
                onPress={toggleExpenseType}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={!isExpense ? '#fff' : colors.textSecondary}
                />
                <Text style={[styles.toggleText, { color: !isExpense ? '#fff' : colors.textSecondary }]}>
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Groceries, Rent"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Amount */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
              <TouchableOpacity
                style={[styles.input, styles.selectInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  hapticLight();
                  setShowCategoryPicker(!showCategoryPicker);
                }}
              >
                <Text style={[styles.selectText, { color: category ? colors.text : colors.textTertiary }]}>
                  {category || 'Select category'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={[styles.categoryPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {config?.categories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        category === cat ? { backgroundColor: colors.primary + '20' } : undefined,
                      ]}
                      onPress={() => handleCategorySelect(cat)}
                    >
                      <Text style={[styles.categoryOptionText, { color: colors.text }]}>{cat}</Text>
                      {category === cat && (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Date */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* Tags */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Tags (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="tag1, tag2, tag3"
                placeholderTextColor={colors.textTertiary}
                value={tags}
                onChangeText={setTags}
              />
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button
              onPress={handleSubmit}
              loading={isSubmitting}
              fullWidth
            >
              {expense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: fontSize.base,
  },
  categoryPicker: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    maxHeight: 200,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  categoryOptionText: {
    fontSize: fontSize.base,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
});
