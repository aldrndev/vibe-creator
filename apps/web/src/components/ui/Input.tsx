import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error message to display below input */
  error?: string;
  /** Label for the input field */
  label?: string;
  /** Background color override */
  variant?: "default" | "filled";
  /** Left icon element */
  leftIcon?: React.ReactNode;
  /** Right icon element */
  rightIcon?: React.ReactNode;
}

/**
 * Premium Input component with icon and state support.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      error,
      label,
      id,
      variant = "default",
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-bold text-foreground/80 ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-200">
              {leftIcon}
            </div>
          )}

          <input
            type={type}
            id={inputId}
            className={cn(
              "flex h-14 w-full rounded-2xl border bg-background px-4 py-3 text-base transition-all duration-200",
              "border-border/50 shadow-sm",
              "placeholder:text-muted-foreground/50 placeholder:font-medium",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
              leftIcon && "pl-12",
              rightIcon && "pr-12",
              error &&
                "border-destructive focus-visible:ring-destructive/10 focus-visible:border-destructive",
              variant === "filled" &&
                "bg-muted/30 border-transparent focus:bg-background",
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-200">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className="ml-1 text-[13px] font-medium text-destructive animate-in fade-in slide-in-from-top-1"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
