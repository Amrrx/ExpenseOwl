import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '../theme';
import { Button } from './Button';
import { api } from '../services/api';
import { useToastStore } from '../stores/toastStore';
import { hapticSuccess, hapticError, hapticLight, hapticWarning } from '../utils/haptics';
import { formatCurrency } from '../utils/currency';
import { formatDateForInput } from '../utils/dates';
import type { Config } from '../types';

// RTL character ranges: Arabic, Hebrew, Persian, Urdu
const RTL_REGEX = /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/;

function isRTLText(text: string): boolean {
  return RTL_REGEX.test(text);
}

interface ParsedExpense {
  name: string;
  amount: number;
  category: string;
  date: string;
  confidence?: number;
  ambiguous?: boolean;
}

interface BatchExpenseReviewProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  expenses: ParsedExpense[];
  transcript?: string;
  config: Config | null;
}

export function BatchExpenseReview({
  visible,
  onClose,
  onSave,
  expenses: initialExpenses,
  transcript,
  config,
}: BatchExpenseReviewProps) {
  const { colors } = useTheme();
  const toast = useToastStore();
  const [expenses, setExpenses] = useState<ParsedExpense[]>(initialExpenses);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when props change (component is reused)
  useEffect(() => {
    setExpenses(initialExpenses);
    setEditingIndex(null);
  }, [initialExpenses]);

  const currency = config?.currency || 'usd';

  const handleRemove = (index: number) => {
    hapticWarning();
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const handleEdit = (index: number) => {
    hapticLight();
    setEditingIndex(editingIndex === index ? null : index);
  };

  const handleUpdateExpense = (index: number, field: keyof ParsedExpense, value: string | number) => {
    setExpenses(prev =>
      prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp))
    );
  };

  const handleCategoryChange = (index: number, category: string) => {
    handleUpdateExpense(index, 'category', category);
  };

  const handleSaveAll = async () => {
    if (expenses.length === 0) {
      toast.warning('No expenses to save');
      return;
    }

    setIsSubmitting(true);
    let savedCount = 0;
    let failedCount = 0;

    for (const exp of expenses) {
      try {
        await api.addExpense({
          name: exp.name.trim(),
          amount: exp.amount,
          category: exp.category,
          date: new Date(exp.date).toISOString(),
          tags: [],
          currency: config?.currency || 'usd',
        });
        savedCount++;
      } catch {
        failedCount++;
      }
    }

    setIsSubmitting(false);

    if (failedCount === 0) {
      hapticSuccess();
      toast.success(`${savedCount} expense${savedCount > 1 ? 's' : ''} added`);
      onSave();
      onClose();
    } else if (savedCount > 0) {
      hapticWarning();
      toast.warning(`${savedCount} saved, ${failedCount} failed`);
      onSave();
      onClose();
    } else {
      hapticError();
      toast.error('Failed to save expenses');
    }
  };

  const handleClose = () => {
    hapticLight();
    onClose();
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + Math.abs(exp.amount), 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Review Expenses ({expenses.length})
          </Text>
          <View style={styles.closeButton} />
        </View>

        {/* Transcript */}
        {transcript && (
          <View style={[styles.transcriptBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.transcriptLabel, { color: colors.textSecondary }]}>
              What we heard:
            </Text>
            <Text style={[styles.transcriptText, { color: colors.text }]}>
              "{transcript}"
            </Text>
          </View>
        )}

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {expenses.map((exp, index) => {
            const isRTL = isRTLText(exp.name);
            return (
              <View
                key={index.toString()}
                style={[
                  styles.expenseCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  exp.confidence !== undefined && exp.confidence < 0.7 ? { borderColor: colors.warning } : undefined,
                ]}
              >
                <View style={[styles.expenseHeader, isRTL && styles.expenseHeaderRTL]}>
                  <View style={[styles.expenseMain, isRTL && styles.expenseMainRTL]}>
                    {editingIndex === index ? (
                      <TextInput
                        style={[
                          styles.nameInput,
                          { color: colors.text, borderColor: colors.border },
                          isRTL && styles.textRTL,
                        ]}
                        value={exp.name}
                        onChangeText={(val) => handleUpdateExpense(index, 'name', val)}
                        autoFocus
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                    ) : (
                      <Text style={[styles.expenseName, { color: colors.text }, isRTL && styles.textRTL]}>
                        {exp.name}
                      </Text>
                    )}
                    <Text style={[styles.expenseCategory, { color: colors.textSecondary }, isRTL && styles.textRTL]}>
                      {exp.category}
                    </Text>
                  </View>
                  <View style={[styles.expenseRight, isRTL && styles.expenseLeftRTL]}>
                    {editingIndex === index ? (
                      <TextInput
                        style={[styles.amountInput, { color: colors.danger, borderColor: colors.border }]}
                        value={Math.abs(exp.amount).toString()}
                        onChangeText={(val) => {
                          const num = parseFloat(val) || 0;
                          handleUpdateExpense(index, 'amount', -Math.abs(num));
                        }}
                        keyboardType="decimal-pad"
                      />
                    ) : (
                      <Text style={[styles.expenseAmount, { color: colors.danger }]}>
                        {formatCurrency(Math.abs(exp.amount), currency)}
                      </Text>
                    )}
                    {exp.confidence && exp.confidence < 0.7 && (
                      <View style={[styles.warningBadge, { backgroundColor: colors.warning + '20' }]}>
                        <Ionicons name="warning" size={12} color={colors.warning} />
                        <Text style={[styles.warningText, { color: colors.warning }]}>Uncertain</Text>
                      </View>
                    )}
                  </View>
                </View>

              {/* Category Picker when editing */}
              {editingIndex === index && config?.categories && (
                <View style={styles.categoryPicker}>
                  <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Category:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categoryChips}>
                      {config.categories.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            { backgroundColor: colors.surfaceSecondary },
                            exp.category === cat && { backgroundColor: colors.primary },
                          ]}
                          onPress={() => handleCategoryChange(index, cat)}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: exp.category === cat ? '#fff' : colors.text },
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Actions */}
              <View style={styles.expenseActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => handleEdit(index)}
                >
                  <Ionicons
                    name={editingIndex === index ? 'checkmark' : 'pencil'}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.actionText, { color: colors.primary }]}>
                    {editingIndex === index ? 'Done' : 'Edit'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.danger + '15' }]}
                  onPress={() => handleRemove(index)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
            );
          })}

          {expenses.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                All expenses removed
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total:</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>
              {formatCurrency(totalAmount, currency)}
            </Text>
          </View>
          <Button
            onPress={handleSaveAll}
            loading={isSubmitting}
            disabled={expenses.length === 0}
            fullWidth
          >
            {`Save ${expenses.length} Expense${expenses.length !== 1 ? 's' : ''}`}
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
  transcriptBox: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  transcriptLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  transcriptText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  expenseCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseMain: {
    flex: 1,
  },
  expenseName: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  nameInput: {
    fontSize: fontSize.base,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  expenseCategory: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  amountInput: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    borderBottomWidth: 1,
    paddingVertical: spacing.xs,
    textAlign: 'right',
    minWidth: 80,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  warningText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  categoryPicker: {
    marginTop: spacing.sm,
  },
  pickerLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryChipText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  expenseActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.base,
  },
  totalAmount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  // RTL styles for Arabic/Hebrew/Persian text
  expenseHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  expenseMainRTL: {
    alignItems: 'flex-end',
  },
  expenseLeftRTL: {
    alignItems: 'flex-start',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
