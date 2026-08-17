import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'secondary',
  size = 'sm',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}, ref) => {
  // Base strict Enterprise SaaS styles
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-1 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer';

  // Strict padding & typography: horizontal padding is 2x vertical padding
  const sizeClasses: Record<ButtonSize, string> = {
    xs: 'text-[11px] py-1 px-2.5 gap-1.5 leading-tight min-h-[28px]',
    sm: 'text-xs py-1.5 px-3.5 gap-1.5 leading-snug min-h-[32px]',
    md: 'text-xs py-2 px-4 gap-2 leading-normal min-h-[36px]',
    lg: 'text-sm py-2.5 px-5 gap-2.5 leading-normal min-h-[40px]'
  };

  // Enterprise Color Variants (no pure black/pure white conflicts, WCAG compliant)
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white shadow-xs font-semibold border border-transparent',
    secondary: 'bg-white hover:bg-zinc-50 active:bg-zinc-100 text-[#18181B] border border-[#D1D5DB] shadow-2xs font-medium',
    outline: 'bg-transparent hover:bg-zinc-100/80 active:bg-zinc-200/80 text-[#374151] border border-[#D1D5DB] font-medium',
    ghost: 'bg-transparent hover:bg-zinc-100 active:bg-zinc-200 text-[#374151] border border-transparent font-medium',
    danger: 'bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white shadow-xs font-semibold border border-transparent',
    success: 'bg-[#059669] hover:bg-[#047857] active:bg-[#065F46] text-white shadow-xs font-semibold border border-transparent'
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      ) : icon && iconPosition === 'left' ? (
        <span className="shrink-0 flex items-center">{icon}</span>
      ) : null}
      
      {children && <span>{children}</span>}

      {!isLoading && icon && iconPosition === 'right' && (
        <span className="shrink-0 flex items-center">{icon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';
