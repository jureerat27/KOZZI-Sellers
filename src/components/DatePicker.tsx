import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatDate } from '../utils/format';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'เลือกวันที่ (วัน-เดือน-ปี)',
  required = false,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const formattedDate = value ? formatDate(value) : '';

  const handleClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      if ('showPicker' in inputRef.current) {
        try {
          inputRef.current.showPicker();
        } catch {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex items-center justify-between cursor-pointer select-none overflow-hidden ${className}`}
    >
      <span className="font-bold text-xs truncate">
        {formattedDate || placeholder}
      </span>
      <Calendar className="w-4 h-4 shrink-0 opacity-70 ml-2 pointer-events-none" />
      <input
        ref={inputRef}
        type="date"
        required={required}
        disabled={disabled}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
    </div>
  );
};
