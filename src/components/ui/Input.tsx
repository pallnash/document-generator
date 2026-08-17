import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelExtra?: React.ReactNode;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  labelExtra,
  hint,
  error,
  leftIcon,
  rightIcon,
  required,
  id,
  className = '',
  disabled,
  readOnly,
  ...props
}, ref) => {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={inputId}
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

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          readOnly={readOnly}
          className={`
            w-full text-xs text-[#111827] rounded-md transition-colors duration-150
            border ${error ? 'border-[#EF4444] bg-[#FEF2F2]/40 text-[#991B1B]' : readOnly ? 'border-[#E4E4E7] bg-[#F9FAFB] text-[#4B5563] cursor-default' : disabled ? 'border-[#E4E4E7] bg-[#F4F4F5] text-[#9CA3AF] cursor-not-allowed' : 'border-[#D1D5DB] bg-white hover:border-[#9CA3AF]'}
            ${leftIcon ? 'pl-9' : 'pl-3'}
            ${rightIcon ? 'pr-9' : 'pr-3'}
            py-2 leading-relaxed placeholder:text-[#9CA3AF]
            ${!readOnly && !disabled ? 'focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none' : 'focus:outline-none'}
            ${className}
          `}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] flex items-center">
            {rightIcon}
          </div>
        )}
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

Input.displayName = 'Input';
