import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const labelText = props.required ? `${label} *` : label;

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{labelText}</span>
      <input
        id={inputId}
        className={`w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 ${className}`.trim()}
        {...props}
      />
    </label>
  );
}
