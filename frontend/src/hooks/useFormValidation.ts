import { useState, useCallback } from 'react';

export type ValidationRule<T> = {
  validate: (value: T[keyof T], allValues: T) => boolean;
  message: string;
};

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T>[];
};

export type ValidationErrors<T> = {
  [K in keyof T]?: string;
};

export function useFormValidation<T extends object>(
  rules: ValidationRules<T>
) {
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [touched, setTouched] = useState<Set<keyof T>>(new Set());

  const validateField = useCallback(
    (field: keyof T, value: T[keyof T], allValues: T): string | undefined => {
      const fieldRules = rules[field];
      if (!fieldRules) return undefined;

      for (const rule of fieldRules) {
        if (!rule.validate(value, allValues)) {
          return rule.message;
        }
      }
      return undefined;
    },
    [rules]
  );

  const validateAll = useCallback(
    (values: T): ValidationErrors<T> => {
      const newErrors: ValidationErrors<T> = {};
      let hasErrors = false;

      for (const field of Object.keys(rules) as (keyof T)[]) {
        const error = validateField(field, values[field], values);
        if (error) {
          newErrors[field] = error;
          hasErrors = true;
        }
      }

      setErrors(newErrors);
      setTouched(new Set(Object.keys(rules) as (keyof T)[]));
      return hasErrors ? newErrors : {};
    },
    [rules, validateField]
  );

  const setFieldError = useCallback((field: keyof T, error: string | undefined) => {
    setErrors((prev) => {
      if (error) {
        return { ...prev, [field]: error };
      }
      const { [field]: _, ...rest } = prev;
      return rest as ValidationErrors<T>;
    });
  }, []);

  const handleBlur = useCallback(
    (field: keyof T, value: T[keyof T], allValues: T) => {
      setTouched((prev) => new Set([...prev, field]));
      const error = validateField(field, value, allValues);
      setFieldError(field, error);
    },
    [validateField, setFieldError]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched(new Set());
  }, []);

  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      return touched.has(field) ? errors[field] : undefined;
    },
    [errors, touched]
  );

  const isValid = Object.keys(errors).length === 0;

  return {
    errors,
    touched,
    validateAll,
    validateField,
    setFieldError,
    handleBlur,
    clearErrors,
    getFieldError,
    isValid,
  };
}

export const validators = {
  required: (message = 'This field is required') => ({
    validate: (value: unknown) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'number') return !isNaN(value);
      return true;
    },
    message,
  }),

  min: (min: number, message?: string) => ({
    validate: (value: unknown) => {
      if (typeof value === 'number') return value >= min;
      if (typeof value === 'string') return parseFloat(value) >= min;
      return true;
    },
    message: message || `Must be at least ${min}`,
  }),

  max: (max: number, message?: string) => ({
    validate: (value: unknown) => {
      if (typeof value === 'number') return value <= max;
      if (typeof value === 'string') return parseFloat(value) <= max;
      return true;
    },
    message: message || `Must be at most ${max}`,
  }),

  email: (message = 'Invalid email address') => ({
    validate: (value: unknown) => {
      if (typeof value !== 'string') return false;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    message,
  }),

  minLength: (min: number, message?: string) => ({
    validate: (value: unknown) => {
      if (typeof value !== 'string') return false;
      return value.length >= min;
    },
    message: message || `Must be at least ${min} characters`,
  }),

  positive: (message = 'Must be a positive number') => ({
    validate: (value: unknown) => {
      if (typeof value === 'number') return value > 0;
      if (typeof value === 'string') return parseFloat(value) > 0;
      return true;
    },
    message,
  }),
};
