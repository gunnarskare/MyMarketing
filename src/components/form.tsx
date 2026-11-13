"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

const inputClass =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-base text-ink placeholder:text-ink-soft/70";

type FieldProps = {
  label: string;
  hint?: string;
  name: string;
};

export function Field({ label, hint, name, ...props }: FieldProps & ComponentProps<"input">) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
      </label>
      <input id={name} name={name} aria-describedby={hintId} className={inputClass} {...props} />
      {hint ? (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextArea({ label, hint, name, ...props }: FieldProps & ComponentProps<"textarea">) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        aria-describedby={hintId}
        className={inputClass}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type SubmitButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary";
  children: ReactNode;
};

export function SubmitButton({ variant = "primary", children, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const style = variant === "primary" ? "bg-ink text-paper" : "border border-ink text-ink";
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`rounded-full px-5 py-3 text-base font-semibold transition-opacity disabled:opacity-50 ${style}`}
      {...props}
    >
      {children}
    </button>
  );
}
