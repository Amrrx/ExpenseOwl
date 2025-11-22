import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import type { Expense } from '../types';
import { format } from 'date-fns';

export function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setIsLoading(true);
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (err) {
      setError('Failed to load expenses');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const totalIncome = expenses
    .filter((e) => e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = Math.abs(
    expenses
      .filter((e) => e.amount < 0)
      .reduce((sum, e) => sum + e.amount, 0)
  );

  const balance = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ExpenseOwl</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.full_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Income</h3>
              <p className="mt-2 text-3xl font-bold text-green-600">
                ${totalIncome.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Expenses</h3>
              <p className="mt-2 text-3xl font-bold text-red-600">
                ${totalExpenses.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Balance</h3>
              <p className={`mt-2 text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${balance.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {isLoading && (
                <div className="px-6 py-12 text-center text-gray-500">
                  Loading...
                </div>
              )}

              {error && (
                <div className="px-6 py-12 text-center text-red-600">
                  {error}
                </div>
              )}

              {!isLoading && !error && expenses.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">
                  No expenses yet. Start tracking!
                </div>
              )}

              {!isLoading && !error && expenses.map((expense) => (
                <div key={expense.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{expense.name}</p>
                    <p className="text-sm text-gray-500">
                      {expense.category} • {format(new Date(expense.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${expense.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {expense.amount > 0 ? '+' : ''}{expense.currency.toUpperCase()} {Math.abs(expense.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
