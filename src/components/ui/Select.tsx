import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  labelExtra?: React.ReactNode;
  hint?: string;
  error?: string;
  options?: SelectOption[];
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  labelExtra,
  hint,
  error,
  options,
  children,
  required,
  id,
  className = '',
  disabled,
  ...props
}, ref) => {
  const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[#374151] tracking-wide"
          >
            {label}
            {required && <span className="text-[#DC2626] ml-1 font-bold">*</span>}
          </label>
          {labelExtra && (
            <div className="text-[11px] text-[#6B7280]">
              {labelExtra}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`
            w-full appearance-none text-xs text-[#111827] rounded-md transition-colors duration-150 pl-3 pr-8 py-2
            border ${error ? 'border-[#EF4444] bg-[#FEF2F2]/40 text-[#991B1B]' : disabled ? 'border-[#E4E4E7] bg-[#F4F4F5] text-[#9CA3AF] cursor-not-allowed' : 'border-[#D1D5DB] bg-white hover:border-[#9CA3AF]'}
            leading-relaxed cursor-pointer
            ${!disabled ? 'focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none' : 'focus:outline-none'}
            ${className}
          `}
          {...props}
        >
          {options
            ? options.map(opt => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {error ? (
        <p className="text-[11px] font-medium text-[#DC2626] flex items-center gap-1 mt-1 leading-tight">
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-[11px] text-[#6B7280] leading-tight">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
