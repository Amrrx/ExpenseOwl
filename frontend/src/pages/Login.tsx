import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button, Input } from '../components';
import { useFormValidation, validators } from '../hooks/useFormValidation';

interface LoginForm {
  email: string;
  password: string;
}

export function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { validateAll, handleBlur, getFieldError, clearErrors } = useFormValidation<LoginForm>({
    email: [
      validators.required('Email is required'),
      validators.email('Please enter a valid email'),
    ],
    password: [
      validators.required('Password is required'),
      validators.minLength(6, 'Password must be at least 6 characters'),
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const errors = validateAll({ email, password });
    if (Object.keys(errors).length > 0) return;

    try {
      await login({ email, password });
      clearErrors();
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <img
            src="/pwa/icon-192.png"
            alt="ExpenseOwl"
            className="w-16 h-16 mx-auto rounded-lg mb-4"
          />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            ExpenseOwl
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 dark:bg-danger-900/20 dark:border-danger-800 dark:text-danger-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('email', email, { email, password })}
            error={getFieldError('email')}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur('password', password, { email, password })}
            error={getFieldError('password')}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full"
          >
            <LogIn className="w-4 h-4" />
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="text-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Don't have an account? </span>
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
