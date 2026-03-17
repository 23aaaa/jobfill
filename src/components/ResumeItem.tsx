import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { truncate } from '@/utils/dom';

interface ResumeItemProps {
  label: string;
  value: string;
  onFill: (value: string) => void;
}

export function ResumeItem({ label, value, onFill }: ResumeItemProps) {
  const handleClick = useCallback(() => {
    onFill(value);
  }, [value, onFill]);

  return (
    <div className="flex items-center gap-2 mb-1">
      <Button
        variant="outline"
        size="sm"
        className="ts-fill-btn shrink-0 max-w-[130px] overflow-hidden text-ellipsis whitespace-nowrap text-left font-semibold"
        title={value}
        onClick={handleClick}
      >
        {label}
      </Button>
      <span className="ts-preview-text flex-1 text-xs text-ts-text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
        {truncate(value, 20)}
      </span>
    </div>
  );
}
