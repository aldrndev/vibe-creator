import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error message to display below textarea */
  error?: string;
  /** Label for the textarea field */
  label?: string;
}

/**
 * Textarea component with label and error support
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1.5 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
