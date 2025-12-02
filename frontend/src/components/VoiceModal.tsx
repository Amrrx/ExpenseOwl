import { useState } from 'react';
import { Mic, Check, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import type { ParsedExpense } from '../hooks/useVoiceRecording';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string;
  expenses: ParsedExpense[];
  categories: string[];
  onConfirmAll: (expenses: ParsedExpense[]) => Promise<void>;
  onReRecord: () => void;
}

export function VoiceModal({
  isOpen,
  onClose,
  transcript,
  expenses: initialExpenses,
  categories,
  onConfirmAll,
  onReRecord,
}: VoiceModalProps) {
  const [expenses, setExpenses] = useState<ParsedExpense[]>(initialExpenses);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExpenseChange = (index: number, field: keyof ParsedExpense, value: string | number) => {
    setExpenses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveExpense = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmAll(expenses);
      onClose();
    } catch (error) {
      console.error('Failed to confirm expenses:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReRecord = () => {
    onClose();
    onReRecord();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Voice Expenses">
      <div className="space-y-4">
        {/* Transcript */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            You said:
          </div>
          <div className="text-sm text-gray-900 dark:text-white italic">
            "{transcript}"
          </div>
        </div>

        {/* Expense Cards */}
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No expenses detected in audio.
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {expenses.map((expense, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  expense.confidence < 0.7 || expense.ambiguous
                    ? 'border-warning-300 bg-warning-50 dark:border-warning-700 dark:bg-warning-900/20'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                {/* Low Confidence Warning */}
                {(expense.confidence < 0.7 || expense.ambiguous) && (
                  <div className="flex items-center gap-2 mb-3 text-warning-700 dark:text-warning-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Low confidence - please review</span>
                  </div>
                )}

                {/* Header with Name and Delete */}
                <div className="flex items-center gap-2 mb-3">
                  <Input
                    type="text"
                    value={expense.name}
                    onChange={(e) => handleExpenseChange(index, 'name', e.target.value)}
                    placeholder="Expense name"
                    className="flex-1"
                  />
                  <button
                    onClick={() => handleRemoveExpense(index)}
                    className="p-2 text-danger-600 hover:text-danger-700 dark:text-danger-400 dark:hover:text-danger-300"
                    title="Remove expense"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Amount"
                    type="number"
                    step="0.01"
                    value={expense.amount}
                    onChange={(e) => handleExpenseChange(index, 'amount', parseFloat(e.target.value) || 0)}
                  />

                  <Select
                    label="Category"
                    value={expense.category}
                    onChange={(e) => handleExpenseChange(index, 'category', e.target.value)}
                    options={categories.map(cat => ({ value: cat, label: cat }))}
                  />

                  <div className="sm:col-span-2">
                    <Input
                      label="Date"
                      type="date"
                      value={expense.date.split('T')[0]}
                      onChange={(e) => handleExpenseChange(index, 'date', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={handleReRecord}
            className="flex-1"
            disabled={isSubmitting}
          >
            <Mic className="w-4 h-4" />
            Re-record
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            className="flex-1"
            disabled={expenses.length === 0 || isSubmitting}
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? 'Confirming...' : `Confirm ${expenses.length > 0 ? `(${expenses.length})` : 'All'}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
