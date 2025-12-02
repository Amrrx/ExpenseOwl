import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`block w-full px-4 py-2.5 border-2 rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-0 ${
            error
              ? 'border-danger-500 focus:border-danger-500'
              : 'border-gray-200 dark:border-gray-700 focus:border-primary-500 dark:focus:border-primary-500'
          } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
