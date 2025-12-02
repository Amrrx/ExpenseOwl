import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`block w-full px-4 py-2.5 pr-10 border-2 rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-0 appearance-none ${
              error
                ? 'border-danger-500 focus:border-danger-500'
                : 'border-gray-200 dark:border-gray-700 focus:border-primary-500 dark:focus:border-primary-500'
            } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${className}`}
            {...props}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
