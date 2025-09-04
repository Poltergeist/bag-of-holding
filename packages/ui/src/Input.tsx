import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function Input({ 
  label, 
  error, 
  helpText, 
  className = '', 
  id,
  ...props 
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const inputClasses = [
    'block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset',
    error 
      ? 'ring-red-300 placeholder:text-red-400 focus:ring-2 focus:ring-inset focus:ring-red-600' 
      : 'ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600',
    'sm:text-sm sm:leading-6',
    className
  ].join(' ');

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium leading-6 text-gray-900 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600" id={`${inputId}-error`}>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500" id={`${inputId}-help`}>
          {helpText}
        </p>
      )}
    </div>
  );
}