import { useEffect, useState } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
}

/** 입력 중에는 문자열로 들고 있다가, 숫자가 되면 바로 반영하는 입력칸 */
export default function NumField({ value, onChange, min = 0, max, step = 1, placeholder }: Props) {
  const [text, setText] = useState(value ? String(value) : '');
  useEffect(() => {
    const parsed = Number(text.replace(/,/g, ''));
    if (parsed !== value) setText(value ? String(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      value={text}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isFinite(n)) {
          const clamped = Math.max(min, max !== undefined ? Math.min(max, n) : n);
          onChange(clamped);
        } else if (e.target.value === '') {
          onChange(0);
        }
      }}
    />
  );
}
