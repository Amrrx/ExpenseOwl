import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { Plus, ChevronLeft, ChevronRight, Mic, Square, Loader2 } from 'lucide-react';
import { Layout, Button, Card, CardBody, Input, Select, TagInput, VoiceModal, ChartSkeleton, CardSkeleton } from '../components';
import { api } from '../services/api';
import type { Expense, Config } from '../types';
import { formatCurrency, COLOR_PALETTE } from '../utils/currency';
import { formatMonth, getMonthBounds, getISODateWithLocalTime } from '../utils/dates';
import { useVoiceRecording, type ParsedExpense } from '../hooks/useVoiceRecording';
import { useToastStore } from '../stores/toastStore';

ChartJS.register(ArcElement, Tooltip, Legend);
ChartJS.defaults.color = '#9ca3af';
ChartJS.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

interface CategoryData {
  category: string;
  total: number;
  percentage: number;
}

export function Dashboard() {
  const [currentCurrency, setCurrentCurrency] = useState('usd');
  const [startDate, setStartDate] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [allTags, setAllTags] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToastStore();

  // Voice recording
  const { state: voiceState, error: voiceError, startRecording, stopRecording } = useVoiceRecording();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceParsedExpenses, setVoiceParsedExpenses] = useState<ParsedExpense[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reportGain: false,
  });

  useEffect(() => {
    initialize();
  }, []);

  const assignCategoryColors = (categoriesList: string[]) => {
    const colors: Record<string, string> = { ...categoryColors };
    categoriesList.forEach((category, index) => {
      if (!colors[category]) {
        colors[category] = COLOR_PALETTE[index % COLOR_PALETTE.length];
      }
    });
    setCategoryColors(colors);
  };

  const getMonthExpenses = (expenses: Expense[]): Expense[] => {
    const { start, end } = getMonthBounds(currentDate, startDate);
    return expenses.filter((e) => {
      const expenseDate = new Date(e.date);
      return expenseDate >= start && expenseDate < end;
    });
  };

  const calculateCategoryBreakdown = (expenses: Expense[]): CategoryData[] => {
    const categoryTotals: Record<string, number> = {};
    let totalAmount = 0;

    expenses.forEach(exp => {
      if (exp.amount < 0 && !disabledCategories.has(exp.category)) {
        const amount = Math.abs(exp.amount);
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amount;
        totalAmount += amount;
      }
    });

    return Object.entries(categoryTotals)
      .map(([category, total]) => ({
        category,
        total,
        percentage: totalAmount > 0 ? (total / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
  };

  const calculateIncome = (expenses: Expense[]): number => {
    return expenses
      .filter(exp => exp.amount > 0)
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const calculateExpenses = (expenses: Expense[]): number => {
    return expenses
      .filter(exp => exp.amount < 0)
      .reduce((sum, exp) => sum + Math.abs(exp.amount), 0);
  };

  const toggleCategory = (category: string) => {
    setDisabledCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const initialize = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const config: Config = await api.getConfig();
      setCategories(config.categories);
      setCurrentCurrency(config.currency);
      setStartDate(config.startDate);
      setFormData(prev => ({ ...prev, category: config.categories[0] || '' }));

      const data = await api.getExpenses();
      const expenses = Array.isArray(data) ? data : [];
      setAllExpenses(expenses);

      const tags = new Set<string>();
      expenses.forEach(exp => {
        if (exp.tags && Array.isArray(exp.tags)) {
          exp.tags.forEach(tag => tags.add(tag));
        }
      });
      setAllTags(tags);

      const uniqueCategories = [...new Set(expenses.map(exp => exp.category))];
      assignCategoryColors(uniqueCategories);
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleAddTag = (tag: string) => {
    setSelectedTags(prev => new Set([...prev, tag]));
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      newSet.delete(tag);
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const isGain = formData.reportGain;
      let amount = parseFloat(formData.amount);
      if (!isGain) {
        amount *= -1;
      }

      const expenseData = {
        name: formData.name,
        category: formData.category,
        amount: amount,
        currency: currentCurrency,
        date: getISODateWithLocalTime(formData.date),
        tags: Array.from(selectedTags)
      };

      await api.addExpense(expenseData);

      toast.success('Expense added successfully!');

      setFormData({
        name: '',
        category: categories[0] || '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reportGain: false,
      });
      setSelectedTags(new Set());

      await initialize(false);
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    }
  };

  const handleVoiceButtonClick = async () => {
    if (voiceState === 'idle') {
      await startRecording();
    } else if (voiceState === 'recording') {
      try {
        const result = await stopRecording();
        setVoiceTranscript(result.transcript);
        setVoiceParsedExpenses(result.expenses);
        setShowVoiceModal(true);
      } catch (err) {
        console.error('Voice recording error:', err);
        toast.error(voiceError || 'Failed to process voice recording');
      }
    }
  };

  const handleVoiceReRecord = async () => {
    setShowVoiceModal(false);
    setVoiceTranscript('');
    setVoiceParsedExpenses([]);
    await startRecording();
  };

  const handleConfirmVoiceExpenses = async (expenses: ParsedExpense[]) => {
    let successCount = 0;
    let failCount = 0;

    for (const expense of expenses) {
      try {
        await api.addExpense({
          name: expense.name,
          amount: expense.amount,
          category: expense.category,
          currency: currentCurrency,
          date: getISODateWithLocalTime(expense.date),
          tags: []
        });
        successCount++;
      } catch (error) {
        console.error('Error adding expense:', error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully added ${successCount} expense${successCount > 1 ? 's' : ''}!`);
      await initialize(false);
    }

    if (failCount > 0) {
      toast.error(`Failed to add ${failCount} expense${failCount > 1 ? 's' : ''}`);
    }

    setShowVoiceModal(false);
    setVoiceTranscript('');
    setVoiceParsedExpenses([]);
  };

  const monthExpenses = getMonthExpenses(allExpenses);
  const hasExpenses = monthExpenses.some(e => e.amount < 0);
  const categoryData = calculateCategoryBreakdown(monthExpenses);
  const income = calculateIncome(monthExpenses);
  const expenseTotal = calculateExpenses(monthExpenses);
  const balance = income - expenseTotal;

  const currentMonthCategories = [...new Set(monthExpenses
    .filter(exp => exp.amount < 0)
    .map(exp => exp.category))];

  const categoryMap = new Map(categoryData.map(cat => [cat.category, cat]));

  const sortedCategories = currentMonthCategories.sort((a, b) => {
    const dataA = categoryMap.get(a);
    const dataB = categoryMap.get(b);
    if (dataA && dataB) return dataB.total - dataA.total;
    if (dataA) return -1;
    if (dataB) return 1;
    return a.localeCompare(b);
  });

  const activeTotalExpenses = monthExpenses
    .filter(exp => exp.amount < 0 && !disabledCategories.has(exp.category))
    .reduce((sum, exp) => sum + Math.abs(exp.amount), 0);

  const chartData = {
    labels: categoryData.map(c => c.category),
    datasets: [{
      data: categoryData.map(c => c.total),
      backgroundColor: categoryData.map(c => categoryColors[c.category]),
      borderColor: '#1a1a1a',
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'pie'>) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((sum: number, val) => sum + (val as number), 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${formatCurrency(value, currentCurrency)} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <Layout>
      {/* Month Navigation */}
      <Card className="mb-6">
        <CardBody className="!py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatMonth(currentDate)}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Add Expense & Voice Buttons */}
      <div className="flex gap-3 mb-4">
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => setShowExpenseForm(!showExpenseForm)}
        >
          <Plus className="w-5 h-5" />
          {showExpenseForm ? 'Close Form' : 'Add Expense'}
        </Button>

        <Button
          variant={voiceState === 'recording' ? 'danger' : 'secondary'}
          onClick={handleVoiceButtonClick}
          disabled={voiceState === 'processing'}
          title={
            voiceState === 'idle'
              ? 'Add expense by voice'
              : voiceState === 'recording'
              ? 'Stop recording'
              : 'Processing...'
          }
          className={`${voiceState === 'recording' ? 'animate-pulse' : ''}`}
        >
          {voiceState === 'idle' && <Mic className="w-5 h-5" />}
          {voiceState === 'recording' && <Square className="w-5 h-5" />}
          {voiceState === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
        </Button>
      </div>

      {/* Voice Status Message */}
      {voiceState === 'recording' && (
        <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-center">
          <p className="text-sm text-danger-800 dark:text-danger-300 font-medium">
            Recording... (tap to stop)
          </p>
        </div>
      )}

      {voiceState === 'processing' && (
        <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg text-center">
          <p className="text-sm text-primary-800 dark:text-primary-300 font-medium">
            Processing audio...
          </p>
        </div>
      )}

      {/* Expense Form */}
      {showExpenseForm && (
        <Card className="mb-6 animate-slide-up">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                options={categories.map(cat => ({ value: cat, label: cat }))}
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reportGain"
                  checked={formData.reportGain}
                  onChange={(e) => setFormData({ ...formData, reportGain: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="reportGain" className="text-sm text-gray-700 dark:text-gray-300">
                  Report Gain (Income)
                </label>
              </div>

              <Button type="submit" variant="primary" className="w-full">
                Add Expense
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <>
          <ChartSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </>
      )}

      {/* No Data */}
      {!isLoading && !hasExpenses && (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No expenses recorded this month.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Chart & Legend */}
      {!isLoading && hasExpenses && (
        <>
          <Card className="mb-6">
            <CardBody>
              <div className="h-[280px] flex items-center justify-center mb-6">
                <Pie data={chartData} options={chartOptions} />
              </div>

              <div className="space-y-2">
                {sortedCategories.map(category => {
                  const color = categoryColors[category];
                  const categoryDataItem = categoryMap.get(category);
                  const percentage = categoryDataItem ? categoryDataItem.percentage.toFixed(1) : '0.0';
                  const amount = categoryDataItem ? categoryDataItem.total : 0;
                  const isDisabled = disabledCategories.has(category);

                  return (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isDisabled
                          ? 'opacity-40 bg-gray-100 dark:bg-gray-800'
                          : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-baseline">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {category} ({percentage}%)
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                            {formatCurrency(amount, currentCurrency)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(activeTotalExpenses, currentCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Cashflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-success-500">
              <CardBody>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Income
                </div>
                <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {formatCurrency(income, currentCurrency)}
                </div>
              </CardBody>
            </Card>

            <Card className="border-l-4 border-danger-500">
              <CardBody>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Expenses
                </div>
                <div className="text-2xl font-bold text-danger-600 dark:text-danger-400">
                  {formatCurrency(expenseTotal, currentCurrency)}
                </div>
              </CardBody>
            </Card>

            <Card className="border-l-4 border-primary-500">
              <CardBody>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Balance
                </div>
                <div className={`text-2xl font-bold ${
                  balance >= 0
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-danger-600 dark:text-danger-400'
                }`}>
                  {formatCurrency(balance, currentCurrency)}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* Voice Modal */}
      <VoiceModal
        isOpen={showVoiceModal}
        onClose={() => {
          setShowVoiceModal(false);
          setVoiceTranscript('');
          setVoiceParsedExpenses([]);
        }}
        transcript={voiceTranscript}
        expenses={voiceParsedExpenses}
        categories={categories}
        onConfirmAll={handleConfirmVoiceExpenses}
        onReRecord={handleVoiceReRecord}
      />

      {/* FAB for mobile */}
      <button
        onClick={() => setShowExpenseForm(!showExpenseForm)}
        className={`fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 z-40 md:hidden ${
          showExpenseForm ? 'rotate-45' : ''
        }`}
        aria-label="Add expense"
      >
        <Plus className="w-6 h-6" />
      </button>
    </Layout>
  );
}
