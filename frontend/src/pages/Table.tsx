import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { Layout, Button, Card, CardBody, Input, Select, TagInput, ConfirmModal } from '../components';
import { api } from '../services/api';
import type { Expense, Config } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatMonth, getMonthBounds, getISODateWithLocalTime, formatDateFromUTC } from '../utils/dates';

export function Table() {
  const [currentCurrency, setCurrentCurrency] = useState('usd');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [expensesForTable, setExpensesForTable] = useState<Expense[]>([]);
  const [startDate, setStartDate] = useState(1);
  const [allTags, setAllTags] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reportGain: false,
  });
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    updateTable();
  }, [allExpenses, currentDate, showAll, startDate]);

  const initialize = async () => {
    try {
      const config: Config = await api.getConfig();
      setCategories(config.categories);
      setCurrentCurrency(config.currency);
      setStartDate(config.startDate);
      setFormData(prev => ({ ...prev, category: config.categories[0] || '' }));

      const expenses: Expense[] = await api.getExpenses();
      setAllExpenses(expenses);

      const tags = new Set<string>();
      expenses.forEach((exp) => {
        if (exp.tags) {
          exp.tags.forEach((tag) => tags.add(tag));
        }
      });
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to initialize table:', error);
    }
  };

  const updateTable = () => {
    if (showAll) {
      const sorted = [...allExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpensesForTable(sorted);
    } else {
      const { start, end } = getMonthBounds(currentDate, startDate);
      const filtered = allExpenses.filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate < end;
      });
      setExpensesForTable(filtered);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const handleAddTag = (tag: string) => {
    setSelectedTags((prev) => new Set([...prev, tag]));
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags((prev) => {
      const newSet = new Set(prev);
      newSet.delete(tag);
      return newSet;
    });
  };

  const editExpense = (expense: Expense) => {
    const isGain = expense.amount > 0;
    setFormData({
      name: expense.name,
      category: expense.category,
      amount: Math.abs(expense.amount).toString(),
      reportGain: isGain,
      date: new Date(expense.date).toISOString().split('T')[0],
    });
    setSelectedTags(new Set(expense.tags || []));
    setEditId(expense.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    if (e.shiftKey) {
      confirmDelete(id);
    } else {
      setExpenseToDelete(id);
      setDeleteModalOpen(true);
    }
  };

  const confirmDelete = async (idToDelete?: string) => {
    const id = idToDelete || expenseToDelete;
    if (!id) return;
    try {
      await api.deleteExpense(id);
      await initialize();
      setDeleteModalOpen(false);
      setExpenseToDelete(null);
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let amount = parseFloat(formData.amount);
    if (!formData.reportGain) {
      amount *= -1;
    }

    const expenseData = {
      name: formData.name,
      category: formData.category,
      amount: amount,
      currency: currentCurrency,
      date: getISODateWithLocalTime(formData.date),
      tags: Array.from(selectedTags),
    };

    try {
      if (editId) {
        await api.updateExpense(editId, expenseData);
        setFormMessage({ type: 'success', text: 'Expense updated successfully!' });
      } else {
        await api.addExpense(expenseData);
        setFormMessage({ type: 'success', text: 'Expense added successfully!' });
      }

      setFormData({
        name: '',
        category: categories[0] || '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reportGain: false,
      });
      setSelectedTags(new Set());
      setEditId(null);

      await initialize();

      setTimeout(() => {
        setFormMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving expense:', error);
      setFormMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save expense' });
      setTimeout(() => {
        setFormMessage(null);
      }, 3000);
    }
  };

  const hasTags = expensesForTable.some((exp) => exp.tags && exp.tags.length > 0);

  return (
    <Layout>
      {/* Month Navigation */}
      {!showAll && (
        <Card className="mb-6">
          <CardBody className="!py-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatMonth(currentDate)}
              </h2>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Show All Toggle */}
      <div className="flex justify-center mb-6">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Show All Transactions
          </span>
        </label>
      </div>

      {/* Form */}
      <Card className="mb-6">
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editId ? 'Edit Expense' : 'Add Expense'}
          </h3>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Expense name"
            />

            <Select
              label="Category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={categories.map((cat) => ({ value: cat, label: cat }))}
            />

            <TagInput
              label="Tags"
              selectedTags={selectedTags}
              availableTags={allTags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
            />

            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />

            <Input
              label="Date"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.reportGain}
                  onChange={(e) => setFormData({ ...formData, reportGain: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Report Gain
                </span>
              </label>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <Button type="submit" variant="primary" className="w-full">
                {editId ? 'Update Expense' : 'Add Expense'}
              </Button>
            </div>
          </form>

          {formMessage && (
            <div className={`mt-4 p-3 rounded-lg ${
              formMessage.type === 'success'
                ? 'bg-success-50 text-success-800 border border-success-200 dark:bg-success-900/20 dark:text-success-300 dark:border-success-800'
                : 'bg-danger-50 text-danger-800 border border-danger-200 dark:bg-danger-900/20 dark:text-danger-300 dark:border-danger-800'
            }`}>
              {formMessage.text}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Table */}
      {expensesForTable.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {showAll ? 'No transactions found' : 'No expenses recorded for this month'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  {hasTags && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tags
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {expensesForTable.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {expense.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {expense.category}
                    </td>
                    {hasTags && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {(expense.tags || []).join(', ')}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={expense.amount < 0 ? 'text-danger-600 dark:text-danger-400' : 'text-success-600 dark:text-success-400'}>
                        {formatCurrency(expense.amount, currentCurrency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDateFromUTC(expense.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editExpense(expense)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteClick(e, expense.id)}
                          className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => confirmDelete()}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </Layout>
  );
}
