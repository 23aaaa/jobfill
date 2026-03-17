import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-ts-primary text-ts-text-on-primary hover:bg-ts-primary-hover',
        outline: 'border border-ts-border-button bg-ts-bg-button text-ts-text hover:bg-ts-primary hover:text-ts-text-on-primary hover:border-ts-primary',
        ghost: 'hover:bg-ts-bg-elevated-hover text-ts-text',
        link: 'text-ts-primary underline-offset-4 hover:underline',
        header: 'bg-white/20 text-ts-text-on-primary border border-white/30 hover:bg-white/35',
        icon: 'bg-transparent border-none text-ts-text-on-primary opacity-80 hover:opacity-100',
      },
      size: {
        default: 'h-8 px-3 py-1',
        sm: 'h-7 rounded-md px-2.5 text-[13px]',
        lg: 'h-10 rounded-md px-6',
        icon: 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
