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
      aria-label={`Chiffre ${index + 1} du code de vérification`}
      autoComplete={index === 0 ? 'one-time-code' : 'off'}
      type="text"
      inputMode="numeric"
      maxLength={1}
      onChange={(e) => onChange?.(e, index)}
      onKeyDown={(e) => onKeyDown(e, index)}
      className="w-14 h-14 text-center font-bold text-brand-ink border border-border rounded-xl outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/15 transition caret-brand-violet"
    />
  );
};

export default OptCode;
