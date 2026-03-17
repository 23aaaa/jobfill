import { cn } from '@/lib/utils';
import type { ResumeItem } from '@/data/resume-data';

interface ClickableValueProps {
  value: string;
  label?: string;
  onFill: (value: string) => void;
  hideContent?: boolean;
  className?: string;
  multiline?: boolean;
}

export function ClickableValue({
  value,
  label,
  onFill,
  hideContent,
  className,
  multiline,
}: ClickableValueProps) {
  if (!value) return null;

  if (hideContent) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'bg-ts-bg-button border border-ts-border-button',
          'px-2.5 py-1 rounded-md',
          'text-[13px] font-semibold text-ts-text',
          'cursor-pointer select-none',
          'hover:bg-ts-primary hover:text-ts-text-on-primary hover:border-ts-primary',
          'transition-colors duration-150',
          className,
        )}
        title={label || '点击填写'}
        onClick={(e) => {
          e.stopPropagation();
          onFill(value);
        }}
      >
        {label || '填写'}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'cursor-pointer rounded-sm px-0.5 -mx-0.5',
        'hover:bg-ts-primary-ring',
        'transition-colors duration-150',
        multiline && 'whitespace-pre-line block',
        className,
      )}
      title={value}
      onClick={(e) => {
        e.stopPropagation();
        onFill(value);
      }}
    >
      {value}
    </span>
  );
}

/* -- 卡片内的 label:value 字段 -- */

interface CardFieldProps {
  label: string;
  value: string;
  onFill: (value: string) => void;
  hideContent?: boolean;
  valueClassName?: string;
}

export function CardField({
  label,
  value,
  onFill,
  hideContent,
  valueClassName,
}: CardFieldProps) {
  if (!value) return null;

  if (hideContent) {
    return (
      <ClickableValue
        value={value}
        label={label}
        onFill={onFill}
        hideContent
      />
    );
  }

  return (
    <div className="flex items-start text-[13px] leading-relaxed">
      <span className="text-ts-text-hint shrink-0 mr-2 min-w-[4.5em] text-xs">
        {label}
      </span>
      <ClickableValue
        value={value}
        onFill={onFill}
        className={cn('text-ts-text font-medium', valueClassName)}
      />
    </div>
  );
}

/* -- 从 items 数组中按 label 查找 value -- */

export function findValue(items: ResumeItem[], label: string): string {
  return items.find((i) => i.label === label)?.value ?? '';
}
