import React from 'react';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = 'neutral',
  icon,
  className = '',
  ...props
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    neutral: 'bg-[#F4F4F5] text-[#374151] border-[#E4E4E7]',
    info: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
    success: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
    warning: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
    danger: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border tracking-wide whitespace-nowrap ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
