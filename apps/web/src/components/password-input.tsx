"use client";

import { useState, type InputHTMLAttributes } from "react";
import { cn, inputClass } from "@/components/ui";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Campo de password com o "olhinho" para mostrar ou esconder o que se escreveu. */
export function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative flex">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(inputClass, "pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Esconder password" : "Mostrar password"}
        aria-pressed={visible}
        title={visible ? "Esconder password" : "Mostrar password"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted hover:text-ink"
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}

function Eye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.2 4.1" />
      <path d="M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
