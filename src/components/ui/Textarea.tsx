import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelExtra?: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  labelExtra,
  hint,
  error,
  required,
  id,
  className = '',
  disabled,
  readOnly,
  rows = 4,
  ...props
}, ref) => {
  const textareaId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={textareaId}
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

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        readOnly={readOnly}
        className={`
          w-full text-xs text-[#111827] rounded-md transition-colors duration-150 p-3
          border ${error ? 'border-[#EF4444] bg-[#FEF2F2]/40 text-[#991B1B]' : readOnly ? 'border-[#E4E4E7] bg-[#F9FAFB] text-[#4B5563] cursor-default' : disabled ? 'border-[#E4E4E7] bg-[#F4F4F5] text-[#9CA3AF] cursor-not-allowed' : 'border-[#D1D5DB] bg-white hover:border-[#9CA3AF]'}
          leading-relaxed placeholder:text-[#9CA3AF] font-sans
          ${!readOnly && !disabled ? 'focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none' : 'focus:outline-none'}
          ${className}
        `}
        {...props}
      />

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

Textarea.displayName = 'Textarea';
