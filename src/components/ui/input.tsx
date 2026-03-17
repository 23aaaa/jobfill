import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-ts-border-input bg-ts-bg px-3 py-1.5 text-sm text-ts-text',
          'placeholder:text-ts-text-hint',
          'outline-none transition-colors',
          'focus:border-ts-primary focus:ring-2 focus:ring-ts-primary-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
