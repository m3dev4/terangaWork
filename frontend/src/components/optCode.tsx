import React from 'react';
import { Input } from './ui/input';

interface OtpCodeProps {
  index: number;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
}

const OptCode = ({ index, inputRefs, onChange, onKeyDown }: OtpCodeProps) => {
  return (
    <Input
      ref={(el) => {
        inputRefs.current[index] = el;
      }}
      id={`otp-${index}`}
      type="text"
      inputMode="numeric"
      maxLength={1}
      onChange={(e) => onChange?.(e, index)}
      onKeyDown={(e) => onKeyDown(e, index)}
      className="w-14 h-14 text-center font-bold text-text-terangawork border border-black/10 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition caret-blue-500"
    />
  );
};

export default OptCode;
