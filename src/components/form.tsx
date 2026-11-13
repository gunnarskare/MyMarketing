"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

const inputClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2.5 text-base outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/20 dark:border-white/20";

type FieldProps = {
  label: string;
  hint?: string;
  name: string;
};

export function Field({ label, hint, name, ...props }: FieldProps & ComponentProps<"input">) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input id={name} name={name} aria-describedby={hintId} className={inputClass} {...props} />
      {hint ? (
        <p id={hintId} className="text-sm opacity-70">
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
      <label htmlFor={name} className="text-sm font-medium">
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
        <p id={hintId} className="text-sm opacity-70">
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
  const style =
    variant === "primary"
      ? "bg-foreground text-background"
      : "border border-black/15 dark:border-white/20";
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`rounded-lg px-4 py-2.5 text-base font-medium transition-opacity disabled:opacity-50 ${style}`}
      {...props}
    >
      {children}
    </button>
  );
}
