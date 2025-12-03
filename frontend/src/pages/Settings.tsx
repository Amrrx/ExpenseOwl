import { useEffect, useState } from 'react';
import { Download, Upload, Trash2, Plus, Moon, Sun, Monitor, Edit2, X, Check, GripVertical } from 'lucide-react';
import { useDragReorder } from '../hooks/useDragReorder';
import { Layout, Button, Card, CardHeader, CardBody, CardTitle, Input, Select, Modal, TagInput, SettingsSkeleton } from '../components';
import { api } from '../services/api';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import type { RecurringExpense, AIConfig } from '../types';
import { useToastStore } from '../stores/toastStore';

const THEME_OPTIONS = [
  { value: 'system', label: 'System Default', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function Settings() {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [startDate, setStartDate] = useState(1);
  const [theme, setTheme] = useState('system');
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToastStore();
  const categoryDrag = useDragReorder<string>();

  // Recurring expenses state
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [recurringForm, setRecurringForm] = useState({
    name: '',
    amount: 0,
    category: '',
    tags: new Set<string>(),
    interval: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    occurrences: 1,
    startDate: new Date().toISOString().split('T')[0],
  });
  const [deleteRecurringId, setDeleteRecurringId] = useState<string | null>(null);
  const [deleteOption, setDeleteOption] = useState<'definition' | 'future' | 'all'>('definition');
  const [updateOption, setUpdateOption] = useState<'future' | 'all'>('future');
  const [availableTags] = useState(new Set<string>());

  // AI Voice config state
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    enabled: false,
    provider: 'gemini',
    apiKey: '',
    model: '',
    hasApiKey: false,
  });
  const [aiConfigLoading, setAIConfigLoading] = useState(false);
  const [aiTestLoading, setAITestLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadTheme();
    loadRecurringExpenses();
    loadAIConfig();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const config = await api.getConfig();
      setCategories(config.categories);
      setCurrency(config.currency);
      setStartDate(config.startDate);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecurringExpenses = async () => {
    try {
      const expenses = await api.getRecurringExpenses();
      setRecurringExpenses(expenses);
    } catch (error) {
      console.error('Failed to load recurring expenses:', error);
    }
  };

  const loadAIConfig = async () => {
    try {
      const config = await api.getAIConfig();
      setAIConfig({
        ...config,
        apiKey: '', // Never show actual key, use hasApiKey flag
      });
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  };

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  };

  const applyTheme = (newTheme: string) => {
    const root = document.documentElement;

    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    if (categories.includes(trimmed)) {
      toast.error('Category already exists');
      return;
    }

    const updated = [...categories, trimmed];
    setCategories(updated);
    setNewCategory('');
  };

  const handleDeleteCategory = (category: string) => {
    if (categories.length <= 1) {
      toast.error('Must have at least one category');
      return;
    }

    setCategories(categories.filter(c => c !== category));
  };

  const handleSaveCategories = async () => {
    try {
      await api.updateCategories(categories);
      toast.success('Categories saved successfully');
    } catch (error) {
      toast.error('Failed to save categories');
    }
  };

  const handleSaveCurrency = async () => {
    try {
      await api.updateCurrency(currency);
      toast.success('Currency saved successfully');
    } catch (error) {
      toast.error('Failed to save currency');
    }
  };

  const handleSaveStartDate = async () => {
    try {
      await api.updateStartDate(startDate);
      toast.success('Start date saved successfully');
    } catch (error) {
      toast.error('Failed to save start date');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/api/export/csv`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Expenses exported successfully');
    } catch (error) {
      toast.error('Failed to export expenses');
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/import/csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      const result = await response.json();
      toast.success(`Imported ${result.imported || 0} expenses`);

      // Clear the input
      e.target.value = '';
    } catch (error) {
      toast.error('Failed to import CSV');
    }
  };

  const handleImportOldCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/import/csvold`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      const result = await response.json();
      toast.success(`Imported ${result.imported || 0} expenses from old format`);

      // Clear the input
      e.target.value = '';
    } catch (error) {
      toast.error('Failed to import old format CSV');
    }
  };

  const handleSaveAIConfig = async () => {
    setAIConfigLoading(true);
    try {
      await api.updateAIConfig(aiConfig);
      await loadAIConfig();
      toast.success('AI configuration saved');
    } catch (error) {
      toast.error('Failed to save AI configuration');
    } finally {
      setAIConfigLoading(false);
    }
  };

  const handleTestAIConnection = async () => {
    setAITestLoading(true);
    try {
      const result = await api.testAIConnection();
      if (result.status === 'success') {
        toast.success(result.message || 'AI connection successful');
      } else {
        toast.error(result.message || 'AI connection failed');
      }
    } catch (error) {
      toast.error('Failed to test AI connection');
    } finally {
      setAITestLoading(false);
    }
  };

  const resetRecurringForm = () => {
    setRecurringForm({
      name: '',
      amount: 0,
      category: categories[0] || '',
      tags: new Set<string>(),
      interval: 'monthly',
      occurrences: 1,
      startDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleOpenRecurringModal = (recurring?: RecurringExpense) => {
    if (recurring) {
      setEditingRecurring(recurring);
      setRecurringForm({
        name: recurring.name,
        amount: recurring.amount,
        category: recurring.category,
        tags: new Set(recurring.tags),
        interval: recurring.interval,
        occurrences: recurring.occurrences,
        startDate: recurring.startDate.split('T')[0],
      });
    } else {
      setEditingRecurring(null);
      resetRecurringForm();
    }
    setShowRecurringModal(true);
  };

  const handleCloseRecurringModal = () => {
    setShowRecurringModal(false);
    setEditingRecurring(null);
    resetRecurringForm();
    setUpdateOption('future');
  };

  const handleSaveRecurring = async () => {
    if (!recurringForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (recurringForm.amount === 0) {
      toast.error('Amount cannot be zero');
      return;
    }

    if (!recurringForm.category) {
      toast.error('Category is required');
      return;
    }

    if (recurringForm.occurrences < 1) {
      toast.error('Occurrences must be at least 1');
      return;
    }

    try {
      const data = {
        ...recurringForm,
        tags: Array.from(recurringForm.tags),
        currency,
        startDate: new Date(recurringForm.startDate).toISOString(),
      };

      if (editingRecurring) {
        await api.updateRecurringExpense(editingRecurring.id, data, updateOption === 'all');
        toast.success(updateOption === 'all'
          ? 'Recurring expense and all occurrences updated'
          : 'Recurring expense and future occurrences updated');
      } else {
        await api.addRecurringExpense(data);
        toast.success('Recurring expense added');
      }

      await loadRecurringExpenses();
      handleCloseRecurringModal();
    } catch (error) {
      toast.error(editingRecurring ? 'Failed to update recurring expense' : 'Failed to add recurring expense');
    }
  };

  const handleDeleteRecurring = async () => {
    if (!deleteRecurringId) return;

    try {
      const removeAll = deleteOption === 'all';
      await api.deleteRecurringExpense(deleteRecurringId, removeAll);

      const messages = {
        definition: 'Recurring expense deleted (occurrences kept)',
        future: 'Recurring expense and future occurrences deleted',
        all: 'Recurring expense and all occurrences deleted',
      };
      toast.success(messages[deleteOption]);

      await loadRecurringExpenses();
      setDeleteRecurringId(null);
      setDeleteOption('definition');
    } catch (error) {
      toast.error('Failed to delete recurring expense');
    }
  };

  const formatInterval = (interval: string): string => {
    return interval.charAt(0).toUpperCase() + interval.slice(1);
  };

  return (
    <Layout>
      {isLoading ? (
        <SettingsSkeleton />
      ) : (
      <div className="space-y-6">
        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {THEME_OPTIONS.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      theme === option.value
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="w-8 h-8" />
                    <span className="font-medium text-sm">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="mb-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="New category name"
                  className="flex-1"
                />
                <Button variant="primary" onClick={handleAddCategory}>
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Drag to reorder categories
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
              {categories.map((category, index) => (
                <div
                  key={category}
                  draggable
                  onDragStart={categoryDrag.handleDragStart(index)}
                  onDragOver={categoryDrag.handleDragOver(index)}
                  onDragEnd={categoryDrag.handleDragEnd}
                  onDrop={categoryDrag.handleDrop(categories, setCategories)}
                  className={`flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-grab active:cursor-grabbing transition-all ${categoryDrag.getDragStyles(index)}`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{category}</span>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="text-danger-600 hover:text-danger-700 dark:text-danger-400 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button variant="primary" onClick={handleSaveCategories} className="w-full">
              Save Categories
            </Button>
          </CardBody>
        </Card>

        {/* Currency & Start Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Currency</CardTitle>
            </CardHeader>
            <CardBody>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={SUPPORTED_CURRENCIES.map(curr => ({
                  value: curr.code,
                  label: `${curr.code.toUpperCase()} (${curr.symbol})`
                }))}
                className="mb-4"
              />
              <Button variant="primary" onClick={handleSaveCurrency} className="w-full">
                Save Currency
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Cycle Start Date</CardTitle>
            </CardHeader>
            <CardBody>
              <Input
                type="number"
                min="1"
                max="31"
                value={startDate}
                onChange={(e) => setStartDate(parseInt(e.target.value) || 1)}
                className="mb-4"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Day of month when your billing cycle starts (1-31)
              </p>
              <Button variant="primary" onClick={handleSaveStartDate} className="w-full">
                Save Start Date
              </Button>
            </CardBody>
          </Card>
        </div>

        {/* Recurring Expenses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recurring Expenses</CardTitle>
              <Button variant="primary" onClick={() => handleOpenRecurringModal()}>
                <Plus className="w-4 h-4" />
                Add Recurring
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {recurringExpenses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No recurring expenses yet. Click "Add Recurring" to create one.
              </p>
            ) : (
              <div className="space-y-3">
                {recurringExpenses.map((recurring) => (
                  <div
                    key={recurring.id}
                    className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{recurring.name}</h4>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                          {recurring.category}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: recurring.currency.toUpperCase(),
                          }).format(Math.abs(recurring.amount))}
                        </span>
                        <span>•</span>
                        <span>{formatInterval(recurring.interval)}</span>
                        <span>•</span>
                        <span>{recurring.occurrences}x</span>
                        <span>•</span>
                        <span>Starts: {new Date(recurring.startDate).toLocaleDateString()}</span>
                      </div>
                      {recurring.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {recurring.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenRecurringModal(recurring)}
                        className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteRecurringId(recurring.id)}
                        className="p-2 text-gray-600 hover:text-danger-600 dark:text-gray-400 dark:hover:text-danger-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Import/Export */}
        <Card>
          <CardHeader>
            <CardTitle>Import & Export</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button variant="primary" onClick={handleExportCSV} className="w-full">
                <Download className="w-4 h-4" />
                Export to CSV
              </Button>

              <div className="w-full">
                <input
                  type="file"
                  id="csv-import"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
                <label htmlFor="csv-import" className="block">
                  <div className="inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 px-4 py-2 text-sm w-full cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Import from CSV
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Import from ExpenseOwl v3.x or earlier (converts expense signs)
              </p>
              <div className="w-full">
                <input
                  type="file"
                  id="csv-import-old"
                  accept=".csv"
                  onChange={handleImportOldCSV}
                  className="hidden"
                />
                <label htmlFor="csv-import-old" className="block">
                  <div className="inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-amber-100 text-amber-800 hover:bg-amber-200 focus:ring-amber-500 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 px-4 py-2 text-sm w-full cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Import from Old Format
                  </div>
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* AI Voice Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>AI Voice Input</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable AI Voice Input</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Use voice commands to add expenses</p>
                </div>
                <button
                  onClick={() => setAIConfig({ ...aiConfig, enabled: !aiConfig.enabled })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    aiConfig.enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      aiConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {aiConfig.enabled && (
                <>
                  <Select
                    label="AI Provider"
                    value={aiConfig.provider}
                    onChange={(e) => setAIConfig({ ...aiConfig, provider: e.target.value as AIConfig['provider'] })}
                    options={[
                      { value: 'gemini', label: 'Google Gemini' },
                      { value: 'anthropic', label: 'Anthropic Claude' },
                      { value: 'openai', label: 'OpenAI' },
                    ]}
                  />

                  <div>
                    <Input
                      label="API Key"
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(e) => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
                      placeholder={aiConfig.hasApiKey ? '••••••••••••••••' : 'Enter your API key'}
                    />
                    {aiConfig.hasApiKey && !aiConfig.apiKey && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        API key is already set. Enter a new key to replace it.
                      </p>
                    )}
                  </div>

                  <Input
                    label="Model (optional)"
                    type="text"
                    value={aiConfig.model}
                    onChange={(e) => setAIConfig({ ...aiConfig, model: e.target.value })}
                    placeholder={
                      aiConfig.provider === 'gemini' ? 'gemini-1.5-flash' :
                      aiConfig.provider === 'anthropic' ? 'claude-3-haiku-20240307' :
                      'gpt-4o-mini'
                    }
                  />

                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={handleSaveAIConfig}
                      disabled={aiConfigLoading}
                      className="flex-1"
                    >
                      {aiConfigLoading ? 'Saving...' : 'Save Configuration'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleTestAIConnection}
                      disabled={aiTestLoading}
                      className="flex-1"
                    >
                      {aiTestLoading ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
      )}

      {/* Recurring Expense Modal */}
      <Modal
        isOpen={showRecurringModal}
        onClose={handleCloseRecurringModal}
        title={editingRecurring ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            type="text"
            value={recurringForm.name}
            onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })}
            placeholder="e.g., Monthly Rent"
          />

          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={recurringForm.amount}
            onChange={(e) => setRecurringForm({ ...recurringForm, amount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />

          <Select
            label="Category"
            value={recurringForm.category}
            onChange={(e) => setRecurringForm({ ...recurringForm, category: e.target.value })}
            options={categories.map(cat => ({ value: cat, label: cat }))}
          />

          <TagInput
            label="Tags (optional)"
            selectedTags={recurringForm.tags}
            availableTags={availableTags}
            onAddTag={(tag: string) => {
              const newTags = new Set(recurringForm.tags);
              newTags.add(tag);
              setRecurringForm({ ...recurringForm, tags: newTags });
            }}
            onRemoveTag={(tag: string) => {
              const newTags = new Set(recurringForm.tags);
              newTags.delete(tag);
              setRecurringForm({ ...recurringForm, tags: newTags });
            }}
            placeholder="Add tags..."
          />

          <Select
            label="Interval"
            value={recurringForm.interval}
            onChange={(e) => setRecurringForm({ ...recurringForm, interval: e.target.value as any })}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
          />

          <Input
            label="Occurrences"
            type="number"
            min="1"
            value={recurringForm.occurrences}
            onChange={(e) => setRecurringForm({ ...recurringForm, occurrences: parseInt(e.target.value) || 1 })}
          />

          <Input
            label="Start Date"
            type="date"
            value={recurringForm.startDate}
            onChange={(e) => setRecurringForm({ ...recurringForm, startDate: e.target.value })}
          />

          {editingRecurring && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Update Scope
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="updateOption"
                    value="future"
                    checked={updateOption === 'future'}
                    onChange={() => setUpdateOption('future')}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Update future only</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Apply changes to future occurrences only</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="updateOption"
                    value="all"
                    checked={updateOption === 'all'}
                    onChange={() => setUpdateOption('all')}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Update all occurrences</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Apply changes to all past and future occurrences</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={handleCloseRecurringModal} className="flex-1">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRecurring} className="flex-1">
              <Check className="w-4 h-4" />
              {editingRecurring ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteRecurringId !== null}
        onClose={() => {
          setDeleteRecurringId(null);
          setDeleteOption('definition');
        }}
        title="Delete Recurring Expense"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose what to delete:
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="radio"
                name="deleteOption"
                value="definition"
                checked={deleteOption === 'definition'}
                onChange={() => setDeleteOption('definition')}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete definition only</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Keep all generated expenses, remove recurring schedule</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="radio"
                name="deleteOption"
                value="future"
                checked={deleteOption === 'future'}
                onChange={() => setDeleteOption('future')}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete future occurrences</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Keep past expenses, remove future ones and schedule</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-danger-200 dark:border-danger-800 cursor-pointer hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors">
              <input
                type="radio"
                name="deleteOption"
                value="all"
                checked={deleteOption === 'all'}
                onChange={() => setDeleteOption('all')}
                className="w-4 h-4 text-danger-600 focus:ring-danger-500"
              />
              <div>
                <span className="text-sm font-medium text-danger-600 dark:text-danger-400">Delete all occurrences</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Remove all past and future expenses plus the schedule</p>
              </div>
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteRecurringId(null);
                setDeleteOption('definition');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteRecurring}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
