import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { toEUDate, fromEUDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value: string | null | undefined;
  onChange: (iso: string) => void;
  className?: string;
  disabled?: boolean;
}

export function DateInput({ value, onChange, className, disabled }: DateInputProps) {
  const [display, setDisplay] = useState(() => toEUDate(value || ""));

  useEffect(() => {
    setDisplay(toEUDate(value || ""));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);
    const iso = fromEUDate(raw);
    if (iso) onChange(iso);
  };

  const handleBlur = () => {
    const iso = fromEUDate(display);
    if (iso) {
      setDisplay(toEUDate(iso));
    }
  };

  return (
    <Input
      type="text"
      placeholder="dd/mm/yyyy"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={cn("font-mono", className)}
    />
  );
}
