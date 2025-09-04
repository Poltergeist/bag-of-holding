import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options: { value: string; label: string; disabled?: boolean }[];
}

export function Select({ 
  label, 
  error, 
  helpText, 
  options,
  className = '', 
  id,
  ...props 
}: SelectProps) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const selectClasses = [
    'block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset',
    error 
      ? 'ring-red-300 focus:ring-2 focus:ring-inset focus:ring-red-600' 
      : 'ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600',
    'sm:text-sm sm:leading-6',
    className
  ].join(' ');

  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium leading-6 text-gray-900 mb-1">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={selectClasses}
        {...props}
      >
        {options.map(option => (
          <option 
            key={option.value} 
            value={option.value} 
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600" id={`${selectId}-error`}>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500" id={`${selectId}-help`}>
          {helpText}
        </p>
      )}
    </div>
  );
}