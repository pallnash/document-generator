import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const variantClasses = {
    default: 'bg-white border border-[#E4E4E7] shadow-xs text-[#111827]',
    subtle: 'bg-[#F9FAFB] border border-[#E4E4E7] text-[#111827]',
    bordered: 'bg-white border border-[#D1D5DB] shadow-2xs text-[#111827]'
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6'
  };

  return (
    <div
      className={`rounded-lg transition-all duration-150 ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className = ''
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 pb-3 border-b border-[#F4F4F5] mb-3.5 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <div className="text-[#2563EB] shrink-0">{icon}</div>}
        <div>
          <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-[#6B7280] mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
