import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="px-3.5 pt-2.5 pb-1.5 shrink-0 bg-ts-bg-section border-b border-ts-border">
      <Input
        type="text"
        placeholder="搜索字段..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
